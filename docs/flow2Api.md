# Flow2API cho node tạo ảnh và video

Flow2API được tích hợp trong **Cài đặt → Mô hình đa phương tiện**. Provider này dùng API tạo ảnh/video dạng chat, không phải model hội thoại hay OpenAI Images API.

## Cấu hình

1. Chọn Flow2API; nếu chưa có, thêm từ danh sách provider tích hợp.
2. Nhập địa chỉ gốc, mặc định `http://127.0.0.1:8000`. Địa chỉ đã có `/v1` cũng được chuẩn hóa. Khi Toonflow chạy trong container hoặc máy khác, dùng địa chỉ mà backend truy cập được.
3. Nhập **API Key tạo nội dung của Flow2API**, lấy từ cấu hình hệ thống của dịch vụ. Khóa này độc lập với Grok2API; không nhập cookie Google, phiên quản trị hay token kết nối plugin. Khóa được lưu qua cấu hình provider hiện có, chỉ backend gửi xác thực.
4. Lưu và chọn **Lấy mô hình**. Toonflow gọi `/v1/models` với Bearer key và chỉ lưu ID thực tế có khả năng đã được hỗ trợ. Có thể cập nhật danh mục ngay cả khi tài khoản Flow chưa sẵn sàng; trạng thái `/health` được kiểm tra lại trước mỗi lần tạo. Provider mới không cài sẵn danh sách model giả định.
5. Trong node **Tạo ảnh** hoặc **Tạo video**, chọn Flow2API và model đã lấy. Agent cũng dùng danh sách này qua công cụ media và node.

## Model và tham số

- Danh sách hiển thị sáu model chính từ danh mục công khai: **Nano Banana 2.1**, **Nano Banana 2 Lite**, **Veo 3.1 Fast**, **Veo 3.1 Lite**, **Veo 3.1 Quality** và **Omni 1.1 Flash**. Model chỉ xuất hiện khi máy chủ cung cấp ít nhất một biến thể được hỗ trợ.
- Với hai model ảnh, chọn tỷ lệ và kích thước **auto / 2K / 4K** trong cấu hình node; hỗ trợ prompt và ảnh tham chiếu. `auto` là đầu ra gốc, không cam kết số pixel.
- Với Veo, chọn **văn bản → video**, **một ảnh đầu**, **hai khung đầu/cuối** hoặc **ảnh tham chiếu** trong chế độ của node. T2V hỗ trợ 4/6/8 giây; I2V hỗ trợ 4/6 giây; R2V hỗ trợ 8 giây trên Fast/Lite. Omni hỗ trợ 4/6/8/10 giây. Các lựa chọn được lấy theo biến thể thực tế của máy chủ và lọc theo chế độ đã chọn.
- Các biến thể landscape/portrait, thời lượng và hậu tố 2k/4k là ID định tuyến nội bộ, không hiển thị thành model riêng. Backend chọn đúng ID đang có trong danh mục theo cấu hình trước khi gửi yêu cầu. Cấu hình không có biến thể tương ứng được báo lỗi, không tự thay đổi yêu cầu.
- Các node từng chọn ID cụ thể được nhận diện qua danh sách alias để chuyển về model chính, giữ các thiết lập hợp lệ. Adapter vẫn nhận ID cụ thể cũ khi được gọi trực tiếp.
- Video từ văn bản không nhận ảnh. I2V nhận một ảnh đầu hoặc hai ảnh đầu/cuối theo thứ tự. R2V nhận 1–3 ảnh tham chiếu. Omni nhận văn bản hoặc tối đa 3 ảnh.
- Giới hạn số ảnh tham chiếu cho model ảnh chưa được registry công bố; máy chủ có thể từ chối theo model/tài khoản.
- Không hỗ trợ mở rộng video bằng `extend://`, model bí danh/legacy ngoài danh mục hỗ trợ, audio/video tham chiếu, tạo audio, mask hay các tùy chọn không có trong giao thức này. Âm thanh có sẵn trong video do model quyết định.

## Thực thi và kết quả

Backend kiểm tra sức khỏe và model trước khi gửi một lần `POST /v1/chat/completions` với `stream: false`. Ảnh tham chiếu của workspace được gửi dạng data URI; kết quả Markdown ảnh hoặc thẻ video chỉ được trích địa chỉ, không thực thi HTML. Media được tải về workspace bằng cơ chế hiện có, tối đa 100 MiB mỗi file; khóa API không được gửi tới nơi lưu media.

Thời hạn chung cho tạo và tải là 6 phút với ảnh gốc, 35 phút với ảnh nâng độ phân giải và video. Provider hỗ trợ hủy từ node. Timeout/hủy chỉ dừng phía Toonflow, không bảo đảm tác vụ Flow2API đã dừng; adapter không tự gửi lại yêu cầu tạo để tránh trùng tác vụ và chi phí. Proxy phía trước Flow2API cũng cần cho phép kết nối JSON dài.

Nếu `/health` báo backend chưa chạy hoặc không có tài khoản hoạt động, cần cấu hình tài khoản Flow/CAPTCHA tại dịch vụ. HTTP 401/403 là lỗi xác thực/quyền, 429 là hạn mức/tần suất, 5xx là lỗi dịch vụ. Lấy được danh sách model không bảo đảm tác vụ tạo thật sẽ thành công hoặc tài khoản còn hạn mức.
