import { Router } from "express";
import { z } from "zod";
import { findLanguagePreset } from "@toonflow/providers";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";

type RemoteModel = { id?: unknown; display_name?: unknown; name?: unknown };

export default Router().post("/", validateFields({
  preset: z.string().min(1).max(40),
  apiKey: z.string().trim().min(1).max(4096),
}), async (req, res) => {
  const preset = findLanguagePreset(req.body.preset);
  if (!preset) return res.status(400).json({ code: 400, data: null, message: "Nhà cung cấp không hợp lệ" });

  const headers: Record<string, string> = { accept: "application/json" };
  if (preset.auth === "anthropic") {
    headers["x-api-key"] = req.body.apiKey;
    headers["anthropic-version"] = "2023-06-01";
  } else {
    headers.authorization = `Bearer ${req.body.apiKey}`;
  }

  // ACT: luôn trả danh sách dự phòng; verified=false kèm lý do để wizard cảnh báo thay vì chặn.
  try {
    const response = await fetch(`${preset.apiUrl}/models`, { headers, signal: AbortSignal.timeout(12_000) });
    if (!response.ok) {
      res.json(success({ verified: false, models: preset.models, message: `Nhà cung cấp trả lỗi ${response.status}` }));
      return;
    }
    const body = await response.json() as { data?: RemoteModel[]; models?: RemoteModel[] };
    const list = Array.isArray(body.data) ? body.data : Array.isArray(body.models) ? body.models : [];
    const models = list.flatMap(item => {
      const raw = typeof item.id === "string" ? item.id : typeof item.name === "string" ? item.name.replace(/^models\//, "") : "";
      if (!raw) return [];
      return [{ id: raw, label: typeof item.display_name === "string" && item.display_name.trim() ? item.display_name.trim() : raw }];
    });
    res.json(success(models.length
      ? { verified: true, models: models.sort((left, right) => left.id.localeCompare(right.id)) }
      : { verified: false, models: preset.models, message: "Không đọc được danh sách model" }));
  } catch {
    res.json(success({ verified: false, models: preset.models, message: "Không kết nối được nhà cung cấp" }));
  }
});
