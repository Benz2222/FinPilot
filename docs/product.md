# Sản phẩm

Nguồn: doc "Nội Dung App Tài Chính FINPILOT" (spec chính), Form week 2, slide checkpoint 1–2.

## Vấn đề

FinPilot giúp chủ shop biết một quyết định nhập hàng hôm nay có khiến họ thiếu tiền trả các khoản bắt buộc sắp tới hay không, và thử các phương án trước khi chi tiền thật.

- **Khách hàng ban đầu:** chủ shop thời trang online tự nhập và giữ hàng, nhận tiền bán hàng/COD/tiền sàn theo đợt.
- **Câu hỏi cần trả lời:** "Nếu tôi nhập hàng hôm nay, những ngày tới tôi có đủ tiền trả lương, tiền thuê và công nợ không? Thiếu ngày nào, bao nhiêu?"
- **Nguyên nhân:** khoản phải trả đến hạn trước khi tiền bán hàng thực sự về; chủ shop nhìn số dư hiện tại nhưng chưa đặt quyết định nhập hàng lên cùng lịch thu–chi.
- **Định vị:** painkiller cho shop hay thiếu tiền theo đợt; vitamin cho shop có dự trữ ổn định. Domain D15 (Fintech) + D04 (SaaS).
- **Định hướng cốt lõi:** Kiểm tra lịch thu–chi → Phát hiện thiếu tiền → Thử phương án nhập hàng trước khi chi thật.

### Ví dụ chuẩn (đơn vị triệu đồng, ngày tương đối)

Shop có 50; muốn nhập 30 ngay; ngày 7 trả 25 lương + thuê; ngày 14 dự kiến thu 35.

- Nhập 30 ngay: còn 20 → ngày 7 thiếu 5. Khoản thu ngày 14 không cứu được hạn ngày 7.
- Chia đợt 20 ngay + 10 ngày 15: 30 → 5 → 40 → 30. Không âm.
- Nếu khoản 35 về trễ sang ngày 16, lần nhập thứ hai ngày 15 vẫn gây thiếu 5.

Đánh đổi của chia đợt (phí ship, mất chiết khấu, lỡ doanh thu) do chủ shop cân nhắc; app không quyết định thay.

### Giới hạn

FinPilot không tạo thêm vốn, không bảo đảm tiền về đúng lịch, không dự đoán chắc hàng nào bán chạy, không tự thanh toán. Giá trị cần chứng minh: dễ cập nhật hơn, ít bỏ sót nghĩa vụ hơn, so sánh phương án nhanh hơn cách shop đang làm. Không tuyên bố tính năng độc quyền.

## Phạm vi MVP

Thứ tự ưu tiên:

1. **Dữ liệu và lịch thu–chi:** nhập tay và import CSV/XLSX theo mẫu cố định; số dư tại ngày chốt, khoản phải thu/phải trả, ngày dự kiến, trạng thái; thanh toán toàn phần/một phần; tách tiền đã về khỏi tiền đang chờ; kiểm tra thiếu/trùng.
2. **Dự báo và cảnh báo:** số dư cuối mỗi ngày trong 8 tuần (56 ngày, là lựa chọn thử nghiệm); biểu đồ, số dư thấp nhất, ngày âm đầu tiên, mức thiếu lớn nhất và khoản liên quan. Không gọi là "dự báo AI".
3. **Mô phỏng:** tạo, đặt tên, lưu, so sánh kịch bản với phương án cơ sở: nhập ngay, nhập ít hơn, nhập muộn, chia đợt, tiền về trễ. Kịch bản không sửa dữ liệu thực tế.

Nền tảng: đăng nhập, khôi phục mật khẩu, cách ly dữ liệu theo shop (mỗi tài khoản một shop), lịch sử thay đổi, kiểm thử.

Luồng chính: đăng nhập → nhập số dư và lịch thu–chi → xem dự báo thiếu tiền → tạo phương án nhập hàng → so sánh → chủ shop tự quyết định.

**Chưa làm trong MVP:** Health Score, chatbot AI, OCR/đọc chứng từ, đồng bộ ngân hàng/POS/sàn, SKU và tối ưu tồn kho, kế toán/thuế, báo cáo lợi nhuận đầy đủ, app mobile, tự nhắc nợ, đề xuất vay, chi định kỳ lặp nâng cao (nhập thành từng dòng có ngày).

## Module dài hạn

Chỉ làm sau khi kiểm chứng nhu cầu; không phải cam kết MVP.

| Module | Ghi chú |
|---|---|
| Financial Data Hub | Phần nhập liệu thuộc MVP; tồn kho, khoản vay là mở rộng |
| Financial Dashboard | Doanh thu, chi phí, lợi nhuận, burn rate/runway; báo thiếu dữ liệu thay vì coi là 0 |
| Financial Health Score | 0–100, trọng số đã bàn: thanh khoản 30, dòng tiền 25, lợi nhuận 20, công nợ 15, ổn định 10. Không phải xếp hạng tín dụng |
| Cash-flow Forecast & Early Warning | Lõi MVP |
| Scenario Simulator | Lõi MVP cho nhập hàng; tuyển dụng, giá bán, vay vốn là mở rộng |
| Recommendation & Action Plan | Dựa trên quy tắc, chưa cần AI |
| Bonus | AI assistant (chỉ giải thích số do engine tính), anomaly detection, inventory optimization, invoice & debt collection, benchmarking, bank/accounting integration, credit readiness report |

## Nguyên tắc tính toán

- Số dư cuối ngày = số dư đầu ngày + tiền vào − tiền ra. Thiếu hụt lớn nhất = max(0, −số dư thấp nhất). Số dư âm trên dự báo là khoản thiếu cần xử lý.
- VND là số nguyên: C# `decimal`, PostgreSQL `numeric(18,0)`, API truyền chuỗi. Từ chối số lẻ, không làm tròn. Ngày nghiệp vụ dùng `DateOnly`. Mọi kết quả tài chính chính thức tính ở backend.
- Snapshot đã gồm giao dịch đến hết ngày chốt; không cộng lại. Sau ngày chốt tính thanh toán thực tế và phần nghĩa vụ còn lại, không tính trùng.
- Khoản quá hạn phải được người dùng xác nhận ngày mới hoặc hiển thị là chưa giải quyết; không tự bỏ qua hay coi là đã trả.
- Tính theo ngày, chưa bảo đảm thanh khoản trong ngày; nếu thu và chi cùng ngày phải hiển thị giới hạn này.
- Kịch bản tham chiếu phiên bản dữ liệu cơ sở; khi dữ liệu đổi phải báo cần tính lại.

## Tiêu chí nghiệm thu MVP

- **Tính đúng:** 50 triệu, chi 30 ngày 0, chi 25 ngày 7, thu 35 ngày 14 → 20, −5, 30; ngày thiếu đầu tiên là ngày 7, mức thiếu lớn nhất 5 triệu.
- **Mô phỏng đúng:** thay khoản 30 bằng 20 ngày 0 + 10 ngày 15 → ngày 0/7/14/15 là 30/5/40/30. Khoản thu 35 chuyển sang ngày 16 → ngày 15 thiếu 5.
- **Dữ liệu đúng:** nhập lại cùng batch không nhân đôi; khoản 10 đã trả 4 còn 6; không cộng lại tiền đã nằm trong snapshot; từ chối ngày/số tiền sai, báo rõ dữ liệu thiếu.
- **An toàn:** tài khoản A không đọc/sửa/xóa được dữ liệu shop B, kể cả gọi API trực tiếp; có audit log, HTTPS, bản sao lưu đã thử khôi phục.
- **Dùng được:** mục tiêu ≥3/5 người thử tự hoàn thành nhập dữ liệu → nhận diện ngày/mức thiếu → so sánh phương án sau hướng dẫn ngắn; so sánh 3 phương án trong 10 phút sau khi có dữ liệu sạch.

Chỉ tiêu pilot (Form week 2, là mục tiêu chưa đạt): giảm ≥30% thời gian lập dự báo hằng tuần, cảnh báo thiếu tiền trước ≥14 ngày khi lịch và giả định cho phép.

## Mâu thuẫn cần chốt

Các checkpoint đang mâu thuẫn với spec ở một số điểm; danh sách và trạng thái: [conflicts.md](conflicts.md).
