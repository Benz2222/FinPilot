# Hướng dẫn Kiểm thử Dự án FinPilot (UI & Automation Testing Guide)

Tài liệu này được biên soạn chi tiết giúp bạn và team có thể tự mình kiểm tra toàn bộ hệ thống **FinPilot** — từ thao tác trực tiếp trên giao diện trình duyệt (UI) đến chạy các bài kiểm thử tự động (Unit / Integration / E2E).

---

## 1. Chuẩn bị & Khởi động Hệ thống (Local Dev)

Đảm bảo **Docker Desktop** đang mở trên máy tính của bạn trước khi thực hiện.

### Bước 1: Bật Database PostgreSQL (Docker)
Mở một cửa sổ Terminal (PowerShell) tại thư mục gốc `FinPilot` và chạy:
```bash
docker compose up -d
```
> Khi màn hình hiện `Container finpilot-postgres-1 Started` là database đã sẵn sàng tại `localhost:5432`.

### Bước 2: Khởi động Backend (.NET Core)
Tại cửa sổ Terminal đó (hoặc mở tab mới):
```bash
dotnet run --project backend/src/FinPilot.Api/FinPilot.Api.csproj
```
> Khi thấy thông báo `Now listening on: http://localhost:5281` là Backend đã chạy thành công.

### Bước 3: Khởi động Frontend (React + Vite)
Mở một cửa sổ Terminal khác:
```bash
cd frontend
npm run dev
```
> Frontend sẽ chạy tại `http://localhost:5173`. Mở trình duyệt và truy cập địa chỉ này.

---

## 2. Kịch bản Kiểm thử Trực quan trên Giao diện Web (UI Testing)

---

### Kịch bản 1: Đăng ký tài khoản & Thiết lập Shop ban đầu

1. **Mở trang đăng ký**: Truy cập `http://localhost:5173/dang-ky`.
2. **Nhập thông tin tài khoản**:
   - **Email**: Ví dụ `shopowner@gmail.com`
   - **Mật khẩu**: `MatKhau@123` (yêu cầu tối thiểu 6 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt).
   - **Nhập lại mật khẩu**: `MatKhau@123`
3. **Thao tác**: Bấm nút **Tạo tài khoản**.
4. **Kết quả kỳ vọng**:
   - Hệ thống tạo tài khoản thành công và tự động đăng nhập.
   - Nếu tài khoản mới chưa có Shop, hệ thống sẽ chuyển đến trang tạo Shop ban đầu (hoặc màn hình Kế hoạch dòng tiền).

---

### Kịch bản 2: Nhập nhanh nhiều khoản liên tiếp ("Lưu & thêm tiếp")

> **Mục tiêu**: Kiểm tra tính năng nhập liệu tốc độ cao (Item 2), giữ nguyên các trường chung (ngày, chiều thu/chi, phân loại) để không phải mở lại form nhiều lần.

1. **Truy cập**: Vào menu **Kế hoạch** (hoặc URL `http://localhost:5173/ke-hoach`).
2. **Mở form**: Bấm nút **+ Thêm khoản** (hoặc nút Thêm khoản chi / thu).
3. **Nhập khoản thứ nhất**:
   - **Chiều**: Chọn `Chi`
   - **Tên khoản**: Gõ `Tiền điện nước tháng này`
   - **Số tiền**: Gõ `2500000` (hệ thống tự format 2.500.000 đ)
   - **Ngày đến hạn**: Chọn ngày bất kỳ (ví dụ: `15/11/2026`)
   - **Danh mục / Nhãn**: `Vận hành`
4. **Thao tác "Lưu & thêm tiếp"**:
   - Bấm nút **"Lưu & thêm tiếp"**.
5. **Quan sát kết quả trên UI**:
   - ✅ Xuất hiện thông báo màu xanh: *"Đã lưu. Bạn có thể nhập tiếp khoản mới."*
   - ✅ Ô **Số tiền** được xóa trắng và **con trỏ chuột tự động nhảy vào ô Số tiền** để bạn có thể gõ ngay khoản tiếp theo mà không cần dùng chuột click.
   - ✅ Các trường **Ngày đến hạn**, **Chiều (Chi)**, **Danh mục** được giữ nguyên giá trị đã chọn.
   - ✅ Trên màn hình điện thoại (Mobile): Bottom sheet vẫn mở nguyên vị trí, không bị đóng lại.
6. **Nhập khoản thứ hai**:
   - Gõ tiếp số tiền: `1200000`
   - Đổi tên khoản thành: `Cước internet`
   - Bấm nút **"Lưu khoản tiền"** (nút lưu thông thường).
7. **Kết quả**: Form đóng lại. Cả 2 khoản `Tiền điện nước tháng này` và `Cước internet` đều xuất hiện ngay trên danh sách và biểu đồ dòng tiền cập nhật tương ứng.

---

### Kịch bản 3: Nhập file Excel/CSV, Sửa lỗi trực tiếp & Bỏ qua dòng lỗi (Item 1)

> **Mục tiêu**: Kiểm tra tính năng sửa lỗi dòng import trực tiếp trên UI và nút loại bỏ/khôi phục dòng mà không cần tải lại file.

1. **Chuẩn bị file dữ liệu**: Tạo một file văn bản đặt tên là `mau-test-loi.csv` trên máy tính với nội dung sau:
   ```csv
   Loại,Nội dung,Số tiền,Ngày,Đã thanh toán,Ghi chú
   Chi,Nhập hàng lô 1,15000000,2026-11-05,0,Hàng chuẩn
   Chi,Lô áo thun sai số tiền,-8000000,2026-11-08,0,Số âm bị lỗi
   Thu,Tiền hoàn trả sàn,3500000,ngay-mai,0,Ngày sai định dạng
   Chi,Khoản chi dư thừa,1000000,2026-11-12,0,Dòng muốn bỏ qua
   ```
2. **Tải file lên**:
   - Vào menu **Nhập file** (`http://localhost:5173/nhap-file`).
   - Kéo thả file `mau-test-loi.csv` vào khung hoặc bấm để chọn file.
3. **Quan sát màn hình "Kiểm tra" (Preview)**:
   - Dòng 1: Badge màu xanh **Hợp lệ**.
   - Dòng 2: Badge màu đỏ **Lỗi** kèm giải thích: *"Số tiền phải lớn hơn 0"*.
   - Dòng 3: Badge màu đỏ **Lỗi** kèm giải thích: *"Ngày không đúng định dạng YYYY-MM-DD"*.
   - Dòng 4: Badge màu xanh **Hợp lệ**.
   - Phía dưới: Nút xác nhận bị **vô hiệu hóa (disabled)** kèm cảnh báo màu vàng: *"Có dòng lỗi chưa được sửa hoặc loại bỏ. Vui lòng sửa hoặc loại bỏ để tiếp tục."*
4. **Thao tác sửa lỗi trực tiếp trên dòng 2**:
   - Tại dòng 2 (`Lô áo thun sai số tiền`), bấm nút **"Sửa"** (icon bút chì).
   - Khung sửa inline mở ra:
     - Đổi ô **Số tiền** từ `-8000000` thành `8000000`.
     - Bấm **"Áp dụng"**.
   - ✅ Dòng 2 ngay lập tức chuyển sang badge xanh **Hợp lệ**.
5. **Thao tác loại bỏ dòng thừa (Dòng 3 và Dòng 4)**:
   - Tại dòng 3 (dòng lỗi ngày không muốn sửa): bấm nút **"Loại bỏ"** (icon con mắt gạch chéo).
     - ✅ Dòng 3 mờ đi và hiện badge xám: **Đã bỏ qua**.
   - Tại dòng 4: bấm nút **"Loại bỏ"**.
     - ✅ Dòng 4 chuyển sang **Đã bỏ qua**. Nếu bấm lại nút **"Khôi phục"**, dòng sẽ trở lại bình thường.
6. **Xác nhận nhập dữ liệu**:
   - Quan sát nút bấm ở chân trang: Đã chuyển sang trạng thái kích hoạt (enabled) với nội dung:
     > **"Xác nhận nhập 2 khoản (đã bỏ qua 2 dòng)"**
   - Bấm nút **"Xác nhận nhập..."**.
   - ✅ Hệ thống chuyển về màn hình Kế hoạch, 2 khoản hợp lệ đã được lưu thành công vào cơ sở dữ liệu.

---

### Kịch bản 4: Tra cứu Lịch sử Thay đổi (Audit History) (Item 3)

> **Mục tiêu**: Kiểm tra nhật ký kiểm toán ghi lại mọi thay đổi và xem so sánh Trước/Sau (Diff).

1. **Truy cập**: Bấm vào mục **Lịch sử** trên thanh điều hướng bên trái (hoặc URL `http://localhost:5173/lich-su`).
2. **Quan sát danh sách nhật ký**:
   - Hệ thống hiển thị các hành động bạn vừa thực hiện:
     - `Tạo khoản: Tiền điện nước tháng này` (Hành động: **CREATE**)
     - `Tạo khoản: Cước internet` (Hành động: **CREATE**)
     - `Nhập khẩu 2 khoản từ file` (Hành động: **IMPORT**)
3. **Thử nghiệm Bộ lọc (Filter) & Phân trang**:
   - Nhấp vào ô lọc đối tượng: chọn `Khoản thu chi (Obligation)` -> Danh sách chỉ lọc ra các khoản tạo tay.
   - Chọn `Nhập file (ImportBatch)` -> Danh sách chỉ hiển thị các đợt import file.
4. **Xem chi tiết so sánh Dữ liệu (Diff Modal)**:
   - Bấm nút **"Chi tiết"** tại một bản ghi.
   - Hộp thoại popup hiện ra hiển thị:
     - **Dữ liệu trước thay đổi** (Old Data) và **Dữ liệu sau thay đổi** (New Data) định dạng JSON trực quan.
   - Bấm **"Đóng"** để thoát popup.

---

### Kịch bản 5: Mô phỏng Kịch bản Dòng tiền (Scenarios)

1. **Truy cập**: Vào menu **Kịch bản** (`http://localhost:5173/kich-ban`).
2. **Thêm kịch bản mới**: Bấm **+ Thêm kịch bản** (ví dụ: *Doanh số giảm 30%* hoặc *Chậm nhận tiền sàn 7 ngày*).
3. **Xem biểu đồ so sánh**:
   - Đường nét liền biểu thị dòng tiền thực tế hiện tại.
   - Đường nét đứt biểu thị dòng tiền theo kịch bản dự phòng.
   - Xem cảnh báo điểm chạm đáy (Trough Balance) và ngày có nguy cơ thiếu hụt tiền mặt.

---

### Kịch bản 6: Kiểm tra Giới hạn Tần suất (Rate Limiting) & Khóa tài khoản

> **Mục tiêu**: Đảm bảo an toàn bảo mật, chống tấn công dò mật khẩu (Brute-force).

1. **Test Khóa tài khoản (Account Lockout sau 5 lần sai mật khẩu)**:
   - Đăng xuất tài khoản hiện tại (`/api/auth/logout` hoặc bấm Đăng xuất).
   - Vào trang Đăng nhập (`http://localhost:5173/dang-nhap`).
   - Nhập email của bạn nhưng cố ý gõ sai mật khẩu liên tiếp 5 lần.
   - **Kết quả**: Sau lần thứ 5, tài khoản bị tạm khóa 15 phút, ngăn chặn kẻ xấu cố gắng thử mật khẩu tiếp theo.
2. **Test Giới hạn tần suất IP (Rate Limit 10 req/phút)**:
   - Nếu gửi quá 10 request đăng nhập liên tục trong vòng 1 phút từ cùng 1 máy tính, hệ thống sẽ trả về mã lỗi **HTTP 429 (Too Many Requests)**.

---

## 3. Chạy Toàn bộ Kiểm thử Tự động (Automated Commands)

Mở Terminal và chạy các lệnh sau để kiểm tra toàn bộ chất lượng mã nguồn:

### 3.1. Kiểm tra thuật toán Dự báo Dòng tiền (.NET Unit Tests)
```bash
dotnet test backend/tests/FinPilot.Engine.Tests/FinPilot.Engine.Tests.csproj
```
- ✅ **Kết quả**: `Passed! Total: 6, Failed: 0`.

### 3.2. Kiểm tra API Backend & Database (.NET Integration Tests)
```bash
dotnet test backend/tests/FinPilot.Api.Tests/FinPilot.Api.Tests.csproj
```
- ✅ **Kết quả**: `Passed! Total: 13, Failed: 0`.

### 3.3. Kiểm tra Frontend Logic & Store (Vitest)
```bash
cd frontend
npm test
```
- ✅ **Kết quả**: `Test Files: 7 passed, Tests: 18 passed`.

### 3.4. Kiểm tra Build Production (TypeScript + Vite)
```bash
cd frontend
npm run build
```
- ✅ **Kết quả**: `tsc -b && vite build` thành công `0 errors`.

### 3.5. Chạy Kiểm thử Trình duyệt Tự động (Playwright E2E)
```bash
cd frontend
npm run test:e2e
```
- Tự động mở trình duyệt và chạy xuyên suốt luồng: Auth -> Thêm khoản -> Sửa lỗi Import -> Xem Lịch sử Audit.

---

## 4. Tóm tắt Bảng kiểm tra Nghiệm thu (Acceptance Checklist)

| Tính năng kiểm tra | Cách kiểm tra | Kỳ vọng | Trạng thái |
|---|---|---|:---:|
| **Khởi chạy Local & DB** | `docker compose up -d` & `dotnet run` | DB kết nối tốt, backend lắng nghe 5281 | **ĐẠT** |
| **Đăng ký / Đăng nhập** | Form UI tại `/dang-ky` | Tạo tài khoản và session cookie bảo mật | **ĐẠT** |
| **Lưu & thêm tiếp** | Nút "Lưu & thêm tiếp" trên Form thu chi | Giữ ngày/chiều, xóa số tiền, auto-focus | **ĐẠT** |
| **Sửa lỗi trực tiếp khi Import** | Bấm "Sửa" trên dòng lỗi preview | Cập nhật trực tiếp không cần tải lại file | **ĐẠT** |
| **Loại bỏ / Khôi phục dòng** | Bấm "Loại bỏ" trên dòng preview | Dòng chuyển sang Đã bỏ qua, không commit | **ĐẠT** |
| **Lịch sử thay đổi (Audit)** | Màn hình `/lich-su` và nút Chi tiết | Phân trang, lọc đối tượng, modal so sánh Diff | **ĐẠT** |
| **Bảo vệ Brute-force & Rate Limit** | Rate limiter 10 req/min & lockout 5 lần | Trả về 429 hoặc khóa tài khoản an toàn | **ĐẠT** |
| **Kiểm thử tự động** | `dotnet test` & `npm test` | 100% test suites passed xanh lá | **ĐẠT** |
