# Tính năng đã triển khai

Tài liệu này ghi nhận những chức năng có trong code hiện tại của FinPilot. FinPilot là ứng dụng giúp chủ shop online theo dõi lịch thu–chi, dự báo số dư tối đa 56 ngày và thử các phương án nhập hàng.

Đặc tả sản phẩm gốc là [finpilot.doc](../../finpilot.doc). Tài liệu đó phân biệt MVP với các module phát triển dự kiến; danh mục mở rộng không đồng nghĩa các chức năng đã có trong phần mềm.

## Chức năng sản phẩm

- Tạo tài khoản, đăng nhập/đăng xuất bằng cookie HttpOnly, xác nhận email, gửi lại email xác nhận và khôi phục mật khẩu.
- Tạo một shop cho mỗi tài khoản; dữ liệu shop được lưu trên PostgreSQL và các API shop yêu cầu đăng nhập.
- Lưu số dư cùng ngày chốt, các khoản thu/chi (nghĩa vụ), những lần thanh toán một phần/toàn phần và trạng thái khoản.
- Xem và cập nhật lịch thu–chi; thanh toán đã ghi được giữ lịch sử, khoản bị loại khỏi danh sách được đánh dấu VOID.
- Dự báo dòng tiền theo ngày trong tối đa 56 ngày, gồm số dư từng ngày, ngày thiếu tiền đầu tiên và mức thiếu; dự báo bắt đầu sau ngày chốt số dư.
- Tạo và lưu kịch bản mô phỏng, so sánh với dữ liệu cơ sở; kịch bản không sửa nghĩa vụ thực tế và được đánh dấu cần tính lại khi dữ liệu nền đổi.
- Tải mẫu CSV/XLSX, xem trước file nhập, kiểm tra dữ liệu; commit import theo batch và từ chối nhập lại cùng file đã ghi nhận.
- Ghi audit cho thay đổi dữ liệu; bảo vệ các thao tác ghi bằng CSRF và cô lập dữ liệu theo tài khoản/shop.

## API

### Phiên và xác thực

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/csrf` | Cấp token CSRF và cookie antiforgery. Gửi token qua header `X-CSRF-TOKEN` khi gọi API ghi. |
| POST | `/api/auth/register` | Đăng ký Identity; gửi email xác nhận. |
| POST | `/api/auth/login` | Đăng nhập bằng cookie. |
| GET | `/api/auth/me` | Trả email của phiên hiện tại; 401 nếu chưa đăng nhập. |
| POST | `/api/auth/logout` | Đăng xuất, trả 204. |
| GET | `/api/auth/confirmEmail` | Xác nhận email bằng query do Identity cấp. |
| POST | `/api/auth/resendConfirmationEmail` | Gửi lại email xác nhận. |
| POST | `/api/auth/forgotPassword` | Yêu cầu email đặt lại mật khẩu; không tiết lộ email có tài khoản hay không. |
| POST | `/api/auth/resetPassword` | Đặt mật khẩu mới bằng mã khôi phục. |

Các endpoint đăng ký/đăng nhập/xác nhận/gửi lại/đặt lại được Identity cung cấp qua `MapIdentityApi`. `/api/auth/refresh` bị vô hiệu hóa. Các yêu cầu ghi cần CSRF.

### Shop, lịch thu–chi và kịch bản

Các đường dẫn dưới đây đều cần đăng nhập và thuộc shop của người dùng hiện tại.

| Method | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/shop` | Đọc toàn bộ shop: số dư, nghĩa vụ và thanh toán, kịch bản, lịch sử import cùng phiên bản dữ liệu. |
| POST | `/api/shop` | Tạo shop. Mỗi tài khoản chỉ có một shop. |
| PUT | `/api/shop/balance` | Cập nhật số dư và ngày chốt. |
| GET / PUT / DELETE | `/api/shop/obligations/{id}` | Đọc, tạo/cập nhật hoặc xóa nghĩa vụ. ID là GUID do client tạo; thanh toán cũ được giữ theo quy tắc lịch sử. |
| GET / PUT / DELETE | `/api/shop/scenarios/{id}` | Đọc, tạo/cập nhật hoặc xóa kịch bản. Kịch bản không thay đổi dữ liệu thực tế. |
| POST | `/api/shop/imports` | Ghi batch nghĩa vụ đã xem trước; thao tác nguyên tử, nhận diện file trùng bằng SHA-256. |
| PUT | `/api/shop/data` | Thay toàn bộ dữ liệu shop (dùng cho luồng demo/wipe); có lưu lịch sử và audit. |

### Dự báo và nhập file

| Method | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/api/forecast/preview` | Tính dự báo từ payload, không lưu dữ liệu và không yêu cầu đăng nhập. Đầu vào không hợp lệ trả 400. |
| GET | `/api/import/template?format=csv\|xlsx` | Tải mẫu nhập CSV hoặc XLSX. |
| POST | `/api/import/preview` | Nhận multipart field `file`, phân tích và trả kết quả xem trước; hỗ trợ CSV/XLSX, giới hạn file 1 MB. |
| GET | `/api/health` | Health check tiến trình API, trả trạng thái `ok`. |

## Quy tắc và giới hạn hiện tại

- Tiền VND truyền/nhận dưới dạng chuỗi số nguyên; ngày nghiệp vụ định dạng ISO `YYYY-MM-DD`.
- API preview dự báo là stateless; dữ liệu cơ sở được frontend đọc/lưu qua `/api/shop`.
- Import chỉ xử lý CSV/XLSX theo mẫu; chưa có kết nối ngân hàng, sàn thương mại điện tử hay phần mềm kế toán.
- Audit được ghi nhưng hiện chưa có API/màn hình tra cứu lịch sử audit.
- Sản phẩm hiện không có AI, OCR, tự thanh toán, dự báo doanh số hay gợi ý vay vốn.
- Cốt lõi sản phẩm là kiểm tra khả năng chi trả trước khi chốt nhập hàng: nhập lịch thu–chi, xem nguy cơ thiếu tiền, rồi so sánh phương án. Chủ shop tự quyết định.
- Health Score, dashboard lợi nhuận/burn rate đầy đủ, đề xuất hành động tự động, tối ưu tồn kho, nhắc nợ tự động và tích hợp ngân hàng/POS/kế toán là hướng mở rộng, không phải chức năng đã triển khai.
- Khung 8 tuần/56 ngày là lựa chọn thử nghiệm hiện có, không phải ngưỡng sản phẩm đã được kiểm chứng với khách hàng.
- Dự báo phụ thuộc ngày và số tiền do người dùng nhập; khoản thu dự kiến không được hiểu là tiền khả dụng. Dự báo theo ngày cũng không đảm bảo thanh khoản trong từng thời điểm của ngày.

Chi tiết payload, bảo mật, thiết lập và vận hành xem [README gốc](../README.md); trạng thái roadmap xem [roadmap](roadmap.md). Đặc tả gốc: [finpilot.doc](../../finpilot.doc).
