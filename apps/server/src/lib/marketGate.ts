import type { NextFunction, Request, Response } from "express";
import { getEntitlements, readSession } from "@/utils/market";

// ACT: các đường dẫn cần dùng trước khi có subscription (đăng nhập, mua gói, ngôn ngữ, cập nhật).
const publicPrefixes = [
  "/api/market/",
  "/api/channel/",
  "/api/desktop/",
  "/api/multiTenant/",
  "/api/settings/",
  "/api/health",
];

/**
 * Chặn toàn bộ API nghiệp vụ khi chưa đăng nhập (401) hoặc subscription hết hạn (402).
 * Đặt MARKET_BYPASS=1 để tắt khi phát triển cục bộ.
 */
export async function marketGate(req: Request, res: Response, next: NextFunction) {
  if (process.env.MARKET_BYPASS === "1") return next();
  if (!req.path.startsWith("/api/")) return next();
  if (publicPrefixes.some(prefix => req.path.startsWith(prefix))) return next();

  if (!readSession()) {
    res.status(401).json({ code: 401, codeName: "MARKET_UNAUTHENTICATED", message: "Chưa đăng nhập tài khoản" });
    return;
  }
  let entitlements;
  try {
    entitlements = await getEntitlements();
  } catch (error) {
    res.status(503).json({ code: 503, codeName: "MARKET_UNAVAILABLE", message: error instanceof Error ? error.message : "Không kết nối được market" });
    return;
  }
  if (!entitlements) {
    res.status(402).json({ code: 402, codeName: "MARKET_SUBSCRIPTION_REQUIRED", message: "Subscription đã hết hạn hoặc chưa kích hoạt" });
    return;
  }
  res.locals.entitlements = entitlements;
  next();
}
