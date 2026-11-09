<template>
  <div class="marketGate">
    <div class="panel">
      <header class="brand">
        <img class="logo" :src="logoUrl" :alt="appName">
        <span class="name">{{ appName }}</span>
      </header>

      <template v-if="mode === 'login'">
        <h1>{{ isRegister ? "Tạo tài khoản" : "Đăng nhập" }}</h1>
        <p class="hint">Tài khoản dùng cho ứng dụng và mua gói dịch vụ.</p>
        <form @submit.prevent="submitAuth">
          <label v-if="isRegister">
            <span>Tên hiển thị</span>
            <input v-model="name" autocomplete="nickname" placeholder="Nguyễn Văn A" required>
          </label>
          <label>
            <span>Email</span>
            <input v-model="email" type="email" autocomplete="username" placeholder="ban@email.com" required>
          </label>
          <label>
            <span>Mật khẩu</span>
            <input v-model="password" type="password" :autocomplete="isRegister ? 'new-password' : 'current-password'" placeholder="Tối thiểu 8 ký tự" minlength="8" required>
          </label>
          <p v-if="error" class="error">{{ error }}</p>
          <button type="submit" :disabled="busy">{{ busy ? "Đang xử lý…" : isRegister ? "Đăng ký và dùng thử 3 ngày" : "Đăng nhập" }}</button>
        </form>
        <button class="link" type="button" @click="toggleMode">{{ isRegister ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký" }}</button>
      </template>

      <template v-else>
        <h1>Gói của bạn đã hết hạn</h1>
        <p class="hint">Chọn gói để tiếp tục sử dụng. Thanh toán bằng chuyển khoản VietQR.</p>

        <div v-if="plans.length" class="plans">
          <button v-for="plan in plans" :key="plan.code" class="plan" :class="{ selected: selected === plan.code }" type="button" @click="selected = plan.code">
            <strong>{{ plan.name }}</strong>
            <span class="price">{{ formatPrice(plan.price) }}đ / {{ plan.periodDays }} ngày</span>
          </button>
          <button class="buy" type="button" :disabled="!selected || busy" @click="buy">{{ busy ? "Đang tạo đơn…" : "Tạo đơn thanh toán" }}</button>
        </div>

        <div v-if="order" class="order">
          <p>Quét mã hoặc chuyển khoản với nội dung <strong>{{ order.code }}</strong> — số tiền <strong>{{ formatPrice(order.amount) }}đ</strong>.</p>
          <img v-if="order.qrUrl" :src="order.qrUrl" alt="VietQR" class="qr">
          <p class="hint">Đơn hết hạn sau {{ Math.round(order.expiresIn / 60) }} phút. Trang tự cập nhật khi nhận được tiền.</p>
        </div>

        <p v-if="error" class="error">{{ error }}</p>
        <button class="link" type="button" @click="logout">Đăng xuất ({{ status?.email }})</button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import logoUrl from "@toonflow/assets/logo.svg";
import { appName } from "@/lib/branding";

type MarketStatus = { loggedIn: boolean; email: string; plan: string; planName: string; expiresAt: number };
type Plan = { code: string; name: string; price: number; periodDays: number };
type Order = { code: string; amount: number; qrUrl: string | null; expiresIn: number };

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
let poller: ReturnType<typeof setInterval> | undefined;

function formatPrice(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

async function readJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || `Lỗi ${response.status}`);
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
    error.value = cause instanceof Error ? cause.message : "Không đăng nhập được";
  } finally {
    busy.value = false;
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
    error.value = cause instanceof Error ? cause.message : "Không tải được gói";
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
    error.value = cause instanceof Error ? cause.message : "Không tạo được đơn";
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
.plans { display: flex; flex-direction: column; gap: 10px; }
.plan { display: flex; justify-content: space-between; background: #151515; border: 1px solid #2f2f2f; color: #ddd; }
.plan.selected { border-color: #409eff; background: #16202b; }
.buy { margin-top: 4px; }
.order { display: flex; flex-direction: column; gap: 10px; font-size: 14px; }
.qr { width: 100%; border-radius: 10px; background: #fff; padding: 8px; }
</style>
