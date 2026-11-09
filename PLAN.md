# PLAN — Toonflow độc lập (desktop) + marketplace bán subscription

> Trạng thái: **đã chốt qua 5 vòng grilling** (2026-11-09). Mọi con số là ước lượng để lập kế hoạch, không phải cam kết.
> Nguyên tắc: chỉ làm nội dung đã chốt; thay đổi phải ghi rõ lý do và cập nhật file này.

---

## 1. Mục tiêu

1. **Độc lập khỏi Toonflow**: app không gọi `api.toonflow.net`, không ads, không telemetry, tự phát hành bản cập nhật.
2. **Bán subscription**: người dùng trả phí định kỳ để mở toàn bộ tính năng.
3. **Bán add-on**: một số tool / skill / template bán riêng trong marketplace.
4. **Chi phí hạ tầng tối thiểu**: render + lưu trữ + provider API đều trên máy người dùng.

## 2. Kiến trúc

```
┌────────────────── MÁY NGƯỜI DÙNG ──────────────────┐
│ Toonflow Desktop (Electrobun)                       │
│ ├─ Bun server local (Express + pi)                  │
│ ├─ Render: ffmpeg, node canvas                      │
│ ├─ Media: đĩa của người dùng (không quota server)   │
│ ├─ Provider API key: lưu local, mã hoá              │
│ └─ License guard (offline grace 7 ngày)             │
└───────────────┬─────────────────────────────────────┘
                │ HTTPS
┌───────────────▼───────────── MARKET (VPS nhỏ 2 vCPU) ─────────────┐
│ auth (email/mật khẩu, JWT)  · plans · orders · licenses           │
│ plugin registry (bundle trên R2, watermark theo user)             │
│ update feed (Electrobun auto-update)                              │
│ SePay webhook + đối soát                                          │
└───────────────────────────────────────────────────────────────────┘
```

- **Không** có: multi-tenant runtime trong app, storage quota, execution API, credit.
- **Market** là service riêng (repo riêng), dùng Bun + Express + MySQL 8 (drizzle).

## 3. Quyết định đã chốt

| # | Quyết định |
|---|---|
| D1 | Bán **subscription** mở toàn bộ plugin/tính năng; **provider API key do người dùng tự cấu hình** |
| D2 | **Soft fork** 6 tháng đầu, giới hạn thay đổi trong 4 vùng: `channel/self`, branding, i18n, market client |
| D3 | Bán thêm **add-on** (tool/skill/template) trong marketplace |
| D4 | Phân phối **desktop-first** (Windows/macOS), web/self-host để sau |
| D5 | **Một tài khoản** duy nhất cho app + mua hàng + license |
| D6 | Gia hạn **chủ động**: hết hạn → khoá; đăng nhập → hiện màn hình thanh toán; grace 7 ngày |
| D7 | Market chạy **một instance**; DB MySQL 8; bundle trên R2 |
| D8 | Tái dùng **schema/auth pattern** của `multiTenant` (copy, không import) trong market |
| D9 | Provider key lưu **local trên máy user**, mã hoá at-rest; không gửi lên market |
| D10 | Add-on **mua đứt** gắn account; vẫn yêu cầu subscription còn hạn để dùng app |
| D11 | **Trial 3 ngày**, chỉ plugin cơ bản, tính từ lần dùng đầu, chống abuse theo email/SĐT |
| D12 | **SaaS đóng**: chỉ plugin từ market; tắt cài plugin thủ công; tắt `tool-sandbox`/shell với user thường |
| D13 | Thanh toán **SePay** (VietQR + webhook), tự render QR trong app, không dùng trang hosted |
| D14 | **Chưa ký số** khi ra mắt; ký khi đạt ~50 user trả phí |
| D15 | **2 máy/account**, offline grace **7 ngày**, heartbeat 6 giờ |
| D16 | Plugin **tải từ market** khi đăng nhập (không đóng gói sẵn trong installer) |
| D17 | Chống copy: license gate + watermark; mã hoá theo license cho add-on ≥ 299k; server-executed để phase sau |

### Quyết định bị thay thế bởi pivot desktop

| Trước | Sau | Lý do |
|---|---|---|
| Q9: provider key lưu server-side mã hoá | **D9: lưu local trên máy user** | Không còn server dùng chung |
| Q22: quota 5/20/60 GB trên server | **Bỏ** — dùng đĩa của user, chỉ cảnh báo dung lượng | Render/lưu trữ do user |
| Q7: SaaS multi-user dùng chung | **Market một instance, app chạy local** | Giảm chi phí, tăng độc lập |
| Multi-tenant runtime | **Không dùng trong app**; chỉ mượn schema/auth cho market | Mỗi máy là một tenant tự nhiên |

## 4. Thanh toán SePay

```
1. Người dùng bấm Mua / Gia hạn
2. Market tạo order: code = "TF" + 8 ký tự, amount, status=pending
3. App hiển thị VietQR (số tiền + nội dung = code), polling /orders/:code
4. Người dùng chuyển khoản
5. SePay POST /webhooks/sepay
   { id, code, content, transferType:"in", transferAmount, ... }
6. Verify HMAC-SHA256 + đối chiếu amount
7. INSERT webhook_logs(transaction_id UNIQUE)  ← idempotent
8. order → paid → cấp license JWT → trả {"success": true} trong 30s
9. App polling thấy paid → mở khoá
```

Yêu cầu bắt buộc:
- Trả **HTTP 200 + `{"success": true}`** trong **30 giây** (nếu không SePay retry).
- `transaction_id` **UNIQUE** để chống xử lý trùng.
- **Không** dùng redirect trình duyệt làm bằng chứng thanh toán.
- Có trang **đối soát**: giao dịch không khớp order → hàng chờ gán tay.
- Test mode trước khi live.
- Phí SePay: STARTUP 120k/tháng (180 GD) → SHOP 99k khi vượt.

## 5. License & entitlement

```
JWT ES256, ký bằng private key của market:
{ iss:"market", sub:userId, plan:"pro", lvl:1,
  exp: <end kỳ>, dev:[hash1, hash2], q:{plugins:[...]}, jti }
```

- App nhúng **public key** → verify offline.
- **Heartbeat** 6 giờ: `GET /entitlements` (kèm device hash).
- **Offline grace 7 ngày** kể từ lần online cuối.
- **2 thiết bị**: đăng ký device hash; thiết bị thứ 3 → yêu cầu gỡ bớt.
- Hết hạn subscription → API trả **402** kèm mã lỗi; app hiện paywall.
- **Thu hồi**: market giữ danh sách `jti` bị revoke; app check khi online.

## 6. Marketplace & chống sao chép

| Tài sản | Bảo vệ | Ghi chú |
|---|---|---|
| Template (canvas JSON) | License gate khi tải | Giá thấp, chấp nhận copy |
| Skill (SKILL.md) | License gate + cập nhật định kỳ | Bản copy sẽ lỗi thời |
| Node plugin (UMD) | License gate + watermark `userId/email` | Add-on ≥ 299k: mã hoá AES theo license |
| Tool có bí quyết | Để phase sau: server-executed | Chỉ 1–2 tool, chi phí server nhỏ |

Nguyên tắc: **không đầu tư chống copy quá 5% doanh thu add-on**. App yêu cầu subscription còn hạn để chạy, nên thiệt hại thực tế chỉ là doanh thu add-on.

## 7. Data model (market, MySQL)

```
users            (id, email, phone, password_hash, name, role, created_at)
devices          (id, user_id, hash, name, last_seen_at)
plans            (id, code, name, price, period_days, plugins json, max_devices)
subscriptions    (id, user_id, plan_id, status, started_at, expires_at, renew_at)
addons           (id, slug, name, type, price, min_plan, active)
addon_licenses   (id, user_id, addon_id, order_id, granted_at, revoked_at)
orders           (id, user_id, kind, plan_id?, addon_id?, code UNIQUE, amount, status, paid_at)
webhook_logs     (transaction_id PK, payload json, received_at)
licenses_jwt     (jti, user_id, issued_at, expires_at, revoked_at)
plugin_versions  (id, addon_id, version, sha256, bundle_key, changelog, min_app)
audit_logs       (id, actor, action, target, at)
```

## 8. Lộ trình 4 tuần (MVP bán được)

### Tuần 1 — Độc lập + nền market
- App: `SelfChannel` (ads/explore/account → market hoặc rỗng), `TOONFLOW_CHANNEL=self`
- App: tắt telemetry, update feed trỏ về `apps/updateServer` của bạn, branding (name/identifier/icon)
- Market: scaffold Bun + Express + MySQL + drizzle; `users`, `devices`, auth JWT, refresh

### Tuần 2 — Bán hàng
- `plans` + `subscriptions` + `orders`
- SePay: tạo QR, webhook, HMAC, idempotency, trang đối soát
- API cấp license JWT + `GET /entitlements`

### Tuần 3 — App dùng license
- Màn hình đăng nhập + màn hình paywall
- Verify JWT offline, heartbeat 6h, offline grace 7 ngày, giới hạn 2 thiết bị
- Gate plugin theo entitlement; trial 3 ngày; API trả 402 khi hết hạn

### Tuần 4 — Marketplace add-on + đóng gói
- Add-on: danh sách, mua, tải về, watermark; mã hoá cho add-on ≥ 299k
- Admin tối thiểu: tạo plan, xem đơn, cấp/khoá tay
- Đóng gói installer Windows/macOS (chưa ký), update feed, QA end-to-end

**Cắt khỏi MVP**: auto-renew, email marketing, multi-tenant, server-executed tool, analytics nâng cao.

## 9. Chi phí & hoà vốn

| Khoản | Không ký số | Có ký số |
|---|---|---|
| VPS market (2 vCPU/4GB) | 130k | 130k |
| R2 (bundle plugin) | 25k | 25k |
| Domain + email | 25k | 25k |
| SePay STARTUP | 120k | 120k |
| Apple Developer ($99/năm) | — | 217k |
| Windows signing (~$250/năm) | — | 550k |
| **Tổng/tháng** | **~300k** | **~1.07M** |

- Hoà vốn gói **99k**: **~4 user** (chưa ký) / **~11 user** (có ký).
- 100 user × 99k = 9.9M → lãi ~9.6M (chưa ký).
- Giá đề xuất: Basic **99k**, Pro **199k**, Studio **399k**.

## 10. Rủi ro & biện pháp

| Rủi ro | Mức | Biện pháp |
|---|---|---|
| Plugin bị copy | Trung bình | License gate + watermark; chấp nhận mức độ |
| App bị crack | Trung bình | Heartbeat + offline grace ngắn; không đầu tư quá mức |
| Conflict khi merge upstream | Trung bình | Giới hạn 4 vùng thay đổi; merge hàng tháng |
| SePay webhook trễ/mất | Thấp | Idempotency + trang đối soát + polling |
| Tranh chấp/refund | Thấp | Chính sách rõ: không hoàn sau khi cấp license |
| Pháp lý | Thấp | Giữ LICENSE/NOTICES (MIT); không dùng thương hiệu Toonflow |

## 11. Việc cần bạn chuẩn bị

1. Tài khoản SePay + tài khoản ngân hàng doanh nghiệp (để nhận tiền).
2. Domain cho market (ví dụ `market.<brand>.vn`).
3. Tên app + bundle id (ví dụ `vn.brand.studio`).
4. Danh sách add-on đợt đầu + giá.
5. Tài khoản Cloudflare (R2 + DNS).

## 12. Định nghĩa hoàn thành MVP

- [ ] App không còn request nào tới `api.toonflow.net`
- [ ] Người dùng đăng ký → trial 3 ngày → hết hạn bị khoá
- [ ] Mua gói bằng SePay → license cấp trong < 2 phút → app mở khoá
- [ ] Hết hạn → đăng nhập hiện paywall, API trả 402
- [ ] Mua add-on → tải về → dùng được; watermark đúng user
- [ ] Admin xem được đơn, cấp/khoá license tay
- [ ] Installer Windows + macOS chạy được, update feed hoạt động

---

## Trạng thái thực hiện (cập nhật 2026-11-09)

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| App độc lập (self channel, tắt telemetry, update env) | ✅ | commit `1bdf89c7`; headless: 0 request tới toonflow.net |
| Market: auth + refresh | ✅ | `toonflow-market` commit `1a6982e`, `047be24`; register/login/refresh 200 |
| Market: plans + orders + SePay webhook | ✅ | order → webhook → paid; replay không nhân đôi; sai key 401 |
| Market: license ES256 + entitlements | ✅ | `/license/verify` valid:true; 402 khi hết hạn |
| App ↔ market client + proxy routes | ✅ | commit `452b4bc4`; login/status/plans/orders qua app |
| Enforcement 401/402 + đóng cài plugin | ✅ | commit `6aab8651`; 401/402/403 đúng |
| Gate theo entitlement (trial 3 node) | ✅ | trial → `imageNode,textNode,videoNode`; Pro → 9 node |
| UI đăng nhập + paywall + mua gói | ✅ | commit `6aab8651`; flow Pro → QR → webhook → mở khoá |
| Add-on: catalog, mua, license, watermark | ✅ | commit `babd9d41` (app), `32c9b24` (market) |
| Admin tối thiểu (users/orders/grant/addon) | ✅ | `toonflow-market` commit `4fc1452` |
| Branding (tên, bundle id, icon) | ⏳ chờ tên thương hiệu |
| Installer + update feed | ⏳ cần build trên Windows/macOS |
| SePay production | ⏳ cần tài khoản + `SEPAY_*` thật |

### Biến môi trường mới

App (`apps/server`):

| Biến | Ý nghĩa |
|---|---|
| `MARKET_BASE_URL` | Base URL market service (mặc định `http://127.0.0.1:4100`) |
| `MARKET_BYPASS=1` | Tắt chặn subscription khi phát triển |
| `MARKET_ALLOW_PLUGIN_ADMIN=1` | Cho phép cài plugin thủ công (mặc định chặn) |
| `TOONFLOW_DESKTOP_UPDATE_URL`, `TOONFLOW_GITHUB_RELEASES_URL` | Nguồn cập nhật của bạn |
| `VITE_TELEMETRY_URL` | Endpoint telemetry riêng (bỏ trống = tắt) |

Market: xem `toonflow-market/README.md`.
