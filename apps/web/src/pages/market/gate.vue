<template>
  <div class="marketGate">
    <div class="panel">
      <header class="brand">
        <img class="logo" :src="logoUrl" :alt="appName">
        <span class="name">{{ appName }}</span>
      </header>

      <template v-if="mode === 'login'">
        <h1>{{ isRegister ? text("registerTitle") : text("loginTitle") }}</h1>
        <p class="hint">{{ text("accountHint") }}</p>
        <form @submit.prevent="submitAuth">
          <label v-if="isRegister">
            <span>{{ text("nameLabel") }}</span>
            <input v-model="name" autocomplete="nickname" :placeholder="text('namePlaceholder')" required>
          </label>
          <label>
            <span>{{ text("emailLabel") }}</span>
            <input v-model="email" type="email" autocomplete="username" :placeholder="text('emailPlaceholder')" required>
          </label>
          <label>
            <span>{{ text("passwordLabel") }}</span>
            <input v-model="password" type="password" :autocomplete="isRegister ? 'new-password' : 'current-password'" :placeholder="text('passwordPlaceholder')" minlength="8" required>
          </label>
          <p v-if="error" class="error">{{ error }}</p>
          <div v-if="devices.length" class="devices">
            <p class="hint">{{ text("deviceTitle") }}</p>
            <div v-for="device in devices" :key="device.id" class="deviceItem">
              <span>{{ device.name || text("deviceFallback") }}<em v-if="device.lastSeenAt"> · {{ formatDate(device.lastSeenAt) }}</em></span>
              <button class="link" type="button" :disabled="!!removing" @click="removeOldDevice(device.id)">{{ removing === device.id ? text("removing") : text("remove") }}</button>
            </div>
          </div>
          <button type="submit" :disabled="busy">{{ busy ? text("processing") : isRegister ? text("registerButton") : text("loginButton") }}</button>
        </form>
        <button class="link" type="button" @click="toggleMode">{{ isRegister ? text("toLogin") : text("toRegister") }}</button>
      </template>

      <template v-else>
        <h1>{{ text("expiredTitle") }}</h1>
        <p class="hint">{{ text("expiredHint") }}</p>

        <div v-if="plans.length" class="plans">
          <button v-for="plan in plans" :key="plan.code" class="plan" :class="{ selected: selected === plan.code }" type="button" @click="selected = plan.code">
            <strong>{{ planLabel(plan) }}</strong>
            <span class="price">{{ text("planPeriod", [formatMoney(plan.price), String(plan.periodDays)]) }}</span>
          </button>
          <button class="buy" type="button" :disabled="!selected || busy" @click="buy">{{ busy ? text("creatingOrder") : text("buyButton") }}</button>
        </div>

        <div v-if="order" class="order">
          <p>{{ text("transferHint", [order.code, formatMoney(order.amount)]) }}</p>
          <img v-if="order.qrUrl" :src="order.qrUrl" :alt="text('qrAlt')" class="qr">
          <p class="hint">{{ text("orderExpire", [String(Math.round(order.expiresIn / 60))]) }}</p>
        </div>

        <p v-if="error" class="error">{{ error }}</p>
        <button class="link" type="button" @click="logout">{{ text("logout") }} ({{ status?.email }})</button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import logoUrl from "@toonflow/assets/logo.svg";
import { appName } from "@/lib/branding";
import { formatMoney, marketText } from "@/lib/marketI18n";

type MarketStatus = { loggedIn: boolean; email: string; plan: string; planName: string; expiresAt: number };
type Plan = { code: string; name: string; price: number; periodDays: number };
type Order = { code: string; amount: number; qrUrl: string | null; expiresIn: number };
type Device = { id: string; name?: string; lastSeenAt?: number };

const props = defineProps<{ mode: "login" | "paywall" }>();

const isRegister = ref(false);
const name = ref("");
const email = ref("");
const password = ref("");
const busy = ref(false);
const error = ref("");
const status = ref<MarketStatus | null>(null);
const plans = ref<Plan[]>([]);
const selected = ref("");
const order = ref<Order | null>(null);
const devices = ref<Device[]>([]);
const removing = ref("");
let poller: ReturnType<typeof setInterval> | undefined;

const text = marketText;

function planLabel(plan: Plan) {
  return plan.code === "trial" ? marketText("planTrial") : plan.name;
}

function formatDate(value: number) {
  return new Date(value).toLocaleDateString(String(navigator.language || "vi"));
}

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(body?.message || `Error ${response.status}`), { code: body?.code, data: body?.data });
  }
  return body;
}

function toggleMode() {
  isRegister.value = !isRegister.value;
  error.value = "";
}

async function submitAuth() {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    const path = isRegister.value ? "/api/market/register" : "/api/market/login";
    const payload = isRegister.value
      ? { email: email.value.trim(), password: password.value, name: name.value.trim() }
      : { email: email.value.trim(), password: password.value };
    await readJson(await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }));
    window.location.reload();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : text("genericError");
    const list = (cause as { data?: { devices?: Device[] } }).data?.devices;
    devices.value = Array.isArray(list) ? list : [];
  } finally {
    busy.value = false;
  }
}

async function removeOldDevice(id: string) {
  if (removing.value) return;
  removing.value = id;
  try {
    await readJson(await fetch("/api/market/devices/remove", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }),
    }));
    devices.value = devices.value.filter(device => device.id !== id);
    error.value = "";
    await submitAuth();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : text("genericError");
  } finally {
    removing.value = "";
  }
}

async function loadPaywall() {
  try {
    const statusBody = await readJson(await fetch("/api/market/status"));
    status.value = statusBody.data;
    const plansBody = await readJson(await fetch("/api/market/plans"));
    plans.value = plansBody.data ?? [];
    selected.value = plans.value.find(plan => plan.code === status.value?.plan)?.code ?? plans.value[0]?.code ?? "";
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : text("genericError");
  }
}

async function buy() {
  if (busy.value || !selected.value) return;
  busy.value = true;
  error.value = "";
  try {
    const body = await readJson(await fetch("/api/market/orders", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ planCode: selected.value }),
    }));
    order.value = body.data;
    startPolling(body.data.code);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : text("genericError");
  } finally {
    busy.value = false;
  }
}

function startPolling(code: string) {
  if (poller) clearInterval(poller);
  poller = setInterval(async () => {
    try {
      const body = await readJson(await fetch(`/api/market/orders/status?code=${encodeURIComponent(code)}`));
      if (body.data?.status === "paid") {
        if (poller) clearInterval(poller);
        window.location.reload();
      }
    } catch {
      // Bỏ qua lỗi mạng tạm thời, lần poll sau thử lại.
    }
  }, 3000);
}

async function logout() {
  try { await fetch("/api/market/logout", { method: "POST" }); } finally { window.location.reload(); }
}

onBeforeUnmount(() => { if (poller) clearInterval(poller); });
if (props.mode === "paywall") void loadPaywall();
</script>

<style scoped>
.marketGate { min-height: 100svh; display: grid; place-items: center; background: #121212; color: #e8e8e8; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
.panel { width: min(440px, calc(100vw - 32px)); background: #1b1b1b; border: 1px solid #2a2a2a; border-radius: 14px; padding: 28px; display: flex; flex-direction: column; gap: 14px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 600; }
.logo { width: 30px; height: 30px; object-fit: contain; }
h1 { font-size: 20px; margin: 4px 0 0; }
.hint { color: #9a9a9a; font-size: 13px; margin: 0; }
form { display: flex; flex-direction: column; gap: 12px; }
label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #bdbdbd; }
input { background: #111; border: 1px solid #333; border-radius: 8px; padding: 10px 12px; color: #eee; font-size: 14px; }
input:focus { outline: none; border-color: #409eff; }
button { border: none; border-radius: 8px; padding: 11px 14px; font-size: 14px; cursor: pointer; background: #409eff; color: #fff; }
button:disabled { opacity: 0.55; cursor: not-allowed; }
button.link { background: transparent; color: #8ab4ff; font-size: 13px; padding: 4px; }
.error { color: #ff7a7a; font-size: 13px; margin: 0; }
.devices { display: flex; flex-direction: column; gap: 6px; border: 1px solid #333; border-radius: 8px; padding: 10px; }
.deviceItem { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; }
.deviceItem em { color: #9a9a9a; font-style: normal; }
.plans { display: flex; flex-direction: column; gap: 10px; }
.plan { display: flex; justify-content: space-between; background: #151515; border: 1px solid #2f2f2f; color: #ddd; }
.plan.selected { border-color: #409eff; background: #16202b; }
.buy { margin-top: 4px; }
.order { display: flex; flex-direction: column; gap: 10px; font-size: 14px; }
.qr { width: 100%; border-radius: 10px; background: #fff; padding: 8px; }
</style>
