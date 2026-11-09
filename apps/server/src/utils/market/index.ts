import { existsSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import conf from "@/utils/conf";

export type MarketSession = {
  userId: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
};

export type MarketEntitlements = {
  plan: string;
  planName: string;
  expiresAt: number;
  plugins: string[];
  maxDevices: number;
  license: string;
};

type Cache = { at: number; value: MarketEntitlements | null };

let cache: Cache = { at: 0, value: null };

const sessionFile = () => resolve(dirname(conf.path), "market-session.json");

function marketBaseUrl() {
  return (process.env.MARKET_BASE_URL ?? "http://127.0.0.1:4100").replace(/\/+$/, "");
}

export function readSession(): MarketSession | undefined {
  try {
    if (!existsSync(sessionFile())) return undefined;
    const parsed = JSON.parse(readFileSync(sessionFile(), "utf8")) as MarketSession;
    if (!parsed?.accessToken || !parsed.refreshToken || !parsed.userId) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function writeSession(session: MarketSession) {
  mkdirSync(dirname(sessionFile()), { recursive: true });
  writeFileSync(sessionFile(), JSON.stringify(session), { mode: 0o600 });
}

function clearSession() {
  cache = { at: 0, value: null };
  try { rmSync(sessionFile(), { force: true }); } catch { /* ignore */ }
}

async function marketFetch<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json", ...(init.headers as Record<string, string> | undefined) };
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  const response = await fetch(`${marketBaseUrl()}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({})) as { code?: number; message?: string; data?: T };
  if (!response.ok) {
    throw Object.assign(new Error(body?.message || `Market trả lỗi ${response.status}`), { status: response.status, code: body?.code });
  }
  return body.data as T;
}

function toSession(userId: string, email: string, name: string, tokens: { accessToken: string; refreshToken: string; expiresIn: number }): MarketSession {
  return { userId, email, name, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, accessExpiresAt: Date.now() + tokens.expiresIn * 1000 };
}

export async function register(email: string, password: string, name: string) {
  const data = await marketFetch<{ userId: string; accessToken: string; refreshToken: string; expiresIn: number }>("/auth/register", {
    method: "POST", body: JSON.stringify({ email, password, name }),
  });
  const session = toSession(data.userId, email.trim().toLowerCase(), name, data);
  writeSession(session);
  return session;
}

export async function login(email: string, password: string) {
  const data = await marketFetch<{ userId: string; name: string; accessToken: string; refreshToken: string; expiresIn: number }>("/auth/login", {
    method: "POST", body: JSON.stringify({ email, password }),
  });
  const session = toSession(data.userId, email.trim().toLowerCase(), data.name, data);
  writeSession(session);
  return session;
}

export function logout() {
  clearSession();
}

async function ensureAccessToken(session: MarketSession) {
  if (session.accessExpiresAt - Date.now() > 60_000) return session.accessToken;
  const data = await marketFetch<{ accessToken: string; refreshToken: string; expiresIn: number }>("/auth/refresh", {
    method: "POST", body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  const next: MarketSession = { ...session, accessToken: data.accessToken, refreshToken: data.refreshToken, accessExpiresAt: Date.now() + data.expiresIn * 1000 };
  writeSession(next);
  session.accessToken = next.accessToken;
  session.refreshToken = next.refreshToken;
  session.accessExpiresAt = next.accessExpiresAt;
  return next.accessToken;
}

/** Entitlement được cache ngắn để không gọi market mỗi request. */
export async function getEntitlements(force = false): Promise<MarketEntitlements | null> {
  const session = readSession();
  if (!session) return null;
  if (!force && cache.value && Date.now() - cache.at < 60_000) return cache.value;
  try {
    const token = await ensureAccessToken(session);
    const data = await marketFetch<MarketEntitlements>("/license/entitlements", { token });
    cache = { at: Date.now(), value: data };
    return data;
  } catch (error) {
    if ((error as { status?: number }).status === 402) {
      cache = { at: Date.now(), value: null };
      return null;
    }
    throw error;
  }
}

export async function getStatus() {
  const session = readSession();
  if (!session) return { loggedIn: false, email: "", plan: "", planName: "", expiresAt: 0, plugins: [] as string[], maxDevices: 0 };
  const entitlements = await getEntitlements(true);
  return {
    loggedIn: true,
    email: session.email,
    name: session.name,
    plan: entitlements?.plan ?? "",
    planName: entitlements?.planName ?? "",
    expiresAt: entitlements?.expiresAt ?? 0,
    plugins: entitlements?.plugins ?? [],
    maxDevices: entitlements?.maxDevices ?? 0,
  };
}

export async function listPlans() {
  return marketFetch<{ code: string; name: string; price: number; periodDays: number; maxDevices: number; plugins: string[] }[]>("/plans");
}

export async function createOrder(planCode: string) {
  const session = readSession();
  if (!session) throw Object.assign(new Error("Chưa đăng nhập"), { status: 401 });
  const token = await ensureAccessToken(session);
  return marketFetch<{ code: string; amount: number; planCode: string; qrUrl: string | null; expiresIn: number }>("/orders", {
    method: "POST", token, body: JSON.stringify({ planCode }),
  });
}

export async function getOrder(code: string) {
  const session = readSession();
  if (!session) throw Object.assign(new Error("Chưa đăng nhập"), { status: 401 });
  const token = await ensureAccessToken(session);
  return marketFetch<{ code: string; status: string; amount: number; paidAt?: number | null }>(`/orders/${encodeURIComponent(code)}`, { token });
}

/** True khi plugin được cấp trong gói hiện tại ("*" = mọi plugin). */
export function isPluginAllowed(entitlements: MarketEntitlements | null, name: string) {
  if (!entitlements) return false;
  return entitlements.plugins.includes("*") || entitlements.plugins.includes(name);
}
