const rules = [
  {
    type: "input",
    field: "apiKey" as const,
    title: "API Key",
    value: "",
    props: { type: "password", showPassword: true, autocomplete: "off" },
  },
  {
    type: "input",
    field: "baseUrl" as const,
    title: "API Base URL",
    value: "https://chat.sonlt.dev/v1",
    props: { placeholder: "https://chat.sonlt.dev/v1" },
  },
] as const;

function connection(context: ProviderContext<ProviderConfig<typeof rules>>) {
  const apiKey = typeof context.config.apiKey === "string" ? context.config.apiKey.trim().replace(/^Bearer(?:\s+|$)/i, "").trim() : "";
  if (!apiKey) throw new Error("请填写 ChatGPT2API API Key");
  let url: URL;
  try { url = new URL(context.config.baseUrl.trim() || "https://chat.sonlt.dev/v1"); }
  catch { throw new Error("ChatGPT2API API Base URL 无效"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error("ChatGPT2API 地址必须是不含凭据、查询参数或片段的 HTTP API Base URL");
  }
  url.pathname = url.pathname.replace(/\/+$/, "") || "/v1";
  return { baseUrl: url.href.replace(/\/+$/, ""), apiKey };
}

async function downloadImage(context: ProviderContext, value: unknown, signal: AbortSignal): Promise<MediaAsset> {
  if (typeof value !== "string" || !value.trim()) throw new Error("ChatGPT2API 未返回图片内容或地址");
  let url: URL;
  try { url = new URL(value); }
  catch { throw new Error("ChatGPT2API 返回了无效的图片地址"); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("ChatGPT2API 返回了无效的图片地址");
  // ACT: 使用服务返回的地址下载，凭据只发给 API；下载与生成共用总超时。
  const response = await context.tool.fetch(url, { signal, redirect: "error" }).catch(() => {
    throw new Error("ChatGPT2API 图片下载失败，请检查网络或结果地址是否有效");
  });
  if (!response.ok) throw new Error(`ChatGPT2API 图片下载失败（HTTP ${response.status}）`);
  const maxBytes = 100 * 1024 * 1024;
  if (Number(response.headers.get("content-length")) > maxBytes) {
    await response.body?.cancel().catch(() => {});
    throw new Error("生成文件不能超过 100 MB");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("ChatGPT2API 返回了空图片内容");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const { done, value } = await reader.read().catch(() => { throw new Error("ChatGPT2API 图片下载中断"); });
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error("生成文件不能超过 100 MB");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  if (!size) throw new Error("ChatGPT2API 返回了空图片内容");
  return { mediaType: "image", type: "binary", data: Buffer.concat(chunks, size), mimeType: "" };
}

export default {
  id: "chatgpt2Api",
  label: "ChatGPT2API",
  icon: "",
  version: "1.0.0",
  modelsUrl: "https://chat.sonlt.dev/v1/models",
  readme: "## ChatGPT2API\n\nTạo ảnh từ văn bản bằng `gpt-image-2`. Điền API Key riêng do quản trị viên cấp; khóa Grok2API không được dùng lại. API Base URL mặc định: `https://chat.sonlt.dev/v1`. Có thể nhập URL dịch vụ gốc; ứng dụng chỉ thêm `/v1` khi đường dẫn trống.\n\nChỉ hỗ trợ tạo ảnh, chưa hỗ trợ ảnh tham chiếu, chỉnh sửa, mặt nạ hay chọn định dạng đầu ra. Kích thước mặc định `auto`; API không công bố danh sách kích thước được hỗ trợ. Tỷ lệ 1:1, 16:9 hoặc 9:16 được thêm vào lời nhắc, không bảo đảm tỷ lệ hoặc số pixel chính xác. Chỉ gửi kích thước `WxH` khi được cấu hình rõ ràng; không tự đổi 2K/4K. Chất lượng `auto`, tối đa 4 ảnh mỗi yêu cầu.\n\nTổng thời gian chờ và tải ảnh tối đa 180 giây; không tự thử lại. Dừng chờ hoặc hết thời gian không bảo đảm tác vụ trên máy chủ đã hủy. Không nhập access_token/refresh_token của tài khoản ChatGPT.",
  rules,
  models: [
    { id: "gpt-image-2", label: "GPT Image 2", type: "image", mode: ["text"], imageSizes: ["auto"], imageRatios: ["1:1", "16:9", "9:16"] },
  ] satisfies ProviderModel[],
  async generateImage(request: ImageRequest): Promise<MediaAsset[]> {
    const { baseUrl, apiKey } = connection(this);
    if (typeof request.prompt !== "string" || !request.prompt.trim()) throw new Error("ChatGPT2API 图片提示词不能为空");
    if (typeof request.model !== "string" || !request.model.trim()) throw new Error("ChatGPT2API 图片模型不能为空");
    if (request.images?.length || request.mask || request.outputFormat !== undefined) throw new Error("ChatGPT2API 仅支持文生图，不支持参考图、蒙版或指定输出格式");
    if (Object.keys(request.other ?? {}).length) throw new Error("ChatGPT2API 暂不支持额外生成参数");
    const n = request.n ?? 1;
    if (!Number.isInteger(n) || n < 1 || n > 4) throw new Error("ChatGPT2API 图片数量必须为 1 到 4 的整数");
    if (request.quality !== undefined && request.quality !== "auto") throw new Error("ChatGPT2API 当前仅支持 auto 画质");
    const size = request.size?.trim() ?? "auto";
    if (size !== "auto" && (!/^[1-9]\d*x[1-9]\d*$/.test(size) || size.split("x").some(value => !Number.isSafeInteger(Number(value))))) {
      throw new Error("ChatGPT2API 尺寸必须为 auto 或显式的正整数 WxH，不支持自动转换 2K/4K");
    }
    if (request.ratio !== undefined && !/^[1-9]\d{0,3}:[1-9]\d{0,3}$/.test(request.ratio)) throw new Error("ChatGPT2API 图片宽高比无效");
    // ACT: 接口没有 ratio 参数；比例仅作为构图要求，不能保证精确尺寸。
    const prompt = request.ratio ? `${request.prompt}\n\nRequested image aspect ratio: ${request.ratio}.` : request.prompt;
    const signal = AbortSignal.any([AbortSignal.timeout(180_000), ...(this.signal ? [this.signal] : [])]);
    try {
      signal.throwIfAborted();
      const response = await this.tool.fetch(`${baseUrl}/images/generations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Accept-Language": "vi-VN", "Content-Type": "application/json" },
        body: JSON.stringify({ model: request.model.trim(), prompt, n, quality: "auto", response_format: "b64_json", stream: false, ...(size === "auto" ? {} : { size }) }),
        signal,
        redirect: "error",
      }).catch(() => { throw new Error("ChatGPT2API 连接失败，请检查 API Base URL 和网络；请求不会自动重试"); });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const data = result && typeof result === "object" && !Array.isArray(result) ? result as Record<string, unknown> : {};
        const detail = this.tool.errorMessage({ error: data.error, detail: data.detail, message: data.message })
          .replace(/data:[^,\s]+,[^\s"']+|[A-Za-z0-9+/]{80,}={0,2}/g, "[已隐藏媒体内容]");
        throw new Error(`ChatGPT2API 请求失败（HTTP ${response.status}）${detail ? `：${detail}` : "；请检查配置、权限或服务状态"}`);
      }
      if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("ChatGPT2API 返回了无效的 JSON 响应");
      const data = (result as Record<string, unknown>).data;
      if (!Array.isArray(data) || data.length !== n) throw new Error(`ChatGPT2API 返回图片数量不符，应为 ${n} 张`);
      const assets: MediaAsset[] = [];
      for (const item of data) {
        signal.throwIfAborted();
        if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("ChatGPT2API 返回了无效的图片结果");
        if (typeof item.b64_json === "string" && item.b64_json.trim()) {
          const content = item.b64_json.replace(/\s/g, "");
          if (content.length > Math.ceil(100 * 1024 * 1024 / 3) * 4 || !/^[a-zA-Z0-9+/]+={0,2}$/.test(content) || content.length % 4 === 1) throw new Error("ChatGPT2API 图片 base64 无效或超过 100 MB");
          assets.push({ mediaType: "image", type: "base64", data: content, mimeType: "" });
        } else assets.push(await downloadImage(this, item.url, signal));
      }
      // ACT: 响应没有可靠 MIME，复用宿主图片工具识别真实格式，兼容生成和调试预览。
      for (const asset of assets) {
        const { format } = await this.tool.media.inspectImage(asset).catch(() => { throw new Error("ChatGPT2API 返回内容不是有效图片"); });
        asset.mimeType = `image/${format === "jpg" ? "jpeg" : format}`;
        signal.throwIfAborted();
      }
      return assets;
    } catch (error) {
      if (signal.aborted) throw new Error(this.signal?.aborted ? "ChatGPT2API 请求已取消；服务端任务可能仍在处理" : "ChatGPT2API 请求超过 180 秒；服务端任务可能仍在处理，请勿直接重复提交");
      throw error;
    }
  },
} satisfies ProviderDefinition<typeof rules>;
