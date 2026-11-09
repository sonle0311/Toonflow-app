# Triển khai bản độc lập

Hướng dẫn tối thiểu để chạy **market service** (bán subscription/add-on) và phát hành **desktop app**.

## 1. Market service (`toonflow-market`)

Yêu cầu: Bun 1.4+, một VPS nhỏ (2 vCPU/4GB là đủ cho <500 user), domain + HTTPS.

```bash
cd toonflow-market
bun install
JWT_SECRET="$(openssl rand -hex 32)" \
SEPAY_API_KEY="..." SEPAY_HMAC_SECRET="..." \
ADMIN_TOKEN="$(openssl rand -hex 24)" \
PUBLIC_BASE_URL="https://market.sonlt.dev" \
DATABASE_URL="/srv/toonflow-market/data/market.db" \
PORT=4100 bun src/index.ts
```

Chạy nền bằng systemd (ví dụ `/etc/systemd/system/toonflow-market.service`):

```ini
[Unit]
Description=Toonflow Market
After=network.target

[Service]
WorkingDirectory=/srv/toonflow-market
EnvironmentFile=/srv/toonflow-market/.env
ExecStart=/root/.bun/bin/bun src/index.ts
Restart=always

[Install]
WantedBy=multi-user.target
```

Reverse proxy (Caddy):

```
market.sonlt.dev {
  reverse_proxy 127.0.0.1:4100
}
```

Sao lưu: `data/market.db` + `data/market-keys.json` (chứa private key ký license — mất là mọi license cũ không verify được).

## 2. SePay

1. Tạo tài khoản SePay, nối tài khoản ngân hàng doanh nghiệp.
2. Đặt `SEPAY_API_KEY` (SePay gửi `Authorization: Apikey <key>`) hoặc `SEPAY_HMAC_SECRET` nếu dùng chữ ký.
3. Cấu hình webhook URL: `https://market.sonlt.dev/webhooks/sepay`.
4. Điền `SEPAY_BANK_BIN`, `SEPAY_BANK_ACCOUNT`, `SEPAY_BANK_HOLDER` để sinh ảnh VietQR.
5. Chạy **Test mode** của SePay trước khi live; đối soát tại `GET /admin/orders`.

## 3. Admin

```bash
curl -H "authorization: Bearer $ADMIN_TOKEN" https://market.sonlt.dev/admin/users
curl -H "authorization: Bearer $ADMIN_TOKEN" -H 'content-type: application/json' \
  -d '{"userId":"...","planCode":"pro","days":30}' \
  https://market.sonlt.dev/admin/subscriptions
```

## 4. Desktop app

Build với thông tin thương hiệu và trỏ về market/update của bạn:

```bash
APP_NAME="Ten App" \
APP_IDENTIFIER="vn.example.app" \
VITE_APP_NAME="Ten App" \
VITE_REPO_URL="https://github.com/you/repo" \
MARKET_BASE_URL="https://market.sonlt.dev" \
TOONFLOW_DESKTOP_UPDATE_URL="https://update.example.vn/updates.json" \
bun run --cwd apps/desktop build
```

- `MARKET_BASE_URL` là biến **runtime** của server trong app (desktop đọc khi chạy, không bake lúc build) — đặt trong file `.env` cạnh app hoặc biến môi trường hệ thống.
- Không đặt `VITE_REPO_URL` thì mục GitHub trong app tự ẩn.
- Bật `MARKET_BYPASS=1` để tắt kiểm tra subscription khi phát triển.

## 5. Update feed

`apps/updateServer` là service tĩnh phát hành bản cập nhật:

```bash
cd apps/updateServer && bun install && bun run start   # mặc định :8091
bun run publish <thư-mục-build-desktop>
```

Sau đó trỏ `TOONFLOW_DESKTOP_UPDATE_URL` (hoặc `desktopUpdateCustomUrl` trong Settings) về `https://update.example.vn/...`.

## 6. Checklist trước khi bán

- [ ] `JWT_SECRET`, `ADMIN_TOKEN`, `SEPAY_*` là giá trị thật, không dùng mặc định dev
- [ ] `data/market-keys.json` được backup
- [ ] SePay test mode chạy thành công, webhook trả `{"success":true}`
- [ ] Đã thử luồng: đăng ký → trial 3 ngày → hết hạn → paywall → mua → mở khoá
- [ ] App không còn request tới `api.toonflow.net`
- [ ] License verify được bằng `/license/public-key`
