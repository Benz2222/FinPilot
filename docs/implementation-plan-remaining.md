# Kế hoạch triển khai phần còn lại của FinPilot

Ngày lập: 2026-10-28. Kế hoạch được đối chiếu giữa code hiện tại, [roadmap MVP](roadmap.md), [đặc tả sản phẩm](../../finpilot.doc) và [danh sách tính năng đã triển khai](features-implemented.md).

## Mục tiêu và nguyên tắc

Hoàn thiện luồng MVP cốt lõi: **nhập/cập nhật lịch thu–chi → xem ngày và mức thiếu → so sánh phương án nhập hàng → chủ shop tự quyết định**. Không mở rộng sang Health Score, AI hay tích hợp ngoài trước khi đóng các khoảng trống MVP và kiểm chứng với shop thật.

Roadmap ghi một số hạng mục là “một phần” hoặc “chưa”, nhưng không phải mục nào cũng cần code. Phỏng vấn khách hàng, diễn tập khôi phục và pilot là công việc sản phẩm/vận hành; chúng có thể kéo theo sửa code nhưng không được tính là đã hoàn thành chỉ vì code đã merge.

## Đã có, không lập lại thành backlog

- Tài khoản, xác nhận email, đăng nhập cookie, CSRF, shop một tài khoản, lưu PostgreSQL.
- Số dư, nghĩa vụ thu/chi, thanh toán một phần, VOID, audit ghi ở backend.
- Engine và API preview dự báo; màn dự báo, biểu đồ/bảng ngày.
- Lưu và so sánh kịch bản; import CSV/XLSX có xem trước và commit chống trùng file.
- Triển khai production và workflow sao lưu mã hóa đã cấu hình.

## Lộ trình đề xuất

### Giai đoạn 1 — Khép kín các luồng dữ liệu MVP

**1. Chỉnh sửa dòng lỗi ngay trong preview import** — Ưu tiên cao

- Cho sửa các trường hợp lệ ở từng dòng preview; giữ thông báo lỗi và kiểm tra lại ngay khi sửa.
- Chỉ cho commit khi tất cả dòng được sửa hợp lệ hoặc người dùng chủ động loại dòng khỏi batch; xác nhận số dòng sẽ nhập/bỏ.
- Giữ nguyên tính nguyên tử của commit và chống nhập lại cùng file. Không cho phép sửa âm thầm dữ liệu sau khi commit.
- Hoàn thiện trạng thái loading/lỗi và khả năng tiếp cận bàn phím trên màn hình import.
- Nghiệm thu: một dòng sai có thể sửa và commit mà không tải file lên lần nữa; batch có lỗi chưa xử lý không ghi bất kỳ dữ liệu nào; upload lại cùng file vẫn được cảnh báo/trả lỗi trùng như hiện tại.

**2. Nhập nhanh nhiều khoản liên tiếp** — Ưu tiên cao

- Thêm chế độ “lưu và thêm khoản tiếp”; giữ lại các giá trị dùng chung hợp lý (loại thu/chi, trạng thái hoặc ngày nếu người dùng chọn), tạo ID mới cho mỗi khoản.
- Sau khi lưu, cập nhật lịch và dự báo qua cơ chế lưu hiện có; hiển thị lỗi theo khoản và không mất dữ liệu form khi API thất bại.
- Nghiệm thu: thêm liên tiếp nhiều khoản không phải mở lại form từ đầu; mỗi khoản được lưu đúng một lần và xuất hiện trong lịch/dự báo.

**3. Tra cứu lịch sử thay đổi** — Ưu tiên cao

- Thêm API đọc audit có phân trang, sắp xếp mới nhất trước và chỉ trả sự kiện thuộc shop hiện tại.
- Chỉ trả thông tin cần cho người dùng: thời điểm, loại hành động, loại/ID bản ghi và bản tóm tắt trước/sau đã loại bỏ dữ liệu nhạy cảm.
- Thêm màn hình lịch sử trong ứng dụng với lọc theo loại bản ghi và trạng thái rỗng/lỗi.
- Kiểm tra quyền sở hữu ở truy vấn repository/DB boundary; không chấp nhận shop ID tùy ý từ client.
- Nghiệm thu: thao tác đổi số dư/nghĩa vụ/kịch bản/import có thể tra cứu theo audit hiện có; người dùng shop A không xem được lịch sử shop B; payload không làm lộ thông tin xác thực hoặc dữ liệu nhạy cảm.

### Giai đoạn 2 — Bảo mật và kiểm thử hồi quy

**4. Giới hạn thử đăng nhập và chống dò mật khẩu** — Ưu tiên cao

- Rà cấu hình Identity hiện tại; bổ sung giới hạn tần suất phù hợp cho login và luồng gửi email xác nhận/khôi phục mật khẩu.
- Phản hồi lỗi không tiết lộ email có đăng ký hay không; không ghi mật khẩu, token hoặc link nhạy cảm vào log.
- Xác định cách hoạt động sau nhiều lần sai, thời gian chờ và phản hồi API nhất quán; kiểm thử trường hợp hợp lệ không bị khóa nhầm.
- Nghiệm thu: vượt ngưỡng bị giới hạn theo cấu hình; hành vi hoạt động trên nhiều instance production; có log vận hành an toàn để phát hiện lạm dụng.

**5. Bổ sung kiểm thử trình duyệt Playwright** — Ưu tiên cao

- Thiết lập project E2E trong frontend và cách chạy ổn định trong CI, dùng database test riêng.
- Bao phủ luồng chính: đăng ký/đăng nhập, tạo shop, nhập số dư và nghĩa vụ, xem dự báo, tạo/so sánh kịch bản, preview/commit import, đăng xuất/khôi phục phiên.
- Thêm kiểm tra hành vi lỗi quan trọng: CSRF, shop chưa tồn tại, import trùng, validation, mất mạng khi lưu.
- Nghiệm thu: CI chạy được trên môi trường sạch; test không gọi production và không phụ thuộc dữ liệu thật; lỗi hiển thị có thể chẩn đoán qua artifact/log không chứa bí mật.

**6. Diễn tập khôi phục backup** — Công việc vận hành kèm cập nhật mã nếu cần

- Lấy một artifact backup mã hóa từ workflow GitHub, khôi phục vào database cô lập, xác minh migrations/dữ liệu và đăng nhập bằng tài khoản thử.
- Ghi lại thời gian khôi phục, bước thực hiện, lỗi gặp và người chịu trách nhiệm giữ passphrase.
- Nếu thủ tục hiện tại chưa tái lập được, sửa workflow/script/tài liệu, rồi diễn tập lại.
- Nghiệm thu: có bằng chứng khôi phục thành công từ artifact thực, không chỉ từ backup tạo cục bộ; không ghi connection string/passphrase vào repo hoặc log.

### Giai đoạn 3 — Pilot và hoàn tất MVP

**7. Kiểm chứng với shop thật trước khi chốt mở rộng**

- Tuyển 3–5 shop mục tiêu; dùng dữ liệu họ đồng ý chia sẻ hoặc dữ liệu đã ẩn danh.
- Quan sát tác vụ nhập lịch, nhận diện thiếu hụt và so sánh ít nhất ba phương án; ghi thời gian, lỗi nhập, cách hiểu cảnh báo và nhu cầu cập nhật dữ liệu.
- Đối chiếu tình huống với Excel/cách hiện tại. Gắn nhãn rõ mục tiêu thử nghiệm với kết quả đã quan sát; không ghi mục tiêu 30%/14 ngày là kết quả nếu chưa đo được.
- Nghiệm thu: có báo cáo pilot, danh sách lỗi theo mức độ, quyết định tiếp tục/sửa phạm vi và backlog được ưu tiên. Cỡ mẫu nhỏ chỉ cho tín hiệu ban đầu.

**8. Sửa lỗi, phát hành và bàn giao**

- Ưu tiên lỗi tính toán, đối soát, quyền truy cập, mất dữ liệu và khả năng hoàn thành luồng chính.
- Cập nhật hướng dẫn sử dụng, giới hạn dự báo, giả định đầu vào, quy trình hỗ trợ và trạng thái triển khai.
- Rà lại checklist release: CI, migration, HTTPS/cookie/CSRF, email, backup/restore, health check và smoke test sau deploy.
- Nghiệm thu: luồng chính chạy trên môi trường pilot/production; không còn lỗi nghiêm trọng đã biết; có người phụ trách xử lý sự cố và bản phát hành được gắn phiên bản.

## Sau MVP — Chỉ làm khi có bằng chứng nhu cầu

1. **Tương thích file xuất từ MISA/Sapo/KiotViet**: bắt đầu bằng parser/mapping và mẫu import; đánh giá từng định dạng với file thật đã ẩn danh. Tích hợp API trực tiếp là phạm vi riêng.
2. **Nhiều người dùng trong một shop và vai trò kế toán**: cần thiết kế membership/role, migration dữ liệu, kiểm tra quyền ở mọi truy vấn và quy trình mời/thu hồi thành viên. Không mở rộng cho tới khi chốt mô hình tenant.
3. **Nhiều chi nhánh**: phụ thuộc mô hình nhiều shop/thành viên; cần xác định báo cáo toàn doanh nghiệp và phân quyền theo chi nhánh.
4. **Dashboard tài chính mở rộng, Health Score, đề xuất hành động, AI, tối ưu tồn kho, nhắc nợ tự động, tích hợp ngân hàng/POS/kế toán**: ngoài MVP; cần yêu cầu riêng, nguồn dữ liệu đủ tin cậy và tiêu chí đo lường trước khi lập kế hoạch triển khai.

## Thứ tự và điều kiện bắt đầu

| Thứ tự | Hạng mục | Phụ thuộc chính |
|---|---|---|
| 1 | Sửa dòng lỗi import trong preview | Hợp đồng import hiện tại |
| 2 | Nhập nhanh nhiều khoản | Luồng lưu nghĩa vụ hiện tại |
| 3 | API và UI audit history | Cấu trúc audit, kiểm tra cách ly shop |
| 4 | Giới hạn đăng nhập | Cấu hình Identity và kiến trúc nhiều instance |
| 5 | Playwright E2E | Môi trường API + PostgreSQL test ổn định |
| 6 | Diễn tập khôi phục | Artifact backup và quyền truy cập bí mật vận hành |
| 7 | Pilot, sửa lỗi, release | Hoàn tất các luồng ưu tiên và có shop tham gia |

Không có effort estimate đáng tin cậy trong tài liệu nguồn; chia mỗi hạng mục thành issue nhỏ sau khi chốt người phụ trách và môi trường chạy. Mọi thay đổi tiền, phân quyền, import và audit phải có kiểm tra tự động phù hợp trước khi phát hành.
