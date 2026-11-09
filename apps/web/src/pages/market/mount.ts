import { createApp, h } from "vue";
import MarketGate from "./gate.vue";

export type MarketGateMode = "login" | "paywall" | "ready";

/** ACT: Chưa đăng nhập → login; đã đăng nhập nhưng subscription hết hạn → paywall. */
export async function marketGateMode(): Promise<MarketGateMode> {
  try {
    const response = await fetch("/api/market/status", { headers: { accept: "application/json" } });
    if (!response.ok) return "ready";
    const body = await response.json();
    const status = body?.data;
    if (!status || status.loggedIn !== true) return "login";
    if (!status.plan) return "paywall";
    return "ready";
  } catch {
    return "ready";
  }
}

export function mountMarketGate(mode: Exclude<MarketGateMode, "ready">) {
  createApp({ render: () => h(MarketGate, { mode }) }).mount("#app");
}
