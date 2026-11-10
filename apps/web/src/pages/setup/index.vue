<template>
  <div class="setupPage">
    <div class="panel">
      <header class="brand">
        <img class="logo" :src="logoUrl" :alt="appName">
        <span class="name">{{ appName }}</span>
        <span class="stepLabel">Bước {{ step }}/3</span>
      </header>

      <template v-if="step === 1">
        <h1>Chọn nhà cung cấp AI</h1>
        <p class="hint">Bạn dùng API key của riêng mình. Key được lưu trên máy này, không gửi lên máy chủ của {{ appName }}.</p>
        <div class="presets">
          <button v-for="preset in presets" :key="preset.id" type="button" class="preset" :class="{ selected: selectedPreset === preset.id }" @click="selectedPreset = preset.id">
            <strong>{{ preset.label }}</strong>
            <span class="presetHint">{{ preset.models[0]?.label }} · {{ preset.models.length }} model gợi ý</span>
          </button>
        </div>
        <div class="actions">
          <button class="link" type="button" @click="skip">Bỏ qua</button>
          <button type="button" :disabled="!selectedPreset" @click="step = 2">Tiếp tục</button>
        </div>
      </template>

      <template v-else-if="step === 2">
        <h1>Nhập API key</h1>
        <p class="hint">Dán API key của <strong>{{ preset?.label }}</strong>. Bấm kiểm tra để lấy danh sách model thật.</p>
        <input v-model="apiKey" type="password" placeholder="API key" autocomplete="off" @keyup.enter="check">
        <p v-if="checkMessage" class="hint" :class="{ warn: !verified }">{{ checkMessage }}</p>
        <div class="actions">
          <button class="link" type="button" @click="step = 1">Quay lại</button>
          <button type="button" :disabled="busy || !apiKey.trim()" @click="check">{{ busy ? "Đang kiểm tra…" : "Kiểm tra & tiếp tục" }}</button>
        </div>
      </template>

      <template v-else>
        <h1>Chọn thư mục làm việc</h1>
        <p class="hint">Thư mục trống dùng để chứa dự án. Model mặc định: <strong>{{ defaultModelLabel }}</strong>.</p>
        <div class="directory">
          <span class="directoryPath">{{ directory || "Chưa chọn thư mục" }}</span>
          <button type="button" class="secondary" :disabled="picking" @click="pickDirectory">{{ picking ? "Đang mở…" : "Chọn thư mục" }}</button>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <div class="actions">
          <button class="link" type="button" @click="skip">Bỏ qua</button>
          <button type="button" :disabled="busy || !directory" @click="finish">{{ busy ? "Đang lưu…" : "Hoàn tất" }}</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import axios from "axios";
import { useRouter } from "vue-router";
import logoUrl from "@toonflow/assets/logo.svg";
import { languagePresets } from "@toonflow/providers";
import { appName } from "@/lib/branding";
import { actualPlatform } from "@/lib/platform";
import { saveSettings } from "@/stores/settings";
import { useWorkspaceStore } from "@/stores/workspace";
import type { CustomProviderModel } from "@/stores/settings";

type CheckResult = { verified: boolean; models: { id: string; label: string }[]; message?: string };

const router = useRouter();
const workspaceStore = useWorkspaceStore();
const presets = languagePresets;
const step = ref(1);
const selectedPreset = ref("");
const apiKey = ref("");
const busy = ref(false);
const picking = ref(false);
const verified = ref(false);
const checkMessage = ref("");
const models = ref<CustomProviderModel[]>([]);
const directory = ref("");
const error = ref("");

const preset = computed(() => presets.find(item => item.id === selectedPreset.value));
const defaultModelLabel = computed(() => models.value[0]?.label ?? "chưa có");

function resetCheck() {
  verified.value = false;
  checkMessage.value = "";
  models.value = [];
}

async function check() {
  if (busy.value || !preset.value) return;
  busy.value = true;
  error.value = "";
  resetCheck();
  try {
    const { data } = await axios.post<{ code: number; data: CheckResult }>("/api/providers/check", {
      preset: preset.value.id, apiKey: apiKey.value.trim(),
    });
    verified.value = data.data.verified;
    // ACT: ưu tiên model gợi ý của preset lên đầu để model mặc định không rơi vào model lạ.
    const preferred = new Map(preset.value.models.map((model, index) => [model.id, index]));
    models.value = [...data.data.models].sort((left, right) =>
      (preferred.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (preferred.get(right.id) ?? Number.MAX_SAFE_INTEGER)
      || left.id.localeCompare(right.id));
    checkMessage.value = data.data.verified
      ? `Kết nối thành công, tìm thấy ${data.data.models.length} model.`
      : `${data.data.message ?? "Không kiểm tra được"}. Đang dùng danh sách gợi ý.`;
    step.value = 3;
  } catch (cause) {
    error.value = axios.isAxiosError<{ message?: string }>(cause)
      ? cause.response?.data?.message ?? "Không kiểm tra được API key" : "Không kiểm tra được API key";
  } finally {
    busy.value = false;
  }
}

async function pickDirectory() {
  if (picking.value) return;
  picking.value = true;
  error.value = "";
  try {
    if (!actualPlatform.isLocalDesktop) {
      error.value = "Bản web chưa hỗ trợ chọn thư mục; hãy chọn trong Home sau khi hoàn tất.";
      return;
    }
    const { data } = await axios.post<{ data: { directory: string | null } }>("/api/desktop/selectDirectory", null, { headers: { "x-toonflow-desktop": "1" } });
    if (data.data.directory) directory.value = data.data.directory;
  } catch {
    error.value = "Không mở được hộp thoại chọn thư mục";
  } finally {
    picking.value = false;
  }
}

async function finish() {
  if (busy.value || !preset.value || !directory.value) return;
  busy.value = true;
  error.value = "";
  try {
    const provider = {
      id: preset.value.id, label: preset.value.label, apiUrl: preset.value.apiUrl,
      apiKey: apiKey.value.trim(), protocol: preset.value.protocol, models: models.value,
    };
    await saveSettings(current => ({
      customProviders: [...(Array.isArray(current.customProviders) ? current.customProviders as typeof provider[] : []).filter(item => item.id !== provider.id), provider],
      setupWizard: { completed: true, skipped: false, at: Date.now() },
    }));
    await workspaceStore.openProject(directory.value);
    await router.replace("/home");
  } catch (cause) {
    error.value = axios.isAxiosError<{ message?: string }>(cause)
      ? cause.response?.data?.message ?? "Không lưu được thiết lập" : cause instanceof Error ? cause.message : "Không lưu được thiết lập";
  } finally {
    busy.value = false;
  }
}

async function skip() {
  await saveSettings(() => ({ setupWizard: { completed: true, skipped: true, at: Date.now() } })).catch(() => {});
  await router.replace("/home");
}
</script>

<style scoped>
.setupPage { min-height: 100svh; display: grid; place-items: center; background: #121212; color: #e8e8e8; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
.panel { width: min(520px, calc(100vw - 32px)); background: #1b1b1b; border: 1px solid #2a2a2a; border-radius: 14px; padding: 28px; display: flex; flex-direction: column; gap: 14px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 600; }
.logo { width: 30px; height: 30px; object-fit: contain; }
.stepLabel { margin-left: auto; color: #8f8f8f; font-size: 12px; }
h1 { font-size: 20px; margin: 4px 0 0; }
.hint { color: #9a9a9a; font-size: 13px; margin: 0; }
.hint.warn { color: #e6a23c; }
.presets { display: flex; flex-direction: column; gap: 8px; }
.preset { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; background: #151515; border: 1px solid #2f2f2f; color: #ddd; text-align: left; padding: 12px; }
.preset.selected { border-color: #409eff; background: #16202b; }
.presetHint { font-size: 12px; color: #9a9a9a; }
input { background: #111; border: 1px solid #333; border-radius: 8px; padding: 10px 12px; color: #eee; font-size: 14px; }
input:focus { outline: none; border-color: #409eff; }
button { border: none; border-radius: 8px; padding: 11px 14px; font-size: 14px; cursor: pointer; background: #409eff; color: #fff; }
button:disabled { opacity: 0.55; cursor: not-allowed; }
button.link { background: transparent; color: #8ab4ff; padding: 6px; font-size: 13px; }
button.secondary { background: #262626; }
.actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.directory { display: flex; align-items: center; justify-content: space-between; gap: 10px; background: #111; border: 1px solid #333; border-radius: 8px; padding: 10px 12px; }
.directoryPath { font-size: 13px; color: #c8c8c8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.error { color: #ff7a7a; font-size: 13px; margin: 0; }
</style>
