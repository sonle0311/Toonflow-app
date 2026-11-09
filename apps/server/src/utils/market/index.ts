import { existsSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { hostname } from "node:os";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { importJWK, jwtVerify, type JWK } from "jose";
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
  addons: string[];
  maxDevices: number;
  license: string;
};

type Cache = { at: number; value: MarketEntitlements | null };

let cache: Cache = { at: 0, value: null };
let offlineUntil = 0;

/** ACT: offline grace 7 ngày kể từ lần đồng bộ entitlement thành công gần nhất. */
const OFFLINE_GRACE_MS = 7 * 86400000;

const sessionFile = () => resolve(dirname(conf.path), "market-session.json");
const deviceFile = () => resolve(dirname(conf.path), "device.json");
const entitlementCacheFile = () => resolve(dirname(conf.path), "market-entitlement.json");
const jwksFile = () => resolve(dirname(conf.path), "market-jwks.json");

/** Mã thiết bị ổn định theo máy cài đặt, dùng cho giới hạn số thiết bị. */
export function deviceInfo(): { id: string; name: string } {
  try {
    if (existsSync(deviceFile())) {
      const parsed = JSON.parse(readFileSync(deviceFile(), "utf8")) as { id?: unknown; name?: unknown };
      if (typeof parsed.id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.id)) {
        return { id: parsed.id.toLowerCase(), name: typeof parsed.name === "string" ? parsed.name : hostname() };
      }
    }
  } catch {
    // Tệp hỏng thì tạo lại mã mới.
  }
  const created = { id: randomUUID(), name: hostname() };
  try {
    mkdirSync(dirname(deviceFile()), { recursive: true });
    writeFileSync(deviceFile(), JSON.stringify(created), { mode: 0o600 });
  } catch {
    // Không ghi được thì vẫn dùng mã tạm trong phiên.
  }
  return created;
}

function readEntitlementCache(): Cache | undefined {
  try {
    if (!existsSync(entitlementCacheFile())) return undefined;
    const parsed = JSON.parse(readFileSync(entitlementCacheFile(), "utf8")) as Cache;
    if (!parsed || typeof parsed.at !== "number" || !parsed.value) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function writeEntitlementCache(value: MarketEntitlements) {
  try {
    mkdirSync(dirname(entitlementCacheFile()), { recursive: true });
    writeFileSync(entitlementCacheFile(), JSON.stringify({ at: Date.now(), value }), { mode: 0o600 });
  } catch {
    // Bỏ qua lỗi ghi cache; lần gọi sau sẽ thử lại.
  }
}

// ACT: bản phát hành trỏ về market thật; dev có thể override bằng MARKET_BASE_URL.
const defaultMarketBaseUrl = "https://market.sonlt.dev";

function marketBaseUrl() {
  return (process.env.MARKET_BASE_URL || defaultMarketBaseUrl).replace(/\/+$/, "");
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
  const headers: Record<string, string> = { "content-type": "application/json", "x-device-id": deviceInfo().id, "x-device-name": deviceInfo().name, ...(init.headers as Record<string, string> | undefined) };
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  const response = await fetch(`${marketBaseUrl()}${path}`, { ...init, headers });
  const body = await response.json().catch(() => ({})) as { code?: number; codeName?: string; message?: string; data?: T };
  if (!response.ok) {
    throw Object.assign(new Error(body?.message || `Market trả lỗi ${response.status}`), {
      status: response.status, code: body?.code, codeName: body?.codeName,
    });
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
    offlineUntil = 0;
    writeEntitlementCache(data);
    void refreshJwks();
    return data;
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 402) {
      cache = { at: Date.now(), value: null };
      return null;
    }
    // ACT: market không truy cập được → dùng entitlement đã cache trong 7 ngày.
    if (status === undefined || status === 503) {
      const cached = readEntitlementCache();
      if (cached?.value && Date.now() - cached.at < OFFLINE_GRACE_MS) {
        const claims = await verifyLicenseOffline(cached.value.license);
        if (claims?.exp && claims.exp * 1000 > Date.now()) {
          // ACT: dùng claim đã ký thay vì nội dung cache, tránh sửa tay kéo dài hạn.
          const verified: MarketEntitlements = {
            plan: claims.plan ?? cached.value.plan,
            planName: cached.value.planName,
            expiresAt: claims.exp * 1000,
            plugins: claims.plugins ?? cached.value.plugins,
            addons: claims.addons ?? cached.value.addons ?? [],
            maxDevices: claims.maxDevices ?? cached.value.maxDevices,
            license: cached.value.license,
          };
          cache = { at: cached.at, value: verified };
          offlineUntil = cached.at + OFFLINE_GRACE_MS;
          return verified;
        }
        throw Object.assign(new Error("Không xác minh được license offline, cần kết nối market"), { status: 503, codeName: "MARKET_OFFLINE_INVALID" });
      }
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
    addons: entitlements?.addons ?? [],
    maxDevices: entitlements?.maxDevices ?? 0,
    offline: offlineUntil > Date.now(),
    graceUntil: offlineUntil,
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

/** True khi plugin được cấp trong gói hiện tại hoặc đã mua như add-on ("*" = mọi plugin). */
export function isPluginAllowed(entitlements: MarketEntitlements | null, name: string) {
  if (!entitlements) return false;
  return entitlements.plugins.includes("*") || entitlements.plugins.includes(name) || entitlements.addons.includes(name);
}

export type MarketAddon = { slug: string; name: string; type: string; price: number; description: string; owned: boolean };

export async function listAddons(): Promise<MarketAddon[]> {
  const session = readSession();
  const token = session ? await ensureAccessToken(session) : undefined;
  return marketFetch<MarketAddon[]>("/addons", { token });
}

export async function createAddonOrder(slug: string) {
  const session = readSession();
  if (!session) throw Object.assign(new Error("Chưa đăng nhập"), { status: 401 });
  const token = await ensureAccessToken(session);
  return marketFetch<{ code: string; amount: number; addonSlug: string; qrUrl: string | null; expiresIn: number }>("/orders", {
    method: "POST", token, body: JSON.stringify({ addonSlug: slug }),
  });
}

/** Tải bundle add-on (đã watermark) và ghi vào data/nodes để dùng ngay. */
export async function installAddon(slug: string) {
  if (!/^[a-z][a-z0-9-]{1,59}$/.test(slug)) throw Object.assign(new Error("Mã add-on không hợp lệ"), { status: 400 });
  const session = readSession();
  if (!session) throw Object.assign(new Error("Chưa đăng nhập"), { status: 401 });
  const token = await ensureAccessToken(session);
  const response = await fetch(`${marketBaseUrl()}/addons/${encodeURIComponent(slug)}/download`, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string };
    throw Object.assign(new Error(body?.message || `Không tải được add-on (${response.status})`), { status: response.status });
  }
  const source = await response.text();
  const nodesDirectory = resolve(dirname(conf.path), "nodes");
  mkdirSync(nodesDirectory, { recursive: true });
  writeFileSync(resolve(nodesDirectory, `${slug}.umd.js`), source);
  return { slug, bytes: source.length };
}

/** Heartbeat định kỳ 6 giờ để entitlement và giới hạn thiết bị luôn được đồng bộ. */
export function startMarketHeartbeat() {
  const timer = setInterval(() => { void getEntitlements(true).catch(() => {}); }, 6 * 3600_000);
  timer.unref?.();
  return () => clearInterval(timer);
}

type LicenseClaims = { sub?: string; plan?: string; plugins?: string[]; addons?: string[]; maxDevices?: number; exp?: number };

/** ACT: license JWT là nguồn sự thật khi offline; cache JSON có thể bị sửa tay. */
async function verifyLicenseOffline(license: string): Promise<LicenseClaims | undefined> {
  try {
    if (!existsSync(jwksFile())) return undefined;
    const jwks = JSON.parse(readFileSync(jwksFile(), "utf8")) as { keys?: (JWK & { kid?: string })[] };
    const key = jwks.keys?.[0];
    if (!key) return undefined;
    const publicKey = await importJWK(key, "ES256");
    const { payload } = await jwtVerify(license, publicKey, { issuer: "toonflow-market" });
    return payload as LicenseClaims;
  } catch {
    return undefined;
  }
}

async function refreshJwks() {
  try {
    const response = await fetch(`${marketBaseUrl()}/license/public-key`);
    if (!response.ok) return;
    const body = await response.json() as { data?: unknown };
    if (!body?.data) return;
    mkdirSync(dirname(jwksFile()), { recursive: true });
    writeFileSync(jwksFile(), JSON.stringify(body.data), { mode: 0o600 });
  } catch {
    // Không lấy được JWKS thì giữ bản cũ; offline sẽ báo lỗi nếu chưa từng có.
  }
}
