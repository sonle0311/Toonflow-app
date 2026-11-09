<template>
  <div class="storePanel">
    <div class="storeHeader">
      <div>
        <el-text tag="strong">Cửa hàng add-on</el-text>
        <el-text size="small" type="info">Mua một lần, dùng cho tài khoản hiện tại. Cần subscription còn hạn.</el-text>
      </div>
      <el-button size="small" :icon="IconRefresh" :loading="loading" @click="load">Làm mới</el-button>
    </div>

    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <el-text v-else-if="!loading && !addons.length" size="small" type="info">Hiện chưa có add-on nào.</el-text>

    <div v-for="addon in addons" :key="addon.slug" class="addonItem">
      <div class="addonInfo">
        <el-text tag="strong">{{ addon.name }}</el-text>
        <el-tag size="small" type="info" effect="plain">{{ addon.type }}</el-tag>
        <el-text size="small" type="info">{{ formatPrice(addon.price) }}đ</el-text>
        <el-text size="small" class="addonDescription">{{ addon.description }}</el-text>
      </div>
      <div class="addonActions">
        <el-tag v-if="addon.owned" size="small" type="success" effect="plain">Đã sở hữu</el-tag>
        <el-button v-if="addon.owned" size="small" type="primary" :loading="installing === addon.slug" @click="install(addon)">Cài đặt</el-button>
        <el-button v-else size="small" type="primary" :loading="ordering === addon.slug" @click="buy(addon)">Mua</el-button>
      </div>
    </div>

    <el-dialog v-model="dialogVisible" title="Thanh toán add-on" width="min(520px, 92vw)" align-center append-to-body :close-on-click-modal="false">
      <div v-if="order" class="orderDialog">
        <el-text>Chuyển khoản với nội dung <strong>{{ order.code }}</strong> — số tiền <strong>{{ formatPrice(order.amount) }}đ</strong>.</el-text>
        <img v-if="order.qrUrl" :src="order.qrUrl" alt="VietQR" class="qrImage">
        <el-text size="small" type="info">Trang tự cập nhật khi nhận được tiền.</el-text>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import axios from "axios";
import { ElMessage } from "element-plus";
import { IconRefresh } from "@tabler/icons-vue";

type Addon = { slug: string; name: string; type: string; price: number; description: string; owned: boolean };
type Order = { code: string; amount: number; qrUrl: string | null };

const addons = ref<Addon[]>([]);
const loading = ref(false);
const error = ref("");
const ordering = ref("");
const installing = ref("");
const dialogVisible = ref(false);
const order = ref<Order | null>(null);
let poller: ReturnType<typeof setInterval> | undefined;

function formatPrice(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function errorText(cause: unknown, fallback: string) {
  return axios.isAxiosError(cause) ? String(cause.response?.data?.message ?? cause.message) : fallback;
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const { data } = await axios.get<{ code: number; data: Addon[] }>("/api/market/addons");
    addons.value = data.data ?? [];
  } catch (cause) {
    error.value = errorText(cause, "Không tải được danh sách add-on");
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
    error.value = errorText(cause, "Không tạo được đơn mua add-on");
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
        ElMessage.success("Đã mua add-on, bấm Cài đặt để dùng");
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
    ElMessage.success("Đã cài add-on, tải lại trang để thấy node mới");
  } catch (cause) {
    ElMessage.error(errorText(cause, "Cài add-on thất bại"));
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
