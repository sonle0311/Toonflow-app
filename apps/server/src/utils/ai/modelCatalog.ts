import { dirname, join } from "node:path";
import { readFile, stat, writeAtomic } from "@toonflow/file";
import { z } from "zod";
import conf from "@/utils/conf";

const cacheLifetime = 24 * 60 * 60 * 1000;
const retryDelay = 5 * 60 * 1000;
const maxCatalogBytes = 16 * 1024 * 1024;
const tokenLimit = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const limitsSchema = z.object({ contextWindow: tokenLimit, maxTokens: tokenLimit });
const providerSchema = z.object({
  id: z.string().min(1).max(200),
  api: z.string().max(4096).optional(),
  models: z.record(z.string().min(1).max(256), limitsSchema),
});
const cacheSchema = z.object({
  version: z.literal(1),
  fetchedAt: z.number().int().positive().refine(value => value <= Date.now() + 60000),
  providers: z.array(providerSchema).min(1).max(2000),
});
const remoteProviderSchema = providerSchema.omit({ models: true }).extend({ models: z.record(z.string(), z.unknown()) });
const remoteModelSchema = z.object({
  id: z.string().min(1).max(256),
  limit: z.object({ context: tokenLimit, output: tokenLimit }),
});

type ModelLimits = z.infer<typeof limitsSchema>;
let providers: z.infer<typeof providerSchema>[] = [];
let fetchedAt = 0;
let lastAttempt = 0;
let initialization: Promise<void> | undefined;
let refresh: Promise<void> | undefined;

function apiEndpoint(value?: string) {
  if (!value) return;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) return;
    return `${url.origin}${url.pathname.replace(/\/+$/, "").replace(/\/v1$/, "")}`;
  } catch { return; }
}

function parseCatalog(value: unknown) {
  const source = z.record(z.string(), z.unknown()).parse(value);
  const result: z.infer<typeof providerSchema>[] = [];
  for (const [id, value] of Object.entries(source)) {
    const parsed = remoteProviderSchema.safeParse(value);
    if (!parsed.success || parsed.data.id !== id) continue;
    const entries: [string, ModelLimits][] = [];
    for (const [modelId, value] of Object.entries(parsed.data.models)) {
      const model = remoteModelSchema.safeParse(value);
      if (!model.success || model.data.id !== modelId) continue;
      entries.push([modelId, { contextWindow: model.data.limit.context, maxTokens: model.data.limit.output }]);
    }
    if (entries.length) result.push({ id, api: parsed.data.api, models: Object.fromEntries(entries) });
  }
  return cacheSchema.shape.providers.parse(result);
}

async function fetchCatalog() {
  const response = await fetch("https://models.dev/api.json", {
    headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000), redirect: "error",
  });
  if (!response.ok || !response.body) throw new Error("Model catalog unavailable");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxCatalogBytes) throw new Error("Model catalog is too large");
      chunks.push(value);
    }
    return parseCatalog(JSON.parse(Buffer.concat(chunks).toString("utf8")));
  } finally { await reader.cancel().catch(() => {}); }
}

function refreshCatalog() {
  if (refresh) return refresh;
  const now = Date.now();
  if (now - fetchedAt < cacheLifetime || now - lastAttempt < retryDelay) return;
  lastAttempt = now;
  refresh = (async () => {
    try {
      const cache = { version: 1 as const, fetchedAt: Date.now(), providers: await fetchCatalog() };
      await writeAtomic(join(dirname(conf.path), "modelCatalog.json"), JSON.stringify(cache), { mode: 0o600 });
      providers = cache.providers;
      fetchedAt = cache.fetchedAt;
    } catch {
      console.warn("Không cập nhật được danh mục models.dev; dùng giới hạn model đã có.");
    }
  })().finally(() => { refresh = undefined; });
  return refresh;
}

export function initializeModelCatalog() {
  return initialization ??= (async () => {
    const path = join(dirname(conf.path), "modelCatalog.json");
    try {
      if ((await stat(path)).size > maxCatalogBytes) throw new Error("Model catalog cache is too large");
      const cache = cacheSchema.parse(JSON.parse(await readFile(path, "utf8")));
      providers = cache.providers;
      fetchedAt = cache.fetchedAt;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.warn("Không đọc được cache model; sẽ lấy lại danh mục models.dev.");
    }
    // ACT: Chỉ chờ mạng khi chưa có cache; bản cũ vẫn dùng được trong lúc làm mới hoặc khi mất mạng.
    if (providers.length) { void refreshCatalog(); return; }
    await refreshCatalog();
  })();
}

export function getCatalogModelLimits(providerId: string, modelId: string, apiUrl?: string): Partial<ModelLimits> | undefined {
  if (!initialization) void initializeModelCatalog();
  else void refreshCatalog();
  const endpoint = apiEndpoint(apiUrl);
  const byId = providers.filter(provider => provider.id.toLowerCase() === providerId.trim().toLowerCase()
    && (!apiUrl || endpoint !== undefined && apiEndpoint(provider.api) === endpoint));
  const matches = byId.length ? byId : endpoint ? providers.filter(provider => apiEndpoint(provider.api) === endpoint) : [];
  // ACT: Không đoán giới hạn relay theo tên model toàn cục; endpoint chung chỉ nhận các trường đồng thuận.
  const limits = matches.flatMap(provider => Object.hasOwn(provider.models, modelId) ? [provider.models[modelId]!] : []);
  if (!limits.length) return;
  const contextWindow = limits.every(item => item.contextWindow === limits[0]!.contextWindow) ? limits[0]!.contextWindow : undefined;
  const maxTokens = limits.every(item => item.maxTokens === limits[0]!.maxTokens) ? limits[0]!.maxTokens : undefined;
  return contextWindow === undefined && maxTokens === undefined ? undefined : { contextWindow, maxTokens };
}
