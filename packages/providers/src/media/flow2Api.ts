const rules = [
  {
    type: "input",
    field: "apiKey" as const,
    title: "API Key Flow2API",
    value: "",
    props: { type: "password", showPassword: true, autocomplete: "off" },
  },
  {
    type: "input",
    field: "baseUrl" as const,
    title: "Địa chỉ máy chủ",
    value: "http://127.0.0.1:8000",
    props: { placeholder: "http://127.0.0.1:8000" },
  },
] as const;

const maxBytes = 100 * 1024 * 1024;
const imageRatios: Record<string, string> = { landscape: "16:9", portrait: "9:16", square: "1:1", "four-three": "4:3", "three-four": "3:4" };
const modelFamilies = [
  { id: "gemini-3.1-flash-image", label: "Nano Banana 2.1", type: "image" },
  { id: "gemini-3.1-flash-lite-image", label: "Nano Banana 2 Lite", type: "image" },
  { id: "veo-3.1-fast", label: "Veo 3.1 Fast", type: "video" },
  { id: "veo-3.1-lite", label: "Veo 3.1 Lite", type: "video" },
  { id: "veo-3.1-quality", label: "Veo 3.1 Quality", type: "video" },
  { id: "omni-1.1-flash", label: "Omni 1.1 Flash", type: "video" },
] as const;

export function flowConnection(config: Record<string, unknown>): { baseUrl: string; rootUrl: string; apiKey: string } {
  const apiKey = typeof config.apiKey === "string" ? config.apiKey.trim().replace(/^Bearer(?:\s+|$)/i, "").trim() : "";
  if (!apiKey || /[\r\n]/.test(apiKey)) throw new Error("Vui lòng nhập API Key máy chủ Flow2API hợp lệ");
  if (config.baseUrl !== undefined && typeof config.baseUrl !== "string") throw new Error("Địa chỉ máy chủ Flow2API không hợp lệ");
  let url: URL;
  try { url = new URL(typeof config.baseUrl === "string" && config.baseUrl.trim() ? config.baseUrl.trim() : "http://127.0.0.1:8000"); }
  catch { throw new Error("Địa chỉ máy chủ Flow2API không hợp lệ"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("Địa chỉ Flow2API phải là HTTP(S), không chứa thông tin đăng nhập, truy vấn hoặc đoạn neo");
  }
  url.pathname = url.pathname.replace(/\/+$/, "").replace(/\/v1$/, "");
  const rootUrl = url.href.replace(/\/+$/, "");
  return { baseUrl: `${rootUrl}/v1`, rootUrl, apiKey };
}

export function flowModel(id: string): ProviderModel | undefined {
  const image = /^gemini-3\.1-flash(-lite)?-image-(landscape|portrait|square|four-three|three-four)(?:-(2k|4k))?$/.exec(id);
  if (image) {
    const ratio = imageRatios[image[2]!]!;
    const size = image[3]?.toUpperCase() ?? "auto";
    return {
      id, label: `Gemini 3.1 Flash${image[1] ? " Lite" : ""} · ${ratio} · ${size === "auto" ? "gốc" : size}`,
      type: "image", mode: ["text", "singleImage", "multiReference"], imageRatios: [ratio], imageSizes: [size],
    };
  }
  const veo = /^veo-3\.1-(fast|lite|quality)(?:-(i2v|r2v))?-(4|6|8)s-(landscape|portrait)$/.exec(id);
  if (veo && (veo[2] === "i2v" ? veo[3] !== "8" : veo[2] === "r2v" ? veo[1] !== "quality" && veo[3] === "8" : true)) {
    const ratio = imageRatios[veo[4]!]!;
    return {
      id, label: `Veo 3.1 ${veo[1]} · ${veo[2] ?? "t2v"} · ${veo[3]}s · ${ratio} · auto`, type: "video",
      mode: veo[2] === "i2v" ? ["singleImage", "startEndRequired"] : veo[2] === "r2v" ? [["imageReference:3"]] : ["text"],
      imageRatios: [ratio], durationResolutionMap: [{ duration: [Number(veo[3])], resolution: ["auto"] }],
    };
  }
  const omni = /^omni-1\.1-flash-(4|6|8|10)s-(landscape|portrait)$/.exec(id);
  if (omni || id === "omni-1.1-flash") {
    const duration = Number(omni?.[1] ?? 8);
    const ratio = imageRatios[omni?.[2] ?? "landscape"]!;
    return {
      id, label: `Omni 1.1 Flash · ${duration}s · ${ratio} · auto`, type: "video", mode: ["text", ["imageReference:3"]],
      imageRatios: [ratio], durationResolutionMap: [{ duration: [duration], resolution: ["auto"] }],
    };
  }
  return undefined;
}

function flowVariants(data: unknown): ProviderModel[] {
  if (!data || typeof data !== "object" || Array.isArray(data) || !("data" in data) || !Array.isArray(data.data) || data.data.length > 2000) {
    throw new Error("Flow2API trả danh sách mô hình không hợp lệ; cần đối tượng data chứa tối đa 2000 mô hình");
  }
  const ids = new Set<string>();
  const models: ProviderModel[] = [];
  for (const item of data.data) {
    if (!item || typeof item !== "object" || Array.isArray(item) || typeof item.id !== "string" || !item.id || item.id.length > 256 || /\s|[\u0000-\u001f\u007f]/.test(item.id) || ids.has(item.id)) {
      throw new Error("Flow2API trả ID mô hình không hợp lệ hoặc trùng lặp");
    }
    ids.add(item.id);
    const model = flowModel(item.id);
    if (model) models.push(model);
  }
  return models;
}

function sameMode(first: ImageMode | VideoMode, second: ImageMode | VideoMode): boolean {
  return Array.isArray(first) && Array.isArray(second) ? first.length === second.length && first.every((value, index) => value === second[index]) : first === second;
}

export function flowModels(data: unknown): ProviderModel[] {
  const variants = flowVariants(data);
  const models: ProviderModel[] = [];
  for (const family of modelFamilies) {
    const available = variants.filter(model => model.id === family.id || model.id.startsWith(`${family.id}-`));
    if (!available.length) continue;
    const modeOptions: (ImageMode | VideoMode)[] = family.type === "image" ? ["text", "singleImage", "multiReference"] : ["text", "singleImage", "startEndRequired", ["imageReference:3"]];
    const mode = modeOptions.filter(mode => available.some(model => model.mode?.some(value => sameMode(value, mode))));
    const model: ProviderModel = {
      ...family, mode,
      aliases: available.map(model => model.id).filter(id => id !== family.id),
      imageRatios: Object.values(imageRatios).filter(ratio => available.some(model => model.imageRatios?.includes(ratio))),
    };
    if (family.type === "image") model.imageSizes = ["auto", "2K", "4K"].filter(size => available.some(model => model.imageSizes?.includes(size)));
    else model.durationResolutionMap = mode.map(mode => ({
      mode: mode as VideoMode,
      duration: [...new Set(available.filter(model => model.mode?.some(value => sameMode(value, mode))).flatMap(model => model.durationResolutionMap?.flatMap(option => option.duration) ?? []))].sort((first, second) => first - second),
      resolution: ["auto"],
    }));
    models.push(model);
  }
  return models;
}

export function resolveFlowModel(data: unknown, request: ImageRequest | VideoRequest, mediaType: "image" | "video"): ProviderModel {
  if (typeof request.prompt !== "string" || !request.prompt.trim()) throw new Error("Lời nhắc Flow2API không được để trống");
  const fields = ["model", "prompt", "other", "images", "ratio", ...(mediaType === "image" ? ["mask", "n", "size", "quality", "outputFormat"] : ["mode", "videos", "audios", "firstFrame", "lastFrame", "duration", "resolution", "generateAudio", "watermark"])];
  if (Object.entries(request).some(([key, value]) => value !== undefined && !fields.includes(key))) throw new Error("Yêu cầu chứa tham số mà Flow2API chưa hỗ trợ");
  if (request.other !== undefined && (!request.other || typeof request.other !== "object" || Array.isArray(request.other) || Object.keys(request.other).length)) throw new Error("Flow2API chưa hỗ trợ tham số bổ sung");
  if (request.images !== undefined && !Array.isArray(request.images)) throw new Error("Danh sách ảnh tham chiếu Flow2API không hợp lệ");
  const family = modelFamilies.find(model => model.id === request.model && model.type === mediaType);
  let available = flowVariants(data).filter(model => model.type === mediaType && (family ? model.id === family.id || model.id.startsWith(`${family.id}-`) : model.id === request.model));
  if (!available.length) throw new Error("Mô hình đã chọn không được hỗ trợ hoặc không có trong danh sách hiện tại của máy chủ Flow2API; hãy lấy lại danh sách");
  if (request.ratio !== undefined) available = available.filter(model => model.imageRatios?.includes(request.ratio!));
  if (mediaType === "image") {
    const image = request as ImageRequest;
    if (image.n !== undefined && image.n !== 1) throw new Error("Flow2API chỉ tạo một ảnh mỗi yêu cầu; hãy đặt n=1");
    if (image.mask !== undefined || image.quality !== undefined || image.outputFormat !== undefined) throw new Error("Flow2API không hỗ trợ mặt nạ, chọn chất lượng hoặc định dạng đầu ra");
    if (image.size !== undefined) available = available.filter(model => model.imageSizes?.includes(image.size!));
  } else {
    const video = request as VideoRequest;
    if (family) {
      const hasFrames = video.firstFrame !== undefined || video.lastFrame !== undefined;
      const referenceMode: VideoMode = ["imageReference:3"];
      let mode = video.mode;
      if (mode === undefined) {
        if (hasFrames) mode = video.lastFrame !== undefined ? "startEndRequired" : "singleImage";
        else if (video.images?.length) mode = available.some(model => model.mode?.some(value => sameMode(value, referenceMode))) ? referenceMode : "singleImage";
        else mode = "text";
      }
      available = available.filter(model => model.mode?.some(value => sameMode(value, mode)));
    }
    if (video.duration !== undefined) available = available.filter(model => model.durationResolutionMap?.some(option => option.duration.includes(video.duration!)));
    if (video.resolution !== undefined && video.resolution !== "auto") throw new Error("Mô hình Flow2API này chỉ nhận độ phân giải auto");
  }
  if (!available.length) throw new Error("Mô hình Flow2API không có biến thể phù hợp với chế độ, tỷ lệ, kích thước hoặc thời lượng đã chọn");
  const ratios = Object.values(imageRatios);
  const sizes = ["auto", "2K", "4K"];
  available.sort((first, second) => ratios.indexOf(first.imageRatios![0]!) - ratios.indexOf(second.imageRatios![0]!) || (mediaType === "image" ? sizes.indexOf(first.imageSizes![0]!) - sizes.indexOf(second.imageSizes![0]!) : first.durationResolutionMap![0]!.duration[0]! - second.durationResolutionMap![0]!.duration[0]!));
  const model = available[0]!;
  if (mediaType === "video") videoImages({ ...request as VideoRequest, model: model.id }, model);
  return model;
}

async function readBytes(response: Response, signal: AbortSignal, limit: number): Promise<Uint8Array> {
  if (Number(response.headers.get("content-length")) > limit) {
    await response.body?.cancel().catch(() => {});
    throw new Error("Dữ liệu Flow2API vượt giới hạn dung lượng cho phép (tệp tối đa 100 MiB)");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Flow2API trả nội dung rỗng");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error("Dữ liệu Flow2API vượt giới hạn dung lượng cho phép (tệp tối đa 100 MiB)");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  signal.throwIfAborted();
  if (!size) throw new Error("Flow2API trả nội dung rỗng");
  return Buffer.concat(chunks, size);
}

async function readJson(response: Response, signal: AbortSignal, limit = 2 * 1024 * 1024): Promise<Record<string, unknown>> {
  const bytes = await readBytes(response, signal, limit);
  let data: unknown;
  try { data = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new Error("Flow2API trả JSON không hợp lệ"); }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Flow2API trả JSON không hợp lệ");
  return data as Record<string, unknown>;
}

export async function checkFlowHealth(fetcher: typeof fetch, rootUrl: string, signal: AbortSignal): Promise<void> {
  signal.throwIfAborted();
  const response = await fetcher(`${rootUrl}/health`, { signal, redirect: "error" }).catch(() => {
    throw new Error("Không kết nối được Flow2API; hãy kiểm tra địa chỉ máy chủ và mạng");
  });
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    throw new Error(`Kiểm tra trạng thái Flow2API thất bại (HTTP ${response.status})`);
  }
  const health = await readJson(response, signal);
  if (health.backend_running === false) throw new Error("Máy chủ Flow2API chưa sẵn sàng hoạt động");
  if (health.has_active_tokens === false) throw new Error("Flow2API chưa có tài khoản Flow hoạt động; nhờ quản trị viên cấu hình tài khoản và CAPTCHA");
  if (typeof health.backend_running !== "boolean" || typeof health.has_active_tokens !== "boolean") throw new Error("Flow2API trả trạng thái sức khỏe không hợp lệ");
}

function errorDetail(context: ProviderContext, data: Record<string, unknown>): string {
  return context.tool.errorMessage({ error: data.error, detail: data.detail, message: data.message })
    .replace(/data:[^,\s]+,[^\s"']+|[A-Za-z0-9+/]{80,}={0,2}/g, "[đã ẩn nội dung đa phương tiện]").slice(0, 600);
}

async function apiJson(context: ProviderContext, url: string, apiKey: string, signal: AbortSignal, body?: string): Promise<Record<string, unknown>> {
  const response = await context.tool.fetch(url, {
    method: body === undefined ? "GET" : "POST", redirect: "error", signal,
    headers: { Authorization: `Bearer ${apiKey}`, "Accept-Language": "vi-VN", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    body,
  }).catch(() => { throw new Error("Không kết nối được Flow2API; yêu cầu sẽ không tự gửi lại"); });
  let bytes: Uint8Array;
  try { bytes = await readBytes(response, signal, response.ok && body !== undefined ? Math.ceil(maxBytes / 3) * 4 + 1024 * 1024 : 2 * 1024 * 1024); }
  catch (error) {
    if (!response.ok && !signal.aborted) throw new Error(`Yêu cầu Flow2API thất bại (HTTP ${response.status}); không đọc được nội dung lỗi`);
    throw error;
  }
  const text = new TextDecoder().decode(bytes);
  let parsed: unknown;
  try { parsed = JSON.parse(text); }
  catch { parsed = undefined; }
  const result = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : undefined;
  if (!response.ok) {
    const detail = errorDetail(context, result ?? { message: text });
    throw new Error(`Yêu cầu Flow2API thất bại (HTTP ${response.status})${detail ? `: ${detail}` : "; hãy kiểm tra cấu hình, quyền truy cập và trạng thái máy chủ"}`);
  }
  if (!result) throw new Error("Flow2API trả JSON không hợp lệ");
  if (result.error) {
    const detail = errorDetail(context, result);
    throw new Error(`Yêu cầu Flow2API thất bại (HTTP ${response.status})${detail ? `: ${detail}` : "; hãy kiểm tra cấu hình, quyền truy cập và trạng thái máy chủ"}`);
  }
  return result;
}

function decodeData(value: string, mediaType: "image" | "video"): { data: Uint8Array; mimeType: string } {
  const match = /^data:((?:image|video)\/[a-z0-9.+-]+);base64,([\s\S]+)$/i.exec(value);
  if (!match || !match[1]!.toLowerCase().startsWith(`${mediaType}/`)) throw new Error("Flow2API nhận hoặc trả URI dữ liệu không hợp lệ");
  const encoded = match[2]!.replace(/\s/g, "");
  if (encoded.length > Math.ceil(maxBytes / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 === 1 || (encoded.includes("=") && encoded.length % 4 !== 0)) {
    throw new Error("Dữ liệu base64 Flow2API không hợp lệ hoặc vượt 100 MiB");
  }
  const data = Buffer.from(encoded, "base64");
  if (!data.byteLength || data.byteLength > maxBytes || data.toString("base64").replace(/=+$/, "") !== encoded.replace(/=+$/, "")) throw new Error("Dữ liệu base64 Flow2API không hợp lệ hoặc vượt 100 MiB");
  return { data, mimeType: match[1]!.toLowerCase() };
}

async function imageUrl(context: ProviderContext, input: MediaInput, signal: AbortSignal): Promise<string> {
  signal.throwIfAborted();
  if (!input || typeof input !== "object") throw new Error("Ảnh tham chiếu Flow2API không hợp lệ");
  if (input.type === "url" && typeof input.url === "string" && !input.url.startsWith("data:")) {
    let url: URL;
    try { url = new URL(input.url); }
    catch { throw new Error("Ảnh tham chiếu phải là URL HTTPS hoặc URI dữ liệu ảnh"); }
    if (url.protocol !== "https:" || url.username || url.password) throw new Error("Ảnh tham chiếu phải là URL HTTPS không chứa thông tin đăng nhập");
    return url.href;
  }
  let data: Uint8Array;
  if (input.type === "url" && typeof input.url === "string") data = decodeData(input.url, "image").data;
  else if (input.type === "base64" && typeof input.data === "string") data = decodeData(input.data.startsWith("data:") ? input.data : `data:${input.mimeType};base64,${input.data}`, "image").data;
  else if (input.type === "binary" && ArrayBuffer.isView(input.data) && input.data.BYTES_PER_ELEMENT === 1) data = input.data;
  else throw new Error("Ảnh tham chiếu Flow2API không hợp lệ");
  if (!data.byteLength || data.byteLength > maxBytes) throw new Error("Ảnh tham chiếu phải có nội dung và không vượt 100 MiB");
  const info = await context.tool.media.inspectImage({ type: "binary", data, mimeType: "" }).catch(() => { throw new Error("Ảnh tham chiếu không phải tệp ảnh hợp lệ"); });
  signal.throwIfAborted();
  const format = info.format.toLowerCase() === "jpg" ? "jpeg" : info.format.toLowerCase();
  if (!/^[a-z0-9.+-]+$/.test(format) || format === "svg") throw new Error("Định dạng ảnh tham chiếu Flow2API không được hỗ trợ");
  return `data:image/${format};base64,${Buffer.from(data).toString("base64")}`;
}

function videoImages(request: VideoRequest, model: ProviderModel): MediaInput[] {
  if ((request.videos !== undefined && (!Array.isArray(request.videos) || request.videos.length)) || (request.audios !== undefined && (!Array.isArray(request.audios) || request.audios.length))) throw new Error("Flow2API chưa hỗ trợ video hoặc âm thanh tham chiếu");
  if (request.generateAudio !== undefined || request.watermark !== undefined) throw new Error("Flow2API không hỗ trợ điều khiển âm thanh hoặc watermark");
  if (request.duration !== undefined && request.duration !== model.durationResolutionMap![0]!.duration[0]) throw new Error("Thời lượng được cố định trong ID mô hình Flow2API; hãy chọn đúng biến thể thời lượng");
  if (request.resolution !== undefined && request.resolution !== "auto") throw new Error("Mô hình Flow2API này chỉ nhận độ phân giải auto");
  const images = request.images ?? [];
  const hasFrames = request.firstFrame !== undefined || request.lastFrame !== undefined;
  if (hasFrames && images.length) throw new Error("Không trộn ảnh tham chiếu với khung đầu/cuối trong yêu cầu Flow2API");
  const mode = request.mode;
  if (request.model.includes("-i2v-")) {
    const selectedMode = mode ?? (request.lastFrame !== undefined ? "startEndRequired" : "singleImage");
    if (selectedMode === "startEndRequired") {
      if (!request.firstFrame || !request.lastFrame || images.length) throw new Error("I2V hai khung cần firstFrame và lastFrame theo đúng thứ tự");
      return [request.firstFrame, request.lastFrame];
    }
    if (selectedMode !== "singleImage" || request.lastFrame !== undefined || (hasFrames ? !request.firstFrame : images.length !== 1)) throw new Error("I2V cần một ảnh đầu; hai ảnh phải dùng firstFrame và lastFrame với chế độ hai khung");
    return request.firstFrame ? [request.firstFrame] : images;
  }
  if (hasFrames) throw new Error("Chỉ mô hình I2V Flow2API nhận khung đầu/cuối; hãy chọn đúng biến thể I2V");
  const omni = request.model.startsWith("omni-");
  if (request.model.includes("-r2v-") || omni) {
    if (images.length > 3 || (!omni && !images.length)) throw new Error(omni ? "Omni Flow2API nhận từ 0 đến 3 ảnh tham chiếu" : "R2V Flow2API cần từ 1 đến 3 ảnh tham chiếu");
    const referenceMode = Array.isArray(mode) && mode.length === 1 && mode[0] === "imageReference:3";
    if (referenceMode && !images.length) throw new Error("Chế độ tham chiếu Flow2API cần từ 1 đến 3 ảnh; hãy chọn văn bản nếu không dùng ảnh");
    if (mode !== undefined && !(referenceMode || (omni && mode === "text" && !images.length))) throw new Error("Chế độ không phù hợp với mô hình tham chiếu Flow2API đã chọn");
    return images;
  }
  if (images.length || (mode !== undefined && mode !== "text")) throw new Error("Mô hình T2V Flow2API chỉ nhận văn bản; hãy chọn I2V hoặc R2V để dùng ảnh");
  return [];
}

function resultUrl(content: unknown, mediaType: "image" | "video"): string {
  if (typeof content !== "string" || !content.trim()) throw new Error("Flow2API không trả nội dung đa phương tiện");
  if (mediaType === "image") {
    const image = /!\[[^\]\r\n]*\]\(\s*(?:<([^>\r\n]+)>|([^\s]+?)(?:\s+["'][^\r\n]*["'])?)\s*\)/.exec(content);
    if (image) return (image[1] ?? image[2])!;
  } else {
    // ACT: Chỉ đọc thuộc tính URL; không chạy HTML do máy chủ trả về.
    const video = /<video\b[^>]*>[\s\S]*?<\/video\s*>/i.exec(content)?.[0];
    if (video) {
      const tag = /^<video\b[^>]*>/i.exec(video)![0];
      const source = /<source\b[^>]*>/i.exec(video)?.[0];
      const src = /\ssrc\s*=\s*(["'])(.*?)\1/i.exec(tag) ?? (source ? /\ssrc\s*=\s*(["'])(.*?)\1/i.exec(source) : null);
      if (src?.[2]) return src[2].replace(/&amp;/g, "&");
    }
  }
  throw new Error(mediaType === "image" ? "Flow2API không trả Markdown ảnh hợp lệ" : "Flow2API không trả URL video hợp lệ");
}

async function mediaAsset(context: ProviderContext, value: string, mediaType: "image" | "video", rootUrl: string, signal: AbortSignal): Promise<MediaAsset> {
  let data: Uint8Array;
  let mimeType: string;
  if (value.startsWith("data:")) ({ data, mimeType } = decodeData(value, mediaType));
  else {
    let url: URL;
    try { url = new URL(value, `${rootUrl}/`); }
    catch { throw new Error("Flow2API trả địa chỉ đa phương tiện không hợp lệ"); }
    const absolute = /^https?:\/\//i.test(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || (!absolute && (url.origin !== new URL(rootUrl).origin || !url.pathname.startsWith(`${new URL(rootUrl).pathname.replace(/\/$/, "")}/tmp/`)))) {
      throw new Error("Flow2API chỉ nhận kết quả HTTP(S) hoặc đường dẫn bộ nhớ đệm tmp của máy chủ");
    }
    // ACT: Không chuyển API Key sang địa chỉ tải; dùng chung thời hạn và không theo chuyển hướng.
    const response = await context.tool.fetch(url, { signal, redirect: "error" }).catch(() => { throw new Error("Tải kết quả Flow2API thất bại; hãy kiểm tra địa chỉ và kết nối mạng"); });
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw new Error(`Tải kết quả Flow2API thất bại (HTTP ${response.status})`);
    }
    mimeType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
    if (mimeType.includes("html") || mimeType === "application/json" || mimeType === "text/plain") {
      await response.body?.cancel().catch(() => {});
      throw new Error("Flow2API trả trang văn bản thay vì tệp đa phương tiện");
    }
    data = await readBytes(response, signal, maxBytes);
  }
  signal.throwIfAborted();
  if (mediaType === "image") {
    const { format } = await context.tool.media.inspectImage({ type: "binary", data, mimeType }).catch(() => { throw new Error("Kết quả Flow2API không phải tệp ảnh hợp lệ"); });
    if (!/^[a-z0-9.+-]+$/i.test(format) || format.toLowerCase() === "svg") throw new Error("Định dạng ảnh trả về không được hỗ trợ");
    mimeType = `image/${format.toLowerCase() === "jpg" ? "jpeg" : format.toLowerCase()}`;
  } else {
    const header = Buffer.from(data.subarray(0, 16));
    if (mimeType.startsWith("image/") || mimeType.startsWith("audio/")) throw new Error("Flow2API trả sai loại tệp video");
    if (header.length >= 12 && header.toString("ascii", 4, 8) === "ftyp" && !/^(?:avif|avis|heic|heix|hevc|hevx|mif1|msf1|M4A |M4B )$/.test(header.toString("ascii", 8, 12))) mimeType = "video/mp4";
    else if (header.length >= 4 && header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3) mimeType = "video/webm";
    else throw new Error("Kết quả Flow2API không có định dạng video MP4/WebM hợp lệ");
  }
  signal.throwIfAborted();
  return { mediaType, type: "binary", data, mimeType };
}

async function generate(context: ProviderContext, request: ImageRequest | VideoRequest, mediaType: "image" | "video"): Promise<MediaAsset[]> {
  const connection = flowConnection(context.config);
  const startedAt = Date.now();
  let timeout = 35 * 60_000;
  let signal = AbortSignal.any([AbortSignal.timeout(timeout), ...(context.signal ? [context.signal] : [])]);
  try {
    signal.throwIfAborted();
    const healthSignal = AbortSignal.any([signal, AbortSignal.timeout(30_000)]);
    await checkFlowHealth(context.tool.fetch, connection.rootUrl, healthSignal);
    const catalog = await apiJson(context, `${connection.baseUrl}/models`, connection.apiKey, healthSignal);
    const model = resolveFlowModel(catalog, request, mediaType);
    if (mediaType === "image" && model.imageSizes![0] === "auto") {
      timeout = 6 * 60_000;
      signal = AbortSignal.any([signal, AbortSignal.timeout(Math.max(1, timeout - (Date.now() - startedAt)))]);
    }
    const images = mediaType === "image" ? request.images ?? [] : videoImages({ ...request as VideoRequest, model: model.id }, model);
    const content: ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[] = [{ type: "text", text: request.prompt }];
    let payloadBytes = Buffer.byteLength(request.prompt);
    for (const image of images) {
      const url = await imageUrl(context, image, signal);
      payloadBytes += Buffer.byteLength(url);
      if (payloadBytes > maxBytes) throw new Error("Yêu cầu Flow2API vượt giới hạn 100 MiB; hãy giảm dung lượng ảnh tham chiếu");
      content.push({ type: "image_url", image_url: { url } });
    }
    const body = JSON.stringify({ model: model.id, messages: [{ role: "user", content }], stream: false });
    if (Buffer.byteLength(body) > maxBytes) throw new Error("Yêu cầu Flow2API vượt giới hạn 100 MiB; hãy giảm dung lượng ảnh tham chiếu");
    // ACT: Chỉ gửi ID biến thể thực có trong danh mục; một POST, không tự thử lại.
    const result = await apiJson(context, `${connection.baseUrl}/chat/completions`, connection.apiKey, signal, body);
    const choices = result.choices;
    const first = Array.isArray(choices) ? choices[0] : undefined;
    const message = first && typeof first === "object" ? first.message : undefined;
    const value = resultUrl(message && typeof message === "object" ? message.content : undefined, mediaType);
    return [await mediaAsset(context, value, mediaType, connection.rootUrl, signal)];
  } catch (error) {
    if (signal.aborted) throw new Error(context.signal?.aborted ? "Đã dừng chờ Flow2API; tác vụ trên máy chủ có thể vẫn đang chạy" : `Đã hết thời gian chờ Flow2API (${timeout / 60_000} phút); tác vụ trên máy chủ có thể vẫn đang chạy, hãy kiểm tra trước khi gửi lại`);
    throw error;
  }
}

export default {
  id: "flow2Api",
  label: "Flow2API",
  icon: "",
  version: "1.1.0",
  modelsUrl: "http://127.0.0.1:8000/v1/models",
  readme: "## Flow2API\n\nĐiền API Key máy chủ và địa chỉ gốc, mặc định `http://127.0.0.1:8000`; địa chỉ có `/v1` cũng được chấp nhận. Lấy lại mô hình để hiển thị tối đa 6 nhóm: Nano Banana 2.1, Nano Banana 2 Lite, Veo 3.1 Fast/Lite/Quality và Omni 1.1 Flash. Tỷ lệ, kích thước, chế độ và thời lượng chỉ lấy từ biến thể thực trong `/v1/models`; ID cụ thể cũ vẫn dùng được. Máy chủ cần tài khoản Flow hoạt động và CAPTCHA, kiểm tra qua `/health`.\n\nChọn tỷ lệ và kích thước ảnh (`auto`, `2K`, `4K` theo danh mục). Video chỉ nhận độ phân giải `auto`: Veo văn bản 4/6/8 giây, một ảnh hoặc hai khung 4/6 giây, tham chiếu Fast/Lite 8 giây; Omni 4/6/8/10 giây, văn bản hoặc 1–3 ảnh tham chiếu. Thời lượng là giá trị khai báo, không bảo đảm số giây đầu ra chính xác. Nếu không chọn tham số, dùng lựa chọn thực có trong danh mục.\n\nẢnh dùng URL HTTPS mà máy chủ truy cập được hoặc dữ liệu ảnh thực. Hai khung cần firstFrame và lastFrame đúng thứ tự; không trộn với images. Khi bỏ mode, firstFrame/lastFrame chọn I2V; images chọn tham chiếu nếu hỗ trợ, nếu không chỉ nhận một ảnh đầu. Không tự hiểu hai ảnh tham chiếu là hai khung. Tổng yêu cầu và mỗi tệp tối đa 100 MiB; danh mục ảnh không công bố giới hạn số ảnh. Không hỗ trợ mặt nạ, n khác 1, chất lượng/định dạng đầu ra, âm thanh/video tham chiếu, điều khiển âm thanh, watermark, nối dài hoặc tham số bổ sung.\n\nGửi một `/v1/chat/completions` với `stream: false`, không tự gửi lại. Thời hạn chung cho tạo và tải: ảnh gốc 6 phút, ảnh phóng và video 35 phút. Lưu kết quả trước khi URL hết hạn. Dừng chờ hoặc hết hạn không bảo đảm máy chủ đã hủy; kiểm tra kết quả/log trước khi gửi lại.",
  rules,
  models: [],
  async generateImage(request: ImageRequest): Promise<MediaAsset[]> { return generate(this, request, "image"); },
  async generateVideo(request: VideoRequest): Promise<MediaAsset[]> { return generate(this, request, "video"); },
} satisfies ProviderDefinition<typeof rules>;
