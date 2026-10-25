# Lộ trình MVP

Nguồn: `FinPilot_MVP_Project_Plan.xlsm` (Sprint Plan, Backlog, Setup Checklist) và mục F trong spec. Giả định: 6 tuần, mỗi IT 10–15 giờ/tuần; deadline và ngân sách hosting chưa chốt. Bảng database theo tuần nằm ở [database/README.md](../database/README.md).

## Sprint

| Tuần | Mục tiêu | Đầu ra |
|---|---|---|
| 1 | Kiểm chứng vấn đề, khóa phạm vi | Phỏng vấn 5 shop; quy tắc ngày chốt/thanh toán một phần/quá hạn; wireframe; khung repo .NET 10 + React; thiết kế Identity + 9 bảng; mẫu import và ca kiểm thử tham chiếu |
| 2 | Luồng nhập tay chạy được | Đăng nhập, shop, CRUD số dư/nghĩa vụ, engine; ca 50/30/25/35 hiện thiếu 5 triệu ngày 7 |
| 3 | Dữ liệu thực tế và import | Thanh toán một phần, VOID, audit, import CSV/XLSX có xem trước, lỗi theo dòng, commit nguyên tử, không nhân đôi |
| 4 | Mô phỏng nhập hàng | Baseline đóng băng; ADD/SHIFT/EXCLUDE; so sánh nhập ngay/ít hơn/muộn/chia đợt/tiền về trễ |
| 5 | Bảo mật, QA, pilot | Kiểm tra truy cập chéo shop, Playwright, reset mật khẩu, triển khai pilot, sao lưu/khôi phục |
| 6 | Thử với người dùng | Test 3–5 shop (lớp yêu cầu 20 người, xem [week6-feedback.md](week6-feedback.md)); sửa lỗi; hướng dẫn ngắn; demo; roadmap sau MVP |

## Backlog và trạng thái

Trạng thái đối chiếu với code và bản production ngày 2026-10-23. File plan trên Drive vẫn ghi tất cả "Not Started"; nên cập nhật theo bảng này.

| ID | Việc | Trạng thái |
|---|---|---|
| F01 | Phỏng vấn shop mục tiêu | Một phần: 2 hồ sơ phỏng vấn + khảo sát (xem [research.md](research.md)) |
| F02 | Quy tắc ngày chốt, thanh toán một phần, quá hạn | Xong trên giấy (spec); engine đã xử lý quá hạn |
| F03 | Wireframe | Chưa có file riêng; 4 màn hình demo đã dựng (Lịch thu–chi, Dự báo, Kịch bản, Nhập từ file) |
| F04 | Repo, .NET 10, React/Vite/TS, CI | Xong |
| F05 | Identity + thiết kế 9 bảng | Xong: migration `ServerShopPersistence`; khác biệt so với SQL tham chiếu ghi ở [database/README.md](../database/README.md) |
| F06 | Ca tham chiếu, mẫu CSV/XLSX | Xong: ca tham chiếu đã thành test; mẫu CSV/XLSX tải từ `GET /api/import/template` |
| F07 | Đăng nhập cookie, sở hữu shop | Xong: cookie HttpOnly, CSRF cho mọi thao tác ghi, mỗi tài khoản một shop |
| F08 | UI đăng nhập, tạo shop | Xong: đăng nhập, đăng ký, xác nhận email (trang `/confirm-email`, gửi lại), quên/đặt lại mật khẩu qua email, tạo shop, đăng xuất |
| F09–F11 | Snapshot, nghĩa vụ, form lưu dữ liệu | Xong: lưu ở server (PostgreSQL) |
| F12 | Engine dự báo C# thuần + test | Xong: `CashForecaster`, 6 test nghiệm thu |
| F13 | API dự báo + biểu đồ | Một phần: `POST /api/forecast/preview` không lưu trạng thái, biểu đồ và bảng 56 ngày |
| F14–F20 | Thanh toán thực tế, VOID, audit, import | Xong: thanh toán một phần, VOID, audit log, import CSV/XLSX commit nguyên tử, chặn nhập lại cùng file. Audit log mới được ghi, chưa có API/màn xem lịch sử thay đổi |
| F21–F25 | Kịch bản và so sánh | Xong: tạo, lưu ở server, so sánh nhiều kịch bản với hiện tại, báo cần tính lại khi dữ liệu đổi |
| F26–F31 | Bảo mật, QA, triển khai, sao lưu | Một phần: test tích hợp cách ly shop và CSRF trên PostgreSQL thật; đã triển khai HTTPS (Vercel + Render + Supabase) và kiểm tra luồng chính trên production; workflow sao lưu mã hóa hằng đêm đã cấu hình, mới thử khôi phục trên máy cục bộ. Chưa có: Playwright trong repo, giới hạn tần suất/khóa tạm đăng nhập, diễn tập khôi phục từ artifact GitHub |
| F32–F37 | Pilot, sửa lỗi, release, roadmap | Chưa |

Ngoài backlog: trang giới thiệu cho khách chưa đăng nhập ở `/` (`frontend/src/screens/landing`), có nút chuyển Việt/Anh.

## Đề xuất sau thử nghiệm tuần 6

Từ thử nghiệm mô phỏng 25 persona ngày 2026-10-25 (xem [week6-feedback.md](week6-feedback.md#thử-nghiệm-mô-phỏng-25-persona)). Số đếm là số phiên gặp vấn đề, không phải số người thật yêu cầu; cần kiểm chứng với shop thật trước khi làm. Chưa làm mục nào.

| Đề xuất | Lý do | Phiên gặp | Ghi chú phạm vi |
|---|---|---|---|
| Sửa dòng lỗi ngay trong bước xem trước khi nhập file | Hiện phải sửa file Excel rồi tải lên lại | 11/25 (7 shop, 4 doanh nghiệp) | Trong phạm vi MVP |
| Nhập nhanh nhiều khoản liên tiếp | Mỗi khoản phải điền lại cả form | 14/25 | Trong phạm vi MVP |
| Lấy khoản thu–chi từ phần mềm đang dùng (MISA, Sapo, KiotViet) | Phải chuẩn bị lại lịch thu–chi, đối chiếu tay | 10/25 (5 shop, 5/5 doanh nghiệp) | Tích hợp: ngoài MVP; trước mắt có thể là mẫu import khớp file xuất của các phần mềm này |
| Phân quyền cho kế toán, nhiều người dùng một shop | Chủ và kế toán không chia việc được | 5/5 doanh nghiệp | Ngoài MVP (mỗi tài khoản một shop) |
| Tách theo cơ sở/chi nhánh | Doanh nghiệp nhiều cửa hàng không xem riêng được | 5/5 doanh nghiệp | Ngoài MVP |

## Nguyên tắc quản lý

- Mỗi tuần demo một luồng chạy được; task chỉ xong khi có test, người review và chạy trên môi trường chung.
- Thiếu thời gian thì cắt animation và tùy biến giao diện trước; không cắt test tiền, đối soát hay cách ly dữ liệu.
- Không thêm tính năng ngoài phạm vi khi luồng chính chưa xong. AI, Health Score, tích hợp không được lặng lẽ thêm vào MVP.
- Không bịa kết quả pilot; dữ liệu mẫu phải gắn nhãn.
