import { Router } from "express";
import { z } from "zod";
import u from "@/utils";
import { validateFields } from "@/lib/middleware";
import { success } from "@/lib/responseFormat";

export default Router().post("/", validateFields({
  email: z.email().max(200),
  password: z.string().min(8).max(200),
}), async (req, res) => {
  await u.market.login(req.body.email, req.body.password);
  try {
    res.json(success(await u.market.getStatus()));
  } catch (error) {
    // ACT: gói đã đủ thiết bị → trả danh sách để người dùng tự gỡ máy cũ ngay trên màn hình đăng nhập.
    if ((error as { status?: number }).status !== 409) throw error;
    res.status(409).json({
      code: 409,
      message: error instanceof Error ? error.message : "Gói đã đủ thiết bị",
      data: (error as { data?: unknown }).data ?? null,
    });
  }
});
