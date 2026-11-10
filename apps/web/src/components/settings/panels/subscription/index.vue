<template>
  <div class="subscriptionPanel">
    <div class="panelHeader">
      <div>
        <el-text tag="strong">{{ text("currentPlan") }}</el-text>
        <el-text size="small" type="info">{{ text("subHint") }}</el-text>
      </div>
      <el-button size="small" :icon="IconRefresh" :loading="loading" @click="load">{{ text("refresh") }}</el-button>
    </div>

    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <el-text v-else-if="!status?.loggedIn" size="small" type="info">{{ text("notLoggedIn") }}</el-text>

    <el-card v-else shadow="never" class="currentCard">
      <div class="currentRow">
        <div>
          <el-text tag="strong">{{ currentLabel }}</el-text>
          <el-text size="small" type="info" class="currentMeta">{{ text("expires") }}: {{ formatDate(status?.expiresAt) }}<template v-if="daysLeft !== null"> · {{ text("daysLeft", [String(daysLeft)]) }}</template></el-text>
        </div>
        <el-text size="small" type="info">{{ status?.email }}</el-text>
      </div>
    </el-card>

    <div class="plans">
      <div v-for="plan in plans" :key="plan.code" class="planItem">
        <div class="planInfo">
          <el-text tag="strong">{{ planLabel(plan) }}</el-text>
          <el-text size="small" type="info">{{ text("planPeriod", [formatMoney(plan.price), String(plan.periodDays)]) }}</el-text>
        </div>
        <el-button size="small" type="primary" :loading="ordering === plan.code" @click="buy(plan)">
          {{ status?.plan === plan.code ? text("renew") : text("subscribe") }}
        </el-button>
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
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import axios from "axios";
import { ElMessage } from "element-plus";
import { IconRefresh } from "@tabler/icons-vue";
import { formatMoney, marketText } from "@/lib/marketI18n";

type Status = { loggedIn: boolean; email: string; plan: string; planName: string; expiresAt: number };
type Plan = { code: string; name: string; price: number; periodDays: number };
type Order = { code: string; amount: number; qrUrl: string | null; expiresIn: number };

const text = marketText;
const loading = ref(false);
const error = ref("");
const status = ref<Status | null>(null);
const plans = ref<Plan[]>([]);
const ordering = ref("");
const dialogVisible = ref(false);
const order = ref<Order | null>(null);
let poller: ReturnType<typeof setInterval> | undefined;

const currentLabel = computed(() => {
  const item = plans.value.find(plan => plan.code === status.value?.plan);
  if (item) return planLabel(item);
  return status.value?.plan === "trial" ? text("planTrial") : status.value?.planName ?? "";
});

const daysLeft = computed(() => {
  const expiresAt = status.value?.expiresAt ?? 0;
  if (!expiresAt) return null;
  const days = Math.ceil((expiresAt - Date.now()) / 86_400_000);
  return days > 0 ? days : 0;
});

function planLabel(plan: Plan) {
  return plan.code === "trial" ? text("planTrial") : plan.name;
}

function formatDate(value?: number) {
  return value ? new Date(value).toLocaleDateString(String(navigator.language || "vi")) : "—";
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const [statusResponse, plansResponse] = await Promise.all([
      axios.get<{ code: number; data: Status }>("/api/market/status"),
      axios.get<{ code: number; data: Plan[] }>("/api/market/plans"),
    ]);
    status.value = statusResponse.data.data;
    plans.value = plansResponse.data.data ?? [];
  } catch {
    error.value = text("loadPlanError");
  } finally {
    loading.value = false;
  }
}

async function buy(plan: Plan) {
  if (ordering.value) return;
  ordering.value = plan.code;
  error.value = "";
  try {
    const { data } = await axios.post<{ code: number; data: Order }>("/api/market/orders", { planCode: plan.code });
    order.value = data.data;
    dialogVisible.value = true;
    startPolling(data.data.code);
  } catch (cause) {
    error.value = axios.isAxiosError<{ message?: string }>(cause)
      ? cause.response?.data?.message ?? text("orderError") : text("orderError");
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
        ElMessage.success(text("planActivated"));
      }
    } catch {
      // Bỏ qua lỗi mạng tạm thời.
    }
  }, 3000);
}

onMounted(load);
onBeforeUnmount(() => { if (poller) clearInterval(poller); });
</script>

<style scoped lang="scss">
.subscriptionPanel { display: flex; flex-direction: column; gap: 12px; }

.panelHeader { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }

.panelHeader > div,
.currentRow > div { display: flex; flex-direction: column; gap: 4px; }

.currentCard { border-radius: 8px; }

.currentRow { display: flex; align-items: center; justify-content: space-between; gap: 12px; }

.currentMeta { margin-left: 0; }

.plans { display: flex; flex-direction: column; gap: 10px; }

.planItem {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.planInfo { display: flex; flex-direction: column; gap: 4px; }

.orderDialog { display: flex; flex-direction: column; gap: 10px; }

.qrImage { width: 100%; max-width: 320px; align-self: center; background: #fff; border-radius: 8px; padding: 6px; }
</style>
