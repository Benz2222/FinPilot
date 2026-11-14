# Cơ sở dữ liệu FinPilot

**EF Core migrations là nguồn duy nhất quản lý schema.** Không chạy `reference/finpilot_schema_postgresql.sql`; đó là thiết kế tham chiếu.

Identity dùng các bảng `public.AspNet*` với khóa người dùng `text`. `finpilot.shops.owner_user_id` có UNIQUE: mỗi tài khoản sở hữu tối đa một shop. Người dùng tạo shop qua API sau đăng ký.

## Schema hiện có

Migration `InitialIdentityAndShops` tạo Identity và shops. `ServerShopPersistence` bổ sung:

| Bảng | Dữ liệu và lịch sử |
| --- | --- |
| `balance_snapshots` | Số dư cuối ngày; chỉ thêm, current_snapshot_id trỏ snapshot được xác nhận gần nhất |
| `obligations` | Lịch thu/chi; cancelled giữ nguyên; xóa bằng removed_at |
| `cash_transactions` | Thanh toán thực tế; sửa bằng VOID + bản ghi mới, không sửa số tiền/ngày hay xóa |
| `import_batches` | Hash SHA-256 duy nhất theo shop; giữ lịch sử ngay cả sau thay thế/xóa dữ liệu |
| `scenarios` | Payload, điều chỉnh và kết quả jsonb; bản chụp dữ liệu cơ sở và phiên bản |
| `audit_logs` | Người thực hiện, thao tác, đối tượng, tóm tắt trước/sau, thời điểm UTC; chỉ thêm |

Migration `InventoryAndRevenue` bổ sung các bảng trong schema `finpilot`:

| Bảng | Dữ liệu và lịch sử |
| --- | --- |
| `products` | Tên, mã, đơn vị, giá mặc định, ngưỡng tồn thấp và archived; mã khác rỗng duy nhất theo shop |
| `stock_documents` | Chứng từ in/sale/out/count, ngày nghiệp vụ, ngày thu/chi, settled và obligation_id; xóa bằng removed_at |
| `stock_document_lines` | Sản phẩm, số lượng nguyên, đơn giá và thứ tự dòng; sửa bằng removed_at + dòng mới, không sửa nội dung hoặc DELETE |

Tồn kho và giá vốn không lưu thành số dư riêng: replay chứng từ đang hoạt động theo `(date, created_at, id)`. Nhập hàng tính bình quân gia quyền với độ chính xác decimal; xuất bán/xuất khác giữ giá bình quân, kiểm kê đặt số lượng bằng số đếm và trả chênh lệch. Tồn về 0 thì giá bình quân về 0; kiểm kê tăng từ tồn 0 (ví dụ tồn đầu kỳ) lấy giá vốn mặc định `cost_price` của sản phẩm. Giá hiển thị, giá trị tồn và giá vốn từng dòng làm tròn VND (nửa đồng làm tròn ra xa 0); báo cáo cộng giá vốn đã làm tròn từng dòng. Mọi sửa/xóa đều replay lại toàn bộ, từ chối nếu có tồn âm tại bất kỳ thời điểm nào. Sản phẩm có lịch sử chứng từ chỉ được archive khi DELETE.

Chứng từ in/sale tổng tiền > 0 sở hữu một obligation (Out/In), ngày đến hạn bằng cash.date. settled tạo đúng một thanh toán đủ tiền trên ngày đó; sửa thanh toán dùng VOID + bản ghi mới. Tổng bằng 0 không có obligation. Đổi loại chứng từ thay nghĩa vụ cũ bằng nghĩa vụ mới nếu cần; xóa chứng từ ẩn nghĩa vụ và VOID thanh toán. `obligations.stock_document_id` giữ chủ sở hữu cả với nghĩa vụ cũ đã ẩn, ngăn payload lịch cũ làm sống lại một khoản trùng. Khóa ngoại `(id, shop_id)` ở cả hai chiều và UNIQUE của liên kết hiện tại ngăn liên kết khác shop hoặc dùng chung nghĩa vụ. Ba bảng mới bật RLS theo cùng quy tắc role chủ bảng của các bảng hiện có.

`/api/shop` trả `obligations[].stockDocumentId` cho khoản thuộc chứng từ (trường chỉ đọc). PUT/DELETE khoản này từ lịch trả 409 `stock-document-owned`; sửa qua chứng từ kho. `PUT /api/shop/data` giữ nguyên kho và các nghĩa vụ thuộc kho kể cả khi không có trong payload, chấp nhận bản sao nghĩa vụ không thay đổi và trả 409 nếu bản sao bị sửa. Vì vậy thao tác thay thế/xóa dữ liệu lịch không xóa kho; muốn xóa kho phải xóa chứng từ theo thứ tự không gây tồn âm. Không dùng stockDocumentId client gửi để tạo liên kết.

Báo cáo bán hàng dùng ngày chứng từ và khoảng ngày đóng hai đầu, độc lập ngày thu tiền; tuần bắt đầu thứ Hai, tháng bắt đầu ngày 1, kỳ đầu có thể bắt đầu trước from nhưng chỉ cộng giao dịch trong khoảng. Mọi kỳ trong khoảng đều xuất hiện, kể cả không bán; sản phẩm sắp theo số lượng bán giảm dần rồi doanh thu. stockLoss cộng xuất khác và thiếu kiểm kê, không trừ khỏi grossProfit.

Tiền dùng `numeric(18,0)`, ngày nghiệp vụ `date`, thời điểm `timestamptz` UTC. API từ chối phần lẻ trước khi PostgreSQL có thể làm tròn. View `obligation_balances` tính settled/remaining/outstanding từ thanh toán chưa VOID; không lưu tổng đã thanh toán lần thứ hai.

Khóa ngoại tổ hợp bảo vệ snapshot hiện tại, nguồn import và liên kết thanh toán–nghĩa vụ theo shop (cả hướng thu/chi). API xác định shop từ Identity, không nhận shopId từ client. Mỗi write khóa hàng shop bằng `FOR UPDATE`, kiểm tra dữ liệu mới nhất, ghi tất cả thay đổi, tăng data_version một lần và thêm audit trong cùng transaction. Read toàn shop dùng REPEATABLE READ. Hash import đã ghi không được commit lại; việc ẩn lịch sử khi wipe không xóa ràng buộc này.

## Khác biệt so với SQL tham chiếu

- Không lưu preview/import_rows: preview vẫn stateless; commit nhận các dòng đã được người dùng chọn và kiểm tra lại toàn bộ. Source liên kết trực tiếp import_batches. UNIQUE(shop_id, file_sha256) thực thi hợp đồng chống nhập lại.
- Điều chỉnh (bao gồm resize/split) và outcome nằm trong scenarios.payload_json, không có scenario_adjustments. Khi baseFingerprint đổi, API chụp lại baseline trên cùng scenario ID theo hợp đồng frontend; không dùng cây child scenario/baseline bất biến của thiết kế tham chiếu. Kết quả lưu là cache; phép tính dự báo chính thức dùng backend forecast API.
- status dùng open/paid/cancelled theo API; paid bắt buộc có tổng thanh toán bằng amount. removed_at tách việc xóa khỏi việc hủy kế hoạch. Xóa nghĩa vụ hoặc wipe VOID các thanh toán bị loại khỏi dữ liệu hiện tại, vẫn giữ bản ghi cũ.
- payment_id là ID client, id là ID bản ghi ledger. Sửa thanh toán VOID bản ghi cũ và thêm bản ghi mới với cùng payment_id; UNIQUE có điều kiện chỉ áp dụng cho bản ghi đang hoạt động. Không cho chuyển payment_id sang nghĩa vụ/shop khác.
- Snapshot chỉ thêm và dùng con trỏ hiện tại; chưa có revision/supersedes, lý do hoặc xác nhận ack_snapshot_id. PUT balance xác nhận lại số dư cuối ngày; API hiện cho sửa cutoff và thanh toán trước cutoff theo hợp đồng ShopData. Không tự suy ra số dư bằng cách cộng lại thanh toán đã nằm trong snapshot.
- Chưa có category/counterparty/external reference, parent scenario, purge policy hay phân quyền DB runtime riêng. Cấu hình RLS và role chủ bảng khi triển khai nằm trong mục **Triển khai** của [README chính](../README.md#triển-khai); API vẫn chịu trách nhiệm cách ly người dùng.

## Quản lý schema

Từ thư mục gốc, cấu hình ConnectionStrings theo README chính:

```powershell
dotnet tool restore
dotnet ef migrations list --no-connect --project backend/src/FinPilot.Api
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet ef database update --project backend/src/FinPilot.Api
```

API không tự chạy migration khi khởi động. Design-time factory cho phép xem/tạo migration mà không cần cấu hình SMTP hoặc kết nối database khi dùng `--no-connect`.

Kiểm thử API dùng Testcontainers với PostgreSQL 17 thật và áp dụng migrations trên database tạm, không dùng SQL tham chiếu hoặc EF InMemory. Cần Docker đang chạy để thực hiện toàn bộ `dotnet test backend/FinPilot.slnx`.
