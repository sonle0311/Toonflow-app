<template>
  <div class="storePanel">
    <div class="storeHeader">
      <div>
        <el-text tag="strong">{{ text("storeTitle") }}</el-text>
        <el-text size="small" type="info">{{ text("storeHint") }}</el-text>
      </div>
      <el-button size="small" :icon="IconRefresh" :loading="loading" @click="load">{{ text("refresh") }}</el-button>
    </div>

    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <el-text v-else-if="!loading && !addons.length" size="small" type="info">{{ text("storeEmpty") }}</el-text>

    <div v-for="addon in addons" :key="addon.slug" class="addonItem">
      <div class="addonInfo">
        <el-text tag="strong">{{ addon.name }}</el-text>
        <el-tag size="small" type="info" effect="plain">{{ addon.type }}</el-tag>
        <el-text size="small" type="info">{{ formatMoney(addon.price) }}</el-text>
        <el-text size="small" class="addonDescription">{{ addon.description }}</el-text>
      </div>
      <div class="addonActions">
        <el-tag v-if="addon.owned" size="small" type="success" effect="plain">{{ text("owned") }}</el-tag>
        <el-button v-if="addon.owned" size="small" type="primary" :loading="installing === addon.slug" @click="install(addon)">{{ text("install") }}</el-button>
        <el-button v-else size="small" type="primary" :loading="ordering === addon.slug" @click="buy(addon)">{{ text("buy") }}</el-button>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="text('payTitle')" width="min(520px, 92vw)" align-center append-to-body :close-on-click-modal="false">
      <div v-if="order" class="orderDialog">
        <el-text>{{ text("transferHint", [order.code, formatMoney(order.amount)]) }}</el-text>
        <img v-if="order.qrUrl" :src="order.qrUrl" :alt="text('qrAlt')" class="qrImage">
        <el-text size="small" type="info">{{ text("orderExpire", [String(Math.round(order.expiresIn / 60))]) }}</el-text>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import axios from "axios";
import { ElMessage } from "element-plus";
import { IconRefresh } from "@tabler/icons-vue";
import { formatMoney, marketText } from "@/lib/marketI18n";

type Addon = { slug: string; name: string; type: string; price: number; description: string; owned: boolean };
type Order = { code: string; amount: number; qrUrl: string | null; expiresIn: number };

const text = marketText;
const addons = ref<Addon[]>([]);
const loading = ref(false);
const error = ref("");
const ordering = ref("");
const installing = ref("");
const dialogVisible = ref(false);
const order = ref<Order | null>(null);
let poller: ReturnType<typeof setInterval> | undefined;

function errorText(cause: unknown, fallbackKey: "loadStoreError" | "orderCreateError" | "installError") {
  return axios.isAxiosError(cause) ? String(cause.response?.data?.message ?? cause.message) : text(fallbackKey);
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await axios.get<{ code: number; data: Addon[] }>("/api/market/addons");
    addons.value = data.data ?? [];
  } catch (cause) {
    error.value = errorText(cause, "loadStoreError");
  } finally {
    loading.value = false;
  }
}

async function buy(addon: Addon) {
  if (ordering.value) return;
  ordering.value = addon.slug;
  error.value = "";
  try {
    const { data } = await axios.post<{ code: number; data: Order }>("/api/market/addons/order", { slug: addon.slug });
    order.value = data.data;
    dialogVisible.value = true;
    startPolling(data.data.code);
  } catch (cause) {
    error.value = errorText(cause, "orderCreateError");
  } finally {
    ordering.value = "";
  }
}

function startPolling(code: string) {
  if (poller) clearInterval(poller);
  poller = setInterval(async () => {
    try {
      const { data } = await axios.get<{ code: number; data: { status: string } }>("/api/market/orders/status", { params: { code } });
      if (data.data?.status === "paid") {
        if (poller) clearInterval(poller);
        dialogVisible.value = false;
        await load();
        ElMessage.success(text("purchased"));
      }
    } catch {
      // Bỏ qua lỗi mạng tạm thời.
    }
  }, 3000);
}

async function install(addon: Addon) {
  installing.value = addon.slug;
  try {
    await axios.post("/api/market/addons/install", { slug: addon.slug });
    ElMessage.success(text("installOk"));
  } catch (cause) {
    ElMessage.error(errorText(cause, "installError"));
  } finally {
    installing.value = "";
  }
}

onMounted(load);
onBeforeUnmount(() => { if (poller) clearInterval(poller); });
</script>

<style scoped lang="scss">
.storePanel { display: flex; flex-direction: column; gap: 12px; }

.storeHeader { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }

.addonItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.addonInfo { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; }

.addonDescription { flex-basis: 100%; }

.addonActions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.orderDialog { display: flex; flex-direction: column; gap: 10px; }

.qrImage { width: 100%; max-width: 320px; align-self: center; background: #fff; border-radius: 8px; padding: 6px; }
</style>
