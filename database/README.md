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

Tiền dùng `numeric(18,0)`, ngày nghiệp vụ `date`, thời điểm `timestamptz` UTC. API từ chối phần lẻ trước khi PostgreSQL có thể làm tròn. View `obligation_balances` tính settled/remaining/outstanding từ thanh toán chưa VOID; không lưu tổng đã thanh toán lần thứ hai.

Khóa ngoại tổ hợp bảo vệ snapshot hiện tại, nguồn import và liên kết thanh toán–nghĩa vụ theo shop (cả hướng thu/chi). API xác định shop từ Identity, không nhận shopId từ client. Mỗi write khóa hàng shop bằng `FOR UPDATE`, kiểm tra dữ liệu mới nhất, ghi tất cả thay đổi, tăng data_version một lần và thêm audit trong cùng transaction. Read toàn shop dùng REPEATABLE READ. Hash import đã ghi không được commit lại; việc ẩn lịch sử khi wipe không xóa ràng buộc này.

## Khác biệt so với SQL tham chiếu

- Không lưu preview/import_rows: preview vẫn stateless; commit nhận các dòng đã được người dùng chọn và kiểm tra lại toàn bộ. Source liên kết trực tiếp import_batches. UNIQUE(shop_id, file_sha256) thực thi hợp đồng chống nhập lại.
- Điều chỉnh (bao gồm resize/split) và outcome nằm trong scenarios.payload_json, không có scenario_adjustments. Khi baseFingerprint đổi, API chụp lại baseline trên cùng scenario ID theo hợp đồng frontend; không dùng cây child scenario/baseline bất biến của thiết kế tham chiếu. Kết quả lưu là cache; phép tính dự báo chính thức dùng backend forecast API.
- status dùng open/paid/cancelled theo API; paid bắt buộc có tổng thanh toán bằng amount. removed_at tách việc xóa khỏi việc hủy kế hoạch. Xóa nghĩa vụ hoặc wipe VOID các thanh toán bị loại khỏi dữ liệu hiện tại, vẫn giữ bản ghi cũ.
- payment_id là ID client, id là ID bản ghi ledger. Sửa thanh toán VOID bản ghi cũ và thêm bản ghi mới với cùng payment_id; UNIQUE có điều kiện chỉ áp dụng cho bản ghi đang hoạt động. Không cho chuyển payment_id sang nghĩa vụ/shop khác.
- Snapshot chỉ thêm và dùng con trỏ hiện tại; chưa có revision/supersedes, lý do hoặc xác nhận ack_snapshot_id. PUT balance xác nhận lại số dư cuối ngày; API hiện cho sửa cutoff và thanh toán trước cutoff theo hợp đồng ShopData. Không tự suy ra số dư bằng cách cộng lại thanh toán đã nằm trong snapshot.
- Chưa có category/counterparty/external reference, parent scenario, purge policy, phân quyền DB runtime riêng hay RLS. Triển khai cần cấp role tối thiểu riêng cho runtime và migration; API vẫn chịu trách nhiệm cách ly người dùng.

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
