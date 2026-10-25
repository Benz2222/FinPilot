# Tuần 6: phản hồi người dùng

Nguồn: Google Doc form week 6 (ID trong [README](README.md#nguồn-trên-drive)).

## Việc phải làm

- **IT:** hoàn thiện sản phẩm tối thiểu, gửi demo cho **20 người, chia 4 đợt × 5 người**. Sau mỗi đợt ghi phản hồi và sửa theo câu trả lời. Đợt cuối phải có **video demo**. Thầy yêu cầu **bảng before/after** thống kê những gì đã sửa. Nếu tuần sau thuyết trình CP3, IT trình bày phần này.
- **MKT:** đọc requirement của lớp khác, làm phần business model và các phần còn thiếu cho CP3/CP4.
- **Họp dự kiến:** Chủ nhật cuối tuần này; tuần 8 (26/9–1/10); tuần 9 (2–8/10).

Bản demo cần ít nhất: nhập số dư và lịch thu–chi, xem ngày/mức thiếu, thử một phương án nhập hàng khác. Bản production làm được cả ba, dữ liệu lưu ở server (xem [roadmap.md](roadmap.md#backlog-và-trạng-thái)).

## Câu hỏi phản hồi

Yêu cầu: tìm insight và điểm chưa hài lòng; câu hỏi mở, không trắc nghiệm. Người thử làm nhiệm vụ trước, rồi trả lời.

**Nhiệm vụ:** "Shop bạn có 50 triệu. Bạn muốn nhập 30 triệu hàng hôm nay; ngày 7 phải trả 25 triệu lương và thuê; ngày 14 dự kiến nhận 35 triệu tiền sàn. Dùng FinPilot để biết có thiếu tiền không, rồi tìm một cách nhập hàng không bị thiếu." Ghi thời gian hoàn thành và chỗ bị kẹt.

UI/UX:
1. Lúc mới mở app, bạn hiểu mình cần làm gì đầu tiên không? Chỗ nào làm bạn khựng lại?
2. Bạn kể lại giúp: app nói shop thiếu tiền ngày nào, bao nhiêu, vì khoản nào?
3. Phần nào trên màn hình kết quả bạn thấy thừa, khó đọc hoặc gây hiểu nhầm?

Tính năng:
4. Lần nhập hàng gần nhất của bạn, bạn đã tính có đủ tiền bằng cách nào? So với cách đó, FinPilot nhanh hơn hay chậm hơn ở bước nào?
5. Có khoản thu/chi nào của shop bạn mà app chưa cho nhập được, hoặc nhập rất mất công?
6. Nếu chỉ được thêm một tính năng trước khi bạn dùng thật hằng tuần, đó là gì và vì sao?
7. Có lúc nào bạn không tin con số app đưa ra không? Vì sao?

Giá:
8. Hiện bạn tốn bao nhiêu tiền và bao nhiêu giờ mỗi tháng cho việc theo dõi tiền của shop (phần mềm, kế toán, thời gian tự làm)?
9. Nếu FinPilot giúp bạn tránh được một lần thiếu tiền, mức phí hằng tháng nào bạn thấy đáng, và mức nào thì bạn bỏ? Bạn so nó với khoản chi nào?

Giá ở CP2: khảo sát cho thấy 50.000–100.000 đ/tháng phổ biến nhất; câu 8–9 dùng để kiểm tra lại con số đó với người đã dùng thử.

## Ghi nhận theo đợt

Mỗi người một dòng. Không ghi tên thật hay số liệu thật của shop nếu chưa được đồng ý.

| Đợt | Mã người thử | Loại shop | Hoàn thành nhiệm vụ? | Thời gian | Kẹt ở đâu | Phản hồi chính | Câu trích nguyên văn |
|---|---|---|---|---|---|---|---|
| 1 | U01 | | | | | | |
| 1 | U02 | | | | | | |
| 1 | U03 | | | | | | |
| 1 | U04 | | | | | | |
| 1 | U05 | | | | | | |

Đợt 2–4 thêm U06–U20 theo cùng mẫu.

## Thử nghiệm mô phỏng 25 persona

Ngày 2026-10-25, 20 persona chủ shop online và 5 persona doanh nghiệp nhỏ do AI điều khiển trình duyệt dùng app thật trên production, mỗi persona một tài khoản `phamdaiduong044+ut01…ut25@gmail.com`. **Không có người thật tham gia**; điểm số, NPS và mức giá là AI chấm theo vai, thời gian là thời gian máy thao tác. Câu trả lời của 5 persona doanh nghiệp gần như cùng một khuôn, nên chỉ dùng làm tín hiệu về phạm vi. Bằng chứng từng phiên (ảnh, log, 12 câu trả lời) nằm ngoài repo, ở `E:\fp-usertest\`.

| | 20 chủ shop | 5 doanh nghiệp |
|---|---|---|
| Hoàn thành toàn bộ luồng | 20/20 | 5/5 |
| Đọc đúng ngày và mức thiếu | 20/20 | 5/5 |
| Độ dễ nhập liệu (1–5) | 3,75 | 3,80 |
| NPS | +10 | −40 |
| Mức giá chấp nhận/tháng | 0–100.000 đ, phần lớn 30.000–80.000 đ | 100.000–150.000 đ |

Persona thích nhất: câu kết luận nêu ngày thiếu, số tiền và khoản gây thiếu; tách tiền đang có khỏi tiền sàn chưa về; so sánh phương án mà không sửa dữ liệu thật. Doanh nghiệp coi FinPilot là công cụ lập kế hoạch đi kèm phần mềm kế toán, không thay thế. Đề xuất tính năng chưa làm nằm ở [roadmap.md](roadmap.md#đề-xuất-sau-thử-nghiệm-tuần-6).

## Bảng before/after

Mỗi thay đổi một dòng, dẫn tới phản hồi gây ra nó.

| # | Đợt phát hiện | Vấn đề (phiên gặp) | Before | After | Commit |
|---|---|---|---|---|---|
| 1 | Mô phỏng | Landing tiếng Anh trước app tiếng Việt (25/25) | Chỉ có tiếng Anh | Nút VI/EN; trình duyệt tiếng Việt mặc định tiếng Việt, nhớ lựa chọn | `d5769d4` |
| 2 | Mô phỏng | Bảng chi tiết từng ngày bị cắt chữ và số trên điện thoại (16/25) | Bảng 6 cột, ngày và tiền bị cắt | Danh sách theo ngày, mỗi khoản một dòng có số tiền riêng; ngày không có khoản gộp lại | `9172de4` |
| 3 | Mô phỏng | Bảng so sánh phương án quá dài trên điện thoại (16/25) | Mỗi phương án một thẻ, khoảng 1.100px | Mỗi phương án một dòng hai số (thiếu từ, thấp nhất), khoảng 500px | `9172de4` |
| 4 | Mô phỏng | Thiếu lần đầu và thiếu nặng nhất khác số tiền (15/25) | Kết luận chỉ nêu lần đầu, có thể dài 9 dòng | Tô nổi cả hai, tối đa 4 dòng trên điện thoại; ô đầu là "Thiếu nhiều nhất" | `9172de4` |
| 5 | Mô phỏng | Biểu đồ ghi "Ngày 5", kết luận ghi "sau 6 ngày" cho cùng một ngày | Hai cách đếm | Một cách đếm "sau N ngày" ở mọi nơi, có test | `9172de4` |
| 6 | Mô phỏng | Tên khoản dài làm trang Dự báo rộng hơn màn hình điện thoại | Phần bên phải bị cắt | Nút tự rút gọn nhãn, trang vừa màn hình | `9172de4` |

## Nháp trả lời form week 6

Viết theo những gì bản demo làm được và khớp [product.md](product.md). Bước 1 trong doc hiện dùng OCR/AI, không khớp sản phẩm, và còn ý dữ liệu bán kính 20 km / kịch bản 3–5 năm đã bị bỏ; xem [conflicts.md](conflicts.md).

**Bước 1 — Khác biệt.** Phần mềm bán hàng (KiotViet, Sapo, MISA) và Excel ghi lại những gì đã xảy ra. FinPilot nhìn về phía trước theo một câu hỏi cụ thể: nhập lô hàng này có làm shop thiếu tiền trả lương, thuê, nhà cung cấp không. Khác biệt chính:
- Đặt quyết định nhập hàng lên cùng lịch thu–chi, chỉ ra ngày thiếu đầu tiên, mức thiếu lớn nhất và khoản gây thiếu.
- Tách tiền đã về khỏi tiền sàn/COD đang chờ; không coi doanh thu trên sàn là tiền đang có.
- Thử phương án (nhập ít hơn, muộn hơn, chia đợt, tiền về trễ) mà không sửa dữ liệu thật.
- Giải thích được từng con số; chủ shop tự quyết định.

**Bước 2 — Tagline (đề xuất).** "Biết trước ngày thiếu tiền, trước khi nhập hàng." Phương án khác: "Thử nhập hàng trên giấy trước khi chi tiền thật."

**Bước 3 — Tính năng chính, theo thứ tự ưu tiên.**
1. Dự báo số dư theo ngày trong 56 ngày và cảnh báo thiếu tiền (ngày, số tiền, nguyên nhân).
2. Mô phỏng phương án nhập hàng và tiền về trễ, so sánh với phương án gốc.
3. Lịch thu–chi: số dư đã xác nhận, khoản phải trả, khoản sắp thu, thanh toán một phần.
4. Import Excel/CSV theo mẫu, có xem trước và báo lỗi theo dòng.
5. Tài khoản riêng, dữ liệu mỗi shop tách biệt, có lịch sử thay đổi.

Chỉ liệt kê tính năng nào bản demo đã chạy; tính năng chưa có ghi "đang phát triển".

**Bước 4 — Cách hoạt động.**
1. Đăng ký và tạo shop.
2. Nhập số dư tiền thực có ở ngày chốt (ngân hàng + tiền mặt, không tính tiền sàn chưa về).
3. Nhập các khoản sắp chi (lương, thuê, nhà cung cấp, quảng cáo) và sắp thu (tiền sàn, COD), mỗi khoản có ngày.
4. Nhập khoản nhập hàng định làm: số tiền và ngày.
5. Xem biểu đồ số dư 56 ngày; app tô đỏ những ngày âm và ghi rõ: "Nếu nhập 30 triệu hôm nay, bạn dự kiến thiếu 5 triệu vào ngày 7, trước khi khoản thu ngày 14 về."
6. Tạo phương án: giảm tiền nhập, dời ngày, chia hai đợt, hoặc giả sử tiền sàn về trễ; so sánh số dư thấp nhất và ngày thiếu giữa các phương án.
7. Chọn phương án, rồi cập nhật khi tiền thực tế về hoặc khoản được trả.

**Bước 5 — Video.** Video demo 2:55, lời đọc ElevenLabs tiếng Việt (giọng Viên), theo đúng nhiệm vụ ở trên; file nằm ngoài repo, nhóm tải lên rồi dán link.

**Bước 6 — Câu hỏi phản hồi.** Dùng mục [Câu hỏi phản hồi](#câu-hỏi-phản-hồi).

**Bước 7–8.** Bước 7 lấy từ [Thử nghiệm mô phỏng 25 persona](#thử-nghiệm-mô-phỏng-25-persona) và phải ghi rõ là mô phỏng; bước 8 lấy từ [bảng before/after](#bảng-beforeafter).
