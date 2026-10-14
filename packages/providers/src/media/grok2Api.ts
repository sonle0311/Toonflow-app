const rules = [
  {
    type: "input",
    field: "apiKey" as const,
    title: "Client API Key",
    value: "",
    props: { type: "password", showPassword: true, autocomplete: "off" },
  },
  {
    type: "input",
    field: "baseUrl" as const,
    title: "API Base URL",
    value: "http://127.0.0.1:8000/v1",
    props: { placeholder: "http://127.0.0.1:8000/v1" },
  },
] as const;

function connection(context: ProviderContext<ProviderConfig<typeof rules>>) {
  const apiKey = context.config.apiKey.trim().replace(/^Bearer\s+/i, "");
  if (!apiKey) throw new Error("请填写 Grok2API Client API Key");
  const url = new URL(context.config.baseUrl.trim() || "http://127.0.0.1:8000/v1");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("Grok2API 地址必须是不含凭据、查询参数或片段的 HTTP API Base URL");
  }
  url.pathname = url.pathname.replace(/\/+$/, "");
  if (!url.pathname) url.pathname = "/v1";
  return { baseUrl: url.href.replace(/\/+$/, ""), origin: url.origin, apiKey };
}

async function requestJson(context: ProviderContext, baseUrl: string, apiKey: string, path: string, signal: AbortSignal, body?: unknown) {
  const response = await context.tool.fetch(`${baseUrl}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${apiKey}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.any([signal, AbortSignal.timeout(180_000)]),
    redirect: "error",
  });
  if (!response.ok) {
    const detail = context.tool.errorMessage(await response.text());
    throw new Error(`Grok2API HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  const result: unknown = await response.json();
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("Grok2API 返回了无效的 JSON 响应");
  return result as Record<string, unknown>;
}

function imageUrl(input: MediaInput) {
  if (input.type === "url") return input.url;
  const data = input.type === "binary" ? Buffer.from(input.data).toString("base64") : input.data;
  return data.startsWith("data:") ? data : `data:${input.mimeType};base64,${data}`;
}

function wait(signal: AbortSignal) {
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, 5000);
    signal.addEventListener("abort", abort, { once: true });
  });
}

async function mediaAsset(context: ProviderContext, value: unknown, mediaType: "image" | "video", baseUrl: string, apiKey: string, signal: AbortSignal, taskId?: string): Promise<MediaAsset> {
  if (typeof value !== "string" || !value.trim()) throw new Error("Grok2API 未返回媒体地址");
  const url = new URL(value, `${new URL(baseUrl).origin}/`);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Grok2API 返回了无效的媒体地址");
  if (mediaType !== "video" || !/\/videos\/[^/]+\/content$/.test(url.pathname)) return { mediaType, type: "url", url: url.href };
  if (!taskId) throw new Error("Grok2API 下载视频缺少 request_id");
  // ACT: content 接口需要 Client key；由后端下载，避免浏览器或公开资源 URL 携带密钥。
  // 网关公开地址可能与连接地址不同；密钥仅发送到用户配置的网关，按原任务 ID 获取内容。
  const response = await context.tool.fetch(`${baseUrl}/videos/${encodeURIComponent(taskId)}/content`, { headers: { Authorization: `Bearer ${apiKey}` }, signal, redirect: "error" });
  if (!response.ok) throw new Error(`Grok2API 下载媒体失败：HTTP ${response.status}`);
  const maxBytes = 100 * 1024 * 1024;
  if (Number(response.headers.get("content-length")) > maxBytes) { await response.body?.cancel(); throw new Error("生成文件不能超过 100 MB"); }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Grok2API 返回了空媒体内容");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error("生成文件不能超过 100 MB");
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  if (!size) throw new Error("Grok2API 返回了空媒体内容");
  return { mediaType, type: "binary", data: Buffer.concat(chunks, size), mimeType: response.headers.get("content-type")?.split(";")[0] || "video/mp4" };
}

export default {
  id: "grok2Api",
  label: "Grok2API",
  icon: "",
  version: "1.0.0",
  modelsUrl: "http://127.0.0.1:8000/v1/models",
  readme: "## Grok2API\n\n支持 Grok Web Heavy 的图片生成、单图编辑和文生视频。网关 commit 05b0c53e 的 Web 视频实现不接受参考图；有权限的 Build/Console 图生视频路由可在模型编辑器中单独配置。请填写网关 **Client API Key**，并获取模型以核对当前密钥权限。自定义 Model Routes 使用准确 ID。\n\n视频使用 `/v1/videos/generations`，等待任务完成后保存结果。生成失败或等待超时不会自动重新提交任务；超时错误会保留 request_id，供网关中查询。音频、视频编辑和延长需要 Console，本适配器未启用。",
  rules,
  models: [
    { id: "grok-imagine-image-lite", label: "Grok Imagine Image Lite", type: "image", mode: ["text"], imageRatios: ["1:1", "16:9", "9:16"] },
    { id: "grok-imagine-image", label: "Grok Imagine Image", type: "image", mode: ["text"], imageRatios: ["1:1", "16:9", "9:16"] },
    { id: "grok-imagine-image-2.0", label: "Grok Imagine Image 2.0", type: "image", mode: ["text"], imageRatios: ["1:1", "16:9", "9:16"] },
    { id: "grok-imagine-image-edit", label: "Grok Imagine Image Edit", type: "image", mode: ["singleImage"] },
    { id: "grok-imagine-video", label: "Grok Imagine Video", type: "video", mode: ["text"], durationResolutionMap: [{ duration: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["720p"] }] },
  ] satisfies ProviderModel[],
  async generateImage(request: ImageRequest): Promise<MediaAsset[]> {
    const { baseUrl, apiKey } = connection(this);
    const images = request.images ?? [];
    if (images.length > 1 || request.mask) throw new Error("Grok2API 图片编辑仅支持单张参考图，不支持蒙版");
    if (request.n !== undefined && request.n !== 1) throw new Error("Grok2API 每次生成一张图片，请设置 n=1");
    const signal = AbortSignal.any([AbortSignal.timeout(180_000), ...(this.signal ? [this.signal] : [])]);
    const result = await requestJson(this, baseUrl, apiKey, images.length ? "/images/edits" : "/images/generations", signal, {
      model: request.model, prompt: request.prompt, n: 1, response_format: "b64_json",
      ...(images.length ? { image: { url: imageUrl(images[0]!) } } : { aspect_ratio: request.ratio ?? "1:1" }),
    });
    if (!Array.isArray(result.data) || !result.data.length) throw new Error("Grok2API 未返回生成图片");
    return Promise.all(result.data.map(async (item: { b64_json?: unknown; url?: unknown }): Promise<MediaAsset> => {
      if (typeof item?.b64_json === "string" && item.b64_json.trim()) return { mediaType: "image", type: "base64", data: item.b64_json, mimeType: "image/png" };
      return mediaAsset(this, item?.url, "image", baseUrl, apiKey, signal);
    }));
  },
  async generateVideo(request: VideoRequest): Promise<MediaAsset[]> {
    const { baseUrl, apiKey } = connection(this);
    const images = [...(request.images ?? []), ...(request.firstFrame ? [request.firstFrame] : [])];
    if (images.length > 1 || request.lastFrame || request.videos?.length || request.audios?.length) throw new Error("Grok2API 视频仅支持文本或单张参考图");
    const duration = request.duration ?? 8;
    if (!Number.isInteger(duration) || duration < 1 || duration > 15) throw new Error("Grok2API 视频时长必须为 1 到 15 秒的整数");
    const signal = AbortSignal.any([AbortSignal.timeout(10 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const job = await requestJson(this, baseUrl, apiKey, "/videos/generations", signal, {
      model: request.model, prompt: request.prompt, duration, aspect_ratio: request.ratio ?? "16:9", resolution: request.resolution ?? "720p",
      ...(images.length ? { image: { url: imageUrl(images[0]!) } } : {}),
    });
    if (typeof job.request_id !== "string" || !job.request_id.trim()) throw new Error("Grok2API 未返回 request_id");
    const taskId = job.request_id;
    try {
      while (true) {
        await wait(signal);
        const result = await requestJson(this, baseUrl, apiKey, `/videos/${encodeURIComponent(taskId)}`, signal);
        if (result.status === "failed") throw new Error(this.tool.errorMessage(result.error) || "Grok2API 视频生成失败");
        if (result.status === "done") {
          const video = result.video as { url?: unknown } | undefined;
          return [await mediaAsset(this, video?.url ?? `${baseUrl}/videos/${encodeURIComponent(taskId)}/content`, "video", baseUrl, apiKey, signal, taskId)];
        }
        if (result.status !== "pending") throw new Error("Grok2API 返回了未知的视频任务状态");
      }
    } catch (error) {
      if (this.signal?.aborted) throw error;
      const detail = signal.aborted ? "等待超时；请查询原任务，不要重复提交" : error instanceof Error ? error.message : "视频生成失败";
      throw new Error(`Grok2API ${detail} (request_id: ${taskId})`);
    }
  },
} satisfies ProviderDefinition<typeof rules>;
