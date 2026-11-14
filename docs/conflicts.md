# Mâu thuẫn cần chốt

Doc week 6 yêu cầu "tất cả nội dung phải match với các checkpoint trước", nhưng các checkpoint đang mâu thuẫn với nhau. Mỗi mục dưới đây cần team hội ý và ghi lại quyết định.

Sản phẩm đang xây theo spec ([product.md](product.md)). Đề xuất chung: giữ các ý vượt MVP làm **tầm nhìn sau MVP**, còn mọi câu trả lời form, slide và demo chỉ nói những gì bản chạy được thực sự làm. Nhóm MKT và IT cần chốt trước CP3.

| # | Chủ đề | Trạng thái |
|---|---|---|
| 1 | [Nhập liệu: OCR hay Excel/CSV](#1-nhập-liệu) | Chờ hội ý |
| 2 | [AI](#2-ai) | Chờ hội ý |
| 3 | [Health Score](#3-health-score) | Chờ hội ý |
| 4 | [Cách nói về điểm khác biệt](#4-cách-nói-về-điểm-khác-biệt) | Chờ hội ý |
| 5 | [Khách hàng mục tiêu](#5-khách-hàng-mục-tiêu) | Chờ hội ý |
| 6 | [Khung dự báo](#6-khung-dự-báo) | Chờ hội ý |
| 7 | [Quy mô thị trường](#7-quy-mô-thị-trường) | Chờ hội ý |
| 8 | Tồn kho | Đã chốt 2026-11-14 |
| — | [Kịch bản 3–5 năm, dữ liệu 20 km](#đã-chốt) | Đã bỏ |

## 1. Nhập liệu

- **Spec, Form week 2:** nhập tay và import CSV/XLSX theo mẫu cố định.
- **Form week 3, slide CP2, week 6 Bước 1:** OCR sổ tay và đọc Excel tự động "trong vài giây".
- **Cần chốt:** OCR là tính năng hiện tại hay hướng phát triển sau?

## 2. AI

- **Spec:** MVP không có AI, không gọi là "dự báo AI". AI sau này chỉ giải thích số do engine tính, không tự tạo số.wdqwdqwdqwdqw
- **Form week 3, slide CP2, week 6 Bước 1:** AI chấm điểm sức khỏe tài chính, AI phát hiện bất thường, cảnh báo FOMO real-time.
- **Cần chốt:** có nhắc AI trong form/slide không; nếu có thì ghi "sau MVP" thế nào?

## 3. Health Score

- **Spec:** sau MVP; điểm 72/100 không trả lời được "ngày nào thiếu bao nhiêu".
- **Slide CP1:** module lõi thứ 2. **Slide CP2:** Step 4 của giải pháp.
- **Cần chốt:** Health Score có nằm trong phần giới thiệu sản phẩm không?

## 4. Cách nói về điểm khác biệt

- **Spec, Form week 2:** không tuyên bố độc quyền; ưu thế phải chứng minh qua thử nghiệm.
- **Form week 3:** bảng so sánh khẳng định FinPilot hơn KiotViet/Sapo/MISA, Excel và tư vấn ở mọi tiêu chí.
- **Cần chốt:** giọng điệu khi so sánh đối thủ.

## 5. Khách hàng mục tiêu

- **Spec:** shop thời trang online tự nhập hàng, nhận tiền sàn/COD theo đợt.
- **Form week 3:** chủ hộ kinh doanh online và offline.
- **Slide CP2:** beachhead "small and retail businesses"; persona Phạm Thị Thủy ghi sổ tay, chỉ nhập khi hết hàng.
- **Form week 2 (tiếng Anh):** "small shop".
- **Cần chốt:** một định nghĩa khách hàng dùng chung cho mọi tài liệu.

## 6. Khung dự báo

- **Spec và app:** 56 ngày (8 tuần), là lựa chọn thử nghiệm.
- **Slide CP1:** 8–12 tuần.
- **Cần chốt:** con số dùng khi trình bày.

## 7. Quy mô thị trường

- **Form week 3, slide CP2:** TAM 3,1 tỷ USD là doanh thu bán thời trang online; SAM 930 triệu USD và SOM 93.000 USD suy ra từ đó.
- **Vấn đề:** đó là tiền shop bán hàng, không phải tiền shop chi cho phần mềm tài chính, nên cả ba con số đều lệch.
- **Đề xuất:** tính lại theo số shop mục tiêu × giá gói (khảo sát: 50.000–100.000 đ/tháng phổ biến nhất). Số liệu gốc ở [research.md § Thị trường](research.md#thị-trường).

## Đã chốt

| Ngày | Quyết định | Việc kéo theo |
|---|---|---|
| 2026-10-22 | Bỏ kịch bản tăng trưởng 3–5 năm từ dữ liệu môi trường bán kính 20 km, kể cả dưới dạng tầm nhìn | Xóa khỏi Form week 3 (dòng "Dự báo tăng trưởng 3–5 năm" và gạch đầu dòng thứ ba của "Điểm khác biệt cốt lõi"), slide CP2 (Step 5 trang Solution và vế cuối core value statement), form week 6 Bước 1 |
| 2026-11-14 | Đưa kho và doanh thu vào sản phẩm: hàng hoá mỗi mẫu một dòng, nhập/xuất/kiểm kê, lãi gộp; chưa có size/màu (xem [product.md](product.md#phạm-vi-mvp)) | Form, slide và demo được nói FinPilot có quản lý kho và báo cáo doanh thu; không nói có biến thể size/màu hay lãi ròng |

Khi chốt một mục ở trên, chuyển nó xuống bảng này và sửa [product.md](product.md) nếu phạm vi thay đổi.
