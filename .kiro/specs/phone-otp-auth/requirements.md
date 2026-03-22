# Requirements Document

## Introduction

Feature bổ sung phương thức xác thực bằng số điện thoại + OTP SMS cho hệ thống hiện tại (Node.js + Express + sql.js + JWT). Người dùng có thể đăng ký, đăng nhập, và đặt lại mật khẩu thông qua mã OTP gửi qua SMS. Feature này hoạt động song song với các phương thức xác thực hiện có (email/password, Google OAuth, Facebook OAuth) — không thay thế, không phá vỡ tương thích ngược.

SMS Provider được thiết kế theo dạng adapter pattern để dễ dàng swap giữa dev mode (log console) và các provider thực tế (Twilio, ESMS, SpeedSMS).

## Glossary

- **OTP_Service**: Module backend xử lý sinh, lưu trữ, gửi và xác thực mã OTP
- **SMS_Adapter**: Interface trừu tượng hóa việc gửi SMS, hỗ trợ swap provider
- **Phone_Validator**: Module kiểm tra định dạng số điện thoại Việt Nam
- **Auth_Controller**: Module backend xử lý các endpoint xác thực
- **Auth_Modal**: Component frontend (auth.js) hiển thị giao diện đăng nhập/đăng ký
- **Rate_Limiter**: Middleware giới hạn tần suất gọi API
- **JWT**: JSON Web Token dùng để duy trì phiên đăng nhập
- **OTP**: One-Time Password — mã xác thực 6 chữ số dùng một lần
- **VN_Phone_Format**: Số điện thoại Việt Nam hợp lệ — bắt đầu bằng 0 hoặc +84, theo sau là 9 chữ số (tổng 10–11 ký tự), thuộc các đầu số của Viettel/Mobifone/Vinaphone/Vietnamobile/Gmobile

---

## Requirements

### Requirement 1: Validate số điện thoại Việt Nam

**User Story:** As a người dùng, I want hệ thống kiểm tra số điện thoại hợp lệ trước khi gửi OTP, so that tôi nhận được thông báo lỗi rõ ràng nếu nhập sai định dạng.

#### Acceptance Criteria

1. WHEN người dùng nhập số điện thoại, THE Phone_Validator SHALL kiểm tra định dạng theo VN_Phone_Format trước khi cho phép gửi OTP
2. IF số điện thoại không khớp VN_Phone_Format, THEN THE Phone_Validator SHALL trả về lỗi mô tả cụ thể trong vòng 50ms
3. THE Phone_Validator SHALL chuẩn hóa số điện thoại về dạng `+84xxxxxxxxx` trước khi lưu vào database
4. WHEN số điện thoại bắt đầu bằng `0`, THE Phone_Validator SHALL chuyển đổi thành `+84` thay thế tiền tố `0`

---

### Requirement 2: Gửi OTP qua SMS

**User Story:** As a người dùng, I want nhận mã OTP qua SMS sau khi nhập số điện thoại, so that tôi có thể xác thực danh tính.

#### Acceptance Criteria

1. WHEN người dùng yêu cầu gửi OTP với số điện thoại hợp lệ, THE OTP_Service SHALL sinh mã OTP gồm đúng 6 chữ số ngẫu nhiên
2. WHEN OTP được sinh, THE OTP_Service SHALL lưu OTP dưới dạng hash (bcrypt) cùng thời gian hết hạn vào database
3. WHEN OTP được sinh, THE SMS_Adapter SHALL gửi OTP đến số điện thoại trong vòng 5 giây
4. THE OTP_Service SHALL đặt thời gian hết hạn của OTP là 5 phút kể từ thời điểm sinh
5. WHERE SMS_Adapter ở chế độ dev, THE SMS_Adapter SHALL log OTP ra console thay vì gửi SMS thực
6. WHERE SMS_Adapter ở chế độ production, THE SMS_Adapter SHALL gửi SMS qua provider được cấu hình (Twilio/ESMS/SpeedSMS)

---

### Requirement 3: Rate Limit gửi OTP

**User Story:** As a quản trị viên, I want giới hạn số lần gửi OTP mỗi số điện thoại, so that hệ thống không bị lạm dụng để spam SMS.

#### Acceptance Criteria

1. THE Rate_Limiter SHALL giới hạn tối đa 3 lần gửi OTP cho cùng một số điện thoại trong khoảng thời gian 10 phút
2. IF số điện thoại đã đạt giới hạn gửi OTP, THEN THE Rate_Limiter SHALL từ chối yêu cầu và trả về thời gian chờ còn lại tính bằng giây
3. THE Rate_Limiter SHALL giới hạn tối đa 10 lần gửi OTP từ cùng một địa chỉ IP trong khoảng thời gian 10 phút
4. IF địa chỉ IP đã đạt giới hạn, THEN THE Rate_Limiter SHALL từ chối yêu cầu với HTTP status 429

---

### Requirement 4: Đăng ký tài khoản bằng số điện thoại

**User Story:** As a người dùng mới, I want đăng ký tài khoản bằng số điện thoại và OTP, so that tôi không cần nhớ email hay mật khẩu để bắt đầu.

#### Acceptance Criteria

1. WHEN người dùng gửi số điện thoại hợp lệ chưa được đăng ký, THE Auth_Controller SHALL kích hoạt luồng gửi OTP đăng ký
2. IF số điện thoại đã tồn tại trong database, THEN THE Auth_Controller SHALL trả về lỗi và gợi ý người dùng đăng nhập
3. WHEN người dùng nhập OTP đúng và còn hiệu lực, THE Auth_Controller SHALL tạo tài khoản mới với số điện thoại đã chuẩn hóa
4. WHEN tài khoản được tạo thành công, THE Auth_Controller SHALL trả về JWT token và thông tin user
5. THE Auth_Controller SHALL tạo `username` mặc định từ số điện thoại (ví dụ: `user_0912345678`) nếu người dùng không cung cấp username
6. WHEN OTP đã được dùng để đăng ký thành công, THE OTP_Service SHALL đánh dấu OTP là đã sử dụng và không cho phép dùng lại

---

### Requirement 5: Đăng nhập bằng số điện thoại + OTP

**User Story:** As a người dùng đã có tài khoản, I want đăng nhập bằng số điện thoại và OTP, so that tôi không cần nhớ mật khẩu.

#### Acceptance Criteria

1. WHEN người dùng gửi số điện thoại đã đăng ký, THE Auth_Controller SHALL kích hoạt luồng gửi OTP đăng nhập
2. IF số điện thoại chưa được đăng ký, THEN THE Auth_Controller SHALL trả về lỗi và gợi ý người dùng đăng ký
3. WHEN người dùng nhập OTP đúng và còn hiệu lực, THE Auth_Controller SHALL trả về JWT token và thông tin user
4. IF người dùng nhập OTP sai quá 5 lần liên tiếp, THEN THE Auth_Controller SHALL vô hiệu hóa OTP hiện tại và yêu cầu gửi lại
5. WHEN đăng nhập thành công, THE Auth_Controller SHALL cập nhật thời gian đăng nhập cuối của user

---

### Requirement 6: Đặt lại mật khẩu qua OTP SMS

**User Story:** As a người dùng, I want đặt lại mật khẩu bằng OTP SMS, so that tôi có thể lấy lại quyền truy cập khi quên mật khẩu.

#### Acceptance Criteria

1. WHEN người dùng yêu cầu đặt lại mật khẩu với số điện thoại đã đăng ký, THE Auth_Controller SHALL gửi OTP xác thực qua SMS
2. IF số điện thoại chưa được đăng ký, THEN THE Auth_Controller SHALL trả về lỗi không tiết lộ thông tin tài khoản tồn tại hay không
3. WHEN người dùng nhập OTP đúng, THE Auth_Controller SHALL cho phép đặt mật khẩu mới
4. THE Auth_Controller SHALL yêu cầu mật khẩu mới có độ dài tối thiểu 8 ký tự
5. WHEN mật khẩu mới được đặt, THE Auth_Controller SHALL hash mật khẩu bằng bcrypt với cost factor tối thiểu 10 trước khi lưu
6. WHEN mật khẩu được đặt lại thành công, THE Auth_Controller SHALL vô hiệu hóa tất cả OTP còn hiệu lực của số điện thoại đó
7. WHEN mật khẩu được đặt lại thành công, THE Auth_Controller SHALL trả về JWT token để đăng nhập ngay

---

### Requirement 7: Bảo mật OTP

**User Story:** As a quản trị viên, I want OTP được bảo vệ đúng cách, so that mã OTP không thể bị đoán hoặc tái sử dụng.

#### Acceptance Criteria

1. THE OTP_Service SHALL lưu OTP dưới dạng bcrypt hash, không lưu plaintext
2. WHEN OTP hết hạn, THE OTP_Service SHALL từ chối xác thực dù mã đúng
3. WHEN OTP đã được sử dụng thành công, THE OTP_Service SHALL đánh dấu `used = 1` và từ chối mọi lần xác thực tiếp theo với cùng OTP
4. THE OTP_Service SHALL sinh OTP bằng cryptographically secure random number generator
5. IF OTP không hợp lệ hoặc hết hạn, THEN THE Auth_Controller SHALL trả về thông báo lỗi chung không tiết lộ lý do cụ thể (tránh oracle attack)

---

### Requirement 8: Migrate password hash sang bcrypt

**User Story:** As a quản trị viên, I want mật khẩu người dùng được hash bằng bcrypt thay vì SHA256, so that hệ thống đáp ứng tiêu chuẩn bảo mật hiện đại.

#### Acceptance Criteria

1. WHEN người dùng cũ đăng nhập bằng email/password, THE Auth_Controller SHALL kiểm tra xem password_hash có phải SHA256 không và tự động migrate sang bcrypt sau khi xác thực thành công
2. THE Auth_Controller SHALL nhận biết SHA256 hash bằng độ dài chuỗi 64 ký tự hex
3. WHEN mật khẩu mới được tạo hoặc đặt lại, THE Auth_Controller SHALL luôn dùng bcrypt với cost factor tối thiểu 10
4. WHILE quá trình migrate đang diễn ra, THE Auth_Controller SHALL đảm bảo người dùng cũ vẫn đăng nhập được bình thường

---

### Requirement 9: Cập nhật schema database

**User Story:** As a developer, I want database có đủ các bảng và cột để lưu thông tin phone auth, so that dữ liệu OTP và số điện thoại được quản lý đúng cách.

#### Acceptance Criteria

1. THE Auth_Controller SHALL lưu số điện thoại đã chuẩn hóa vào cột `phone` của bảng `users`
2. THE OTP_Service SHALL lưu OTP vào bảng `phone_otps` với các cột: `id`, `phone`, `otp_hash`, `purpose` (register/login/reset), `expires_at`, `used`, `attempt_count`, `created_at`
3. THE Auth_Controller SHALL thực hiện migration thêm cột `phone` vào bảng `users` hiện có mà không làm mất dữ liệu
4. IF cột `phone` đã tồn tại trong bảng `users`, THEN THE Auth_Controller SHALL bỏ qua migration mà không báo lỗi

---

### Requirement 10: Giao diện frontend Phone OTP

**User Story:** As a người dùng, I want giao diện đăng nhập/đăng ký có tab Phone OTP, so that tôi có thể chọn phương thức xác thực phù hợp.

#### Acceptance Criteria

1. THE Auth_Modal SHALL hiển thị tab "Số điện thoại" bên cạnh các tab đăng nhập/đăng ký hiện có
2. WHEN người dùng chọn tab Phone, THE Auth_Modal SHALL hiển thị form nhập số điện thoại và nút "Gửi OTP"
3. WHEN OTP được gửi thành công, THE Auth_Modal SHALL chuyển sang bước nhập OTP với countdown timer hiển thị thời gian còn lại
4. THE Auth_Modal SHALL hiển thị nút "Gửi lại OTP" sau khi countdown kết thúc (5 phút)
5. WHEN xác thực OTP thành công, THE Auth_Modal SHALL đóng modal và cập nhật trạng thái đăng nhập trên nav bar
6. IF OTP nhập sai, THEN THE Auth_Modal SHALL hiển thị thông báo lỗi và số lần thử còn lại

---

### Requirement 11: SMS Adapter — Pluggable Provider

**User Story:** As a developer, I want SMS provider được tách biệt khỏi business logic, so that tôi có thể swap sang Twilio/ESMS/SpeedSMS mà không cần sửa code xác thực.

#### Acceptance Criteria

1. THE SMS_Adapter SHALL expose interface thống nhất: `sendOTP(phone, otp)` trả về Promise
2. WHERE biến môi trường `SMS_PROVIDER=dev`, THE SMS_Adapter SHALL log OTP ra console với format `[DEV SMS] Phone: {phone} | OTP: {otp}`
3. WHERE biến môi trường `SMS_PROVIDER=twilio`, THE SMS_Adapter SHALL gửi SMS qua Twilio API
4. WHERE biến môi trường `SMS_PROVIDER=esms`, THE SMS_Adapter SHALL gửi SMS qua ESMS API
5. IF SMS_PROVIDER không được cấu hình, THEN THE SMS_Adapter SHALL mặc định dùng chế độ dev và log cảnh báo
6. THE SMS_Adapter SHALL trả về `{ success: true, messageId }` khi gửi thành công hoặc throw Error khi thất bại

---

### Requirement 12: Tương thích ngược với auth hiện tại

**User Story:** As a người dùng cũ, I want tiếp tục đăng nhập bằng email/password và OAuth như trước, so that việc thêm phone auth không ảnh hưởng đến trải nghiệm của tôi.

#### Acceptance Criteria

1. WHILE phone auth feature được bật, THE Auth_Controller SHALL tiếp tục hỗ trợ đăng nhập bằng email/password
2. WHILE phone auth feature được bật, THE Auth_Controller SHALL tiếp tục hỗ trợ đăng nhập bằng Google OAuth và Facebook OAuth
3. THE Auth_Controller SHALL cho phép một tài khoản liên kết cả email lẫn số điện thoại
4. WHEN người dùng đăng nhập bằng phone OTP với số điện thoại đã liên kết với tài khoản email, THE Auth_Controller SHALL trả về cùng tài khoản đó
