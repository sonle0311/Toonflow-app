<template>
  <section class="oauthSection" :aria-label="translate('Pi 登录供应商')">
    <header class="oauthHeader">
      <div class="oauthHeading">
        <el-text tag="strong">{{ translate("Pi 登录供应商") }}</el-text>
        <el-text size="small" type="info">{{ translate("使用订阅账号登录，无需填写 API Key") }}</el-text>
      </div>
      <el-button text size="small" :icon="IconRefresh" :loading="loading" @click="load">{{ translate("刷新") }}</el-button>
    </header>
    <div v-if="providers.length" class="oauthList">
      <div v-for="item in providers" :key="item.id" class="oauthItem">
        <div class="oauthInfo">
          <span class="oauthName">{{ item.name }}</span>
          <el-tag v-if="item.isSubscription" size="small" type="success" effect="plain">{{ translate("订阅") }}</el-tag>
          <el-tag v-if="item.loggedIn" size="small" type="info" effect="plain">{{ translate("已登录") }}</el-tag>
          <el-text size="small" type="info">{{ translate("{0} 个模型", { 0: item.models.length }) }}</el-text>
        </div>
        <el-button size="small" :type="item.loggedIn ? undefined : 'primary'" :loading="pendingId === item.id" @click="item.loggedIn ? logout(item) : login(item)">
          {{ item.loggedIn ? translate("退出登录") : translate("登录") }}
        </el-button>
      </div>
    </div>
    <el-text v-else-if="!loading" size="small" type="info">{{ translate("当前 pi 版本没有可登录的供应商") }}</el-text>

    <el-dialog v-model="dialogVisible" :title="translate('登录 {0}', { 0: active?.name ?? '' })" width="min(520px, 92vw)" alignCenter appendToBody :closeOnClickModal="false" @closed="stopPolling">
      <div class="oauthDialog">
        <el-alert v-if="session?.state === 'error'" :title="session.error || translate('登录失败')" type="error" :closable="false" showIcon />
        <template v-else>
          <el-text size="small">{{ translate("1. 在浏览器中打开登录页面并完成授权") }}</el-text>
          <el-button type="primary" tag="a" :href="session?.url || undefined" target="_blank" rel="noopener noreferrer" :disabled="!session?.url">{{ translate("打开登录页面") }}</el-button>
          <template v-if="session?.userCode">
            <el-text size="small">{{ translate("2. 在登录页面输入一次性代码") }}</el-text>
            <el-text class="oauthCode" tag="strong">{{ session.userCode }}</el-text>
          </template>
          <el-text size="small" type="info">{{ translate("若浏览器无法回调本机，可粘贴授权码或回调地址：") }}</el-text>
          <div class="oauthCodeRow">
            <el-input v-model="manualCode" :placeholder="translate('授权码或回调地址')" clearable @keyup.enter="submitCode" />
            <el-button :disabled="!manualCode.trim()" @click="submitCode">{{ translate("提交") }}</el-button>
          </div>
          <el-text v-if="session?.state === 'waiting'" size="small" type="info">{{ translate("等待授权完成…") }}</el-text>
          <el-text v-else-if="session?.state === 'done'" size="small" type="success">{{ translate("登录成功，正在同步模型…") }}</el-text>
        </template>
      </div>
    </el-dialog>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import axios from "axios";
import { ElMessage, ElMessageBox } from "element-plus";
import { IconRefresh } from "@tabler/icons-vue";
import { translate } from "@toonflow/i18n/vue";
import { customProviders, saveSettings, type CustomProvider } from "@/stores/settings";

type OAuthProvider = {
  id: string;
  name: string;
  isSubscription: boolean;
  loggedIn: boolean;
  models: { id: string; label: string; contextWindow: number; maxOutputTokens: number; reasoning: boolean }[];
};

type OAuthSession = { id: string; providerId: string; state: "waiting" | "done" | "error"; url?: string; userCode?: string; verificationUri?: string; error?: string };

const providers = ref<OAuthProvider[]>([]);
const loading = ref(false);
const pendingId = ref("");
const active = ref<OAuthProvider>();
const session = ref<OAuthSession>();
const manualCode = ref("");
const dialogVisible = ref(false);
let polling: ReturnType<typeof setInterval> | undefined;

function errorText(error: unknown, fallback: string) {
  return axios.isAxiosError(error) ? String(error.response?.data?.message ?? error.message) : fallback;
}

async function load() {
  loading.value = true;
  try {
    const { data } = await axios.get<{ code: number; data: OAuthProvider[] }>("/api/providers/oauth/list");
    providers.value = data.data;
  } catch (error) {
    ElMessage.error(errorText(error, translate("读取登录供应商失败")));
  } finally {
    loading.value = false;
  }
}

function stopPolling() {
  if (polling) clearInterval(polling);
  polling = undefined;
}

async function finish(provider: OAuthProvider) {
  stopPolling();
  const existing = customProviders.value.some(item => item.id === provider.id);
  if (!existing) {
    await saveSettings(settings => {
      const current = Array.isArray(settings.customProviders) ? [...settings.customProviders as CustomProvider[]] : [];
      if (current.some(item => item.id === provider.id)) return settings;
      current.push({
        id: provider.id,
        label: provider.name,
        apiUrl: "http://127.0.0.1/oauth",
        apiKey: "",
        protocol: "openai-responses",
        oauthProviderId: provider.id,
        models: provider.models.map(model => ({ id: model.id, label: model.label, contextWindow: model.contextWindow, maxOutputTokens: model.maxOutputTokens })),
      } as CustomProvider);
      return { ...settings, customProviders: current };
    });
  }
  await load();
  ElMessage.success(translate("登录成功"));
  dialogVisible.value = false;
}

function startPolling(provider: OAuthProvider) {
  stopPolling();
  polling = setInterval(async () => {
    if (!session.value) return;
    try {
      const { data } = await axios.get<{ code: number; data: OAuthSession | null }>("/api/providers/oauth/status", { params: { id: session.value.id } });
      if (!data.data) return;
      session.value = data.data;
      if (data.data.state === "done") await finish(provider);
      else if (data.data.state === "error") stopPolling();
    } catch {
      // 轮询失败时保留上一次状态，等待用户重试或关闭对话框。
    }
  }, 1500);
}

async function login(provider: OAuthProvider) {
  if (pendingId.value) return;
  pendingId.value = provider.id;
  active.value = provider;
  manualCode.value = "";
  try {
    const { data } = await axios.post<{ code: number; data: OAuthSession }>("/api/providers/oauth/login", { providerId: provider.id, method: "browser" });
    session.value = data.data;
    dialogVisible.value = true;
    startPolling(provider);
  } catch (error) {
    ElMessage.error(errorText(error, translate("启动登录失败")));
  } finally {
    pendingId.value = "";
  }
}

async function submitCode() {
  const code = manualCode.value.trim();
  if (!code || !session.value) return;
  try {
    await axios.post("/api/providers/oauth/code", { id: session.value.id, code });
    manualCode.value = "";
  } catch (error) {
    ElMessage.error(errorText(error, translate("提交授权码失败")));
  }
}

async function logout(provider: OAuthProvider) {
  try {
    await ElMessageBox.confirm(translate("确定退出 {0} 登录？相关模型将不可用。", { 0: provider.name }), translate("退出登录"), {
      type: "warning", confirmButtonText: translate("退出"), cancelButtonText: translate("取消"),
    });
  } catch {
    return;
  }
  pendingId.value = provider.id;
  try {
    await axios.post("/api/providers/oauth/logout", { providerId: provider.id });
    await saveSettings(settings => {
      const current = Array.isArray(settings.customProviders) ? settings.customProviders as CustomProvider[] : [];
      return { ...settings, customProviders: current.filter(item => item.id !== provider.id) };
    });
    await load();
  } catch (error) {
    ElMessage.error(errorText(error, translate("退出登录失败")));
  } finally {
    pendingId.value = "";
  }
}

onMounted(load);
onBeforeUnmount(stopPolling);
</script>

<style scoped lang="scss">
.oauthSection { display: flex; flex-direction: column; gap: 10px; }

.oauthHeader {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;

  .oauthHeading { display: flex; flex-direction: column; gap: 2px; }
}

.oauthList { display: flex; flex-direction: column; border: 1px solid var(--el-border-color-lighter); border-radius: 8px; }

.oauthItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child { border-bottom: none; }
}

.oauthInfo { display: flex; align-items: center; gap: 8px; min-width: 0; }

.oauthName { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.oauthDialog { display: flex; flex-direction: column; gap: 10px; }

.oauthCode { font-size: 20px; letter-spacing: 2px; }

.oauthCodeRow { display: flex; gap: 8px; }
</style>
