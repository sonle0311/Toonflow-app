# ChatGPT2API: tạo ảnh trong Toonflow

ChatGPT2API là dịch vụ tương thích một phần giao thức OpenAI, không phải API chính thức của OpenAI. Tích hợp này chỉ tạo ảnh từ văn bản qua `POST /v1/images/generations`.

## Thiết lập

1. Mở **Cài đặt → Mô hình đa phương tiện** và chọn nhà cung cấp **ChatGPT2API**. Bản dựng có nhà cung cấp tích hợp sẵn; nếu chưa được cài, thêm từ danh sách nhà cung cấp tích hợp.
2. Điền **API Key riêng do quản trị viên ChatGPT2API cấp** và lưu. Không dùng khóa Grok2API, access token hoặc refresh token của tài khoản ChatGPT. Không dán khóa vào cuộc trò chuyện, mã nguồn, URL hoặc nhật ký.
3. Giữ **API Base URL** là `https://chat.sonlt.dev/v1`, hoặc nhập địa chỉ API của máy chủ bạn được cấp quyền sử dụng. URL không được chứa thông tin đăng nhập, query hoặc fragment. URL dịch vụ gốc như `https://chat.sonlt.dev` được thêm `/v1`; URL đã có `/v1` giữ nguyên. Đường dẫn API tùy chỉnh được giữ nguyên. Không nhập URL lưu trữ ảnh.
4. Chọn **Lấy mô hình** để kiểm tra kết nối và cập nhật danh sách. Danh sách chỉ giữ `gpt-image-2` hoặc mô hình được dịch vụ khai báo rõ là ảnh; mô hình chat không được đổi thành mô hình ảnh. Có mô hình trong danh sách không bảo đảm tài khoản còn hạn mức.
5. Chọn **GPT Image 2**, chế độ tạo ảnh từ văn bản, nhập lời nhắc và chạy khi muốn tạo ảnh thật.

Khóa được lưu qua cấu hình nhà cung cấp hiện có và được backend gửi bằng `Authorization: Bearer …`. Yêu cầu API có `Accept-Language: vi-VN`. Không có biến môi trường mới bắt buộc; `baseUrl` và `apiKey` là hai trường cấu hình của nhà cung cấp này, độc lập với Grok2API.

## Phạm vi và giới hạn

- Mô hình mặc định: `gpt-image-2`; chỉ có chế độ `text`. Chưa hỗ trợ ảnh tham chiếu, chỉnh sửa ảnh, multipart, mặt nạ, chat, tìm kiếm, PPT hoặc PSD.
- Yêu cầu JSON dùng `quality: "auto"`, `response_format: "b64_json"`, `stream: false`. Chưa cho chọn chất lượng khác hoặc định dạng đầu ra. Tham số bổ sung không được chuyển tiếp.
- `n` mặc định là 1, chỉ chấp nhận số nguyên từ 1 đến 4. Node thông thường yêu cầu 1 ảnh. Kết quả phải có đúng số ảnh đã yêu cầu; thiếu hoặc thừa ảnh được báo lỗi, không âm thầm trả kết quả một phần.
- Kích thước tích hợp sẵn chỉ có `auto`; ở chế độ này không gửi `size`. OpenAPI chỉ khai báo `size` là chuỗi tùy chọn, chưa công bố danh sách kích thước được hỗ trợ. Nếu cấu hình mô hình tùy chỉnh cung cấp rõ kích thước dạng `WxH` với hai số nguyên dương, giá trị đó mới được gửi trực tiếp. `2K`/`4K` không được tự suy ra thành số pixel; máy chủ vẫn có thể từ chối kích thước `WxH`.
- Tỷ lệ 1:1, 16:9 và 9:16 được thêm vào lời nhắc như yêu cầu bố cục, vì endpoint không có tham số tỷ lệ. **Không bảo đảm tỷ lệ hay kích thước pixel chính xác** của ảnh đầu ra.
- Nhận cả `data[].b64_json` và `data[].url`. URL ảnh được dùng đúng như dịch vụ trả về; backend tải ảnh mà không gửi API Key, không theo redirect. MIME được xác định từ byte ảnh bởi cơ chế hiện có của Toonflow. Mỗi ảnh tối đa 100 MiB.
- Tổng thời gian tạo và tải ảnh tối đa 180 giây, có thể dừng chờ từ giao diện. Dừng hoặc timeout phía client **không bảo đảm tác vụ trên máy chủ đã bị hủy**. Không tự thử lại yêu cầu tạo ảnh; hãy kiểm tra tác vụ/hạn mức trước khi gửi lại.
- HTTP 401/403: kiểm tra khóa và quyền; 400/422: kiểm tra lời nhắc/tham số; 429: kiểm tra hạn mức hoặc thời điểm có thể thử lại; 5xx/lỗi mạng: kiểm tra dịch vụ và kết nối. Thông báo không chứa khóa, body phản hồi thô hoặc base64 ảnh.

Tài liệu dịch vụ: [Swagger](https://chat.sonlt.dev/docs), [OpenAPI](https://chat.sonlt.dev/openapi.json). Không chạy yêu cầu tạo ảnh thật khi chỉ cần kiểm tra kết nối; thao tác lấy mô hình dùng `GET /v1/models`.
