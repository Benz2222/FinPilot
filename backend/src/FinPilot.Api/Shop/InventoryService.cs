using System.Data;
using System.Text.Json;
using FinPilot.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace FinPilot.Api.Shops;

public sealed partial class ShopService
{
    private const decimal MaxMoney = 999999999999999999m;
    private static decimal Vnd(decimal value) => decimal.Round(value, 0, MidpointRounding.AwayFromZero);
    private static ShopProblem OwnedObligation() => new(409, "Sửa hoặc xóa khoản thu/chi này trong chứng từ kho.", "stock-document-owned");

    private async Task RejectOwnedObligation(Domain.Shop shop, Guid id, CancellationToken ct)
    {
        if (await db.Obligations.AnyAsync(x => x.ShopId == shop.Id && x.Id == id && x.StockDocumentId != null, ct))
            throw OwnedObligation();
    }

    private static bool SameObligation(ObligationInput a, ObligationInput b) =>
        a.Direction == b.Direction && a.Label == b.Label && a.Amount == b.Amount && a.Date == b.Date &&
        a.Note == b.Note && a.Status == b.Status && a.ImportedFrom == b.ImportedFrom &&
        a.Payments.OrderBy(x => x.Id).SequenceEqual(b.Payments.OrderBy(x => x.Id));

    public async Task<InventoryResponse> ReadInventory(string owner, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct);
        var shop = await db.Shops.AsNoTracking().SingleOrDefaultAsync(x => x.OwnerUserId == owner, ct) ?? throw NoShop();
        var response = (await Replay(shop, ct)).Response;
        await tx.CommitAsync(ct);
        return response;
    }

    private Task<InventoryResponse> WriteInventory(string owner, string action, string entity, Guid id,
        Func<Domain.Shop, Task> change, CancellationToken ct) =>
        Write(owner, action, entity, id, change, async shop => (await Replay(shop, ct)).Response,
            (response, entityId) => JsonSerializer.Serialize(new
            {
                response.DataVersion, product = response.Products.SingleOrDefault(x => x.Id == entityId),
                document = response.Documents.SingleOrDefault(x => x.Id == entityId),
                productCount = response.Products.Length, documentCount = response.Documents.Length
            }, Json), ct);

    public Task<InventoryResponse> SaveProduct(string owner, Guid id, ProductInput input, CancellationToken ct) =>
        WriteInventory(owner, "upsert", "product", id, async shop =>
        {
            Validate(input);
            if (id == Guid.Empty || id != input.Id) throw Invalid("The route and product ID must match and be nonempty.");
            var row = await db.Products.SingleOrDefaultAsync(x => x.Id == id, ct);
            if (row is not null && row.ShopId != shop.Id) throw Missing();
            var code = input.Code.Trim();
            if (code.Length > 0 && await db.Products.AnyAsync(x => x.ShopId == shop.Id && x.Id != id && x.Code == code, ct))
                throw Invalid("Mã sản phẩm đã được sử dụng.");
            if (row is null)
            {
                row = new Product { Id = id, ShopId = shop.Id, Name = input.Name.Trim(), Code = code, Unit = input.Unit };
                db.Products.Add(row);
            }
            row.Name = input.Name.Trim(); row.Code = code; row.Unit = input.Unit;
            row.SalePrice = input.SalePrice; row.CostPrice = input.CostPrice;
            row.LowStockAt = input.LowStockAt; row.Archived = input.Archived;
        }, ct);

    public Task<InventoryResponse> DeleteProduct(string owner, Guid id, CancellationToken ct) =>
        WriteInventory(owner, "remove", "product", id, async shop =>
        {
            var row = await db.Products.SingleOrDefaultAsync(x => x.ShopId == shop.Id && x.Id == id, ct) ?? throw Missing();
            // Historical lines retain the product, even after the last document was removed.
            if (await db.StockDocumentLines.AnyAsync(x => x.ShopId == shop.Id && x.ProductId == id, ct)) row.Archived = true;
            else db.Products.Remove(row);
        }, ct);

    public Task<InventoryResponse> SaveDocument(string owner, Guid id, StockDocumentInput input, CancellationToken ct) =>
        WriteInventory(owner, "upsert", "stock-document", id, async shop =>
        {
            Validate(input);
            if (id == Guid.Empty || id != input.Id) throw Invalid("The route and document ID must match and be nonempty.");
            Unique(input.Lines.Select(x => x.ProductId));
            var monetary = input.Kind is "in" or "sale";
            if (monetary != (input.Cash is not null)) throw Invalid("Nhập hàng và bán hàng cần ngày thu/chi; xuất khác và kiểm kê không có thu/chi.");
            if (input.Lines.Any(x => input.Kind != "count" && x.Quantity == 0 || !monetary && x.UnitPrice != 0))
                throw Invalid("Số lượng phải lớn hơn 0; xuất khác và kiểm kê có đơn giá 0.");
            var productIds = input.Lines.Select(x => x.ProductId).ToArray();
            if (await db.Products.CountAsync(x => x.ShopId == shop.Id && productIds.Contains(x.Id), ct) != productIds.Length)
                throw Missing();
            decimal total = 0;
            foreach (var line in input.Lines)
            {
                var amount = line.Quantity * line.UnitPrice;
                if (amount > MaxMoney - total) throw Invalid("Tổng chứng từ vượt giới hạn tiền VND.");
                total += amount;
            }
            var row = await db.StockDocuments.SingleOrDefaultAsync(x => x.Id == id, ct);
            if (row is not null && row.ShopId != shop.Id) throw Missing();
            var now = DateTimeOffset.UtcNow;
            if (row is null)
            {
                row = new StockDocument { Id = id, ShopId = shop.Id, Kind = input.Kind, Date = input.Date,
                    Party = input.Party, Note = input.Note, CreatedAt = now };
                db.StockDocuments.Add(row);
            }
            if (row.ObligationId is Guid oldId && (total == 0 || row.Kind != input.Kind))
            {
                await RemoveObligation(shop, await db.Obligations.SingleAsync(x => x.ShopId == shop.Id && x.Id == oldId, ct), ct);
                row.ObligationId = null;
            }
            row.Kind = input.Kind; row.Date = input.Date; row.Party = input.Party.Trim(); row.Note = input.Note;
            row.CashDate = input.Cash?.Date; row.Settled = input.Cash?.Settled; row.RemovedAt = null;
            foreach (var line in await db.StockDocumentLines.Where(x => x.ShopId == shop.Id && x.DocumentId == id && x.RemovedAt == null).ToListAsync(ct))
                line.RemovedAt = now;
            await db.SaveChangesAsync(ct); // Retire old lines before reusing the active product key.
            for (var i = 0; i < input.Lines.Length; i++)
            {
                var line = input.Lines[i];
                db.StockDocumentLines.Add(new StockDocumentLine { ShopId = shop.Id, DocumentId = id, ProductId = line.ProductId,
                    Quantity = line.Quantity, UnitPrice = line.UnitPrice, Position = i });
            }
            if (monetary && total > 0)
            {
                var obligationId = row.ObligationId ?? Guid.NewGuid();
                var paymentId = await db.CashTransactions.Where(x => x.ShopId == shop.Id && x.ObligationId == obligationId && x.VoidedAt == null)
                    .Select(x => (Guid?)x.PaymentId).SingleOrDefaultAsync(ct) ?? Guid.NewGuid();
                var label = (input.Kind == "in" ? "Nhập hàng" : "Bán hàng") + (row.Party.Length == 0 ? "" : $" – {row.Party}");
                await UpsertObligation(shop, new ObligationInput
                {
                    Id = obligationId, Direction = input.Kind == "in" ? "Out" : "In", Label = label.Length > 200 ? label[..200] : label,
                    Amount = total, Date = input.Cash!.Date, Note = input.Note, Status = input.Cash.Settled ? "paid" : "open",
                    Payments = input.Cash.Settled ? [new PaymentInput { Id = paymentId, Amount = total, Date = input.Cash.Date }] : []
                }, ct, id);
                row.ObligationId = obligationId;
            }
        }, ct);

    public Task<InventoryResponse> DeleteDocument(string owner, Guid id, CancellationToken ct) =>
        WriteInventory(owner, "remove", "stock-document", id, async shop =>
        {
            var row = await db.StockDocuments.SingleOrDefaultAsync(x => x.ShopId == shop.Id && x.Id == id && x.RemovedAt == null, ct)
                ?? throw Missing();
            row.RemovedAt = DateTimeOffset.UtcNow;
            foreach (var line in await db.StockDocumentLines.Where(x => x.ShopId == shop.Id && x.DocumentId == id && x.RemovedAt == null).ToListAsync(ct))
                line.RemovedAt = row.RemovedAt;
            if (row.ObligationId is Guid obligationId)
                await RemoveObligation(shop, await db.Obligations.SingleAsync(x => x.ShopId == shop.Id && x.Id == obligationId, ct), ct);
            // The shared write's response replay rejects deleting stock that later sales rely on.
        }, ct);

    private sealed class Stock
    {
        public long Quantity;
        public decimal Average;
    }
    private sealed record SaleLine(Guid ProductId, DateOnly Date, long Quantity, decimal Revenue, decimal Cost);
    private sealed record Loss(DateOnly Date, decimal Value);
    private sealed record ReplayResult(InventoryResponse Response, List<SaleLine> Sales, List<Loss> Losses);

    private async Task<ReplayResult> Replay(Domain.Shop shop, CancellationToken ct)
    {
        var products = await db.Products.AsNoTracking().Where(x => x.ShopId == shop.Id).OrderBy(x => x.Name).ThenBy(x => x.Id).ToListAsync(ct);
        var documents = await db.StockDocuments.AsNoTracking().Where(x => x.ShopId == shop.Id && x.RemovedAt == null)
            .OrderBy(x => x.Date).ThenBy(x => x.CreatedAt).ThenBy(x => x.Id).ToListAsync(ct);
        var lines = (await db.StockDocumentLines.AsNoTracking().Where(x => x.ShopId == shop.Id && x.RemovedAt == null)
            .OrderBy(x => x.Position).ToListAsync(ct)).ToLookup(x => x.DocumentId);
        var stocks = products.ToDictionary(x => x.Id, _ => new Stock());
        var names = products.ToDictionary(x => x.Id, x => x.Name);
        var costs = products.ToDictionary(x => x.Id, x => x.CostPrice);
        var responses = new List<StockDocumentResponse>();
        var sales = new List<SaleLine>();
        var losses = new List<Loss>();
        foreach (var document in documents)
        {
            var resultLines = new List<DocLineResponse>();
            decimal total = 0;
            foreach (var line in lines[document.Id])
            {
                var stock = stocks[line.ProductId];
                var average = stock.Average;
                var difference = document.Kind == "count" ? line.Quantity - stock.Quantity : 0;
                var amount = line.Quantity * line.UnitPrice;
                total += amount;
                if (document.Kind == "in")
                {
                    stock.Average = (stock.Quantity * average + amount) / (stock.Quantity + line.Quantity);
                    stock.Quantity += line.Quantity;
                }
                else
                {
                    stock.Quantity = document.Kind == "count" ? line.Quantity : stock.Quantity - line.Quantity;
                    if (stock.Quantity < 0) throw Invalid($"Sản phẩm «{names[line.ProductId]}» không đủ tồn kho vào {document.Date:yyyy-MM-dd}.");
                    var cost = Vnd(line.Quantity * average);
                    if (document.Kind == "sale") sales.Add(new SaleLine(line.ProductId, document.Date, line.Quantity, amount, cost));
                    if (document.Kind == "out") losses.Add(new Loss(document.Date, cost));
                    if (document.Kind == "count" && difference < 0) losses.Add(new Loss(document.Date, Vnd(-difference * average)));
                    // Stock found by a count on an empty shelf (e.g. opening stock) is valued at the product's default cost.
                    if (document.Kind == "count" && difference > 0 && difference == line.Quantity) stock.Average = costs[line.ProductId];
                    if (stock.Quantity == 0) stock.Average = 0;
                }
                resultLines.Add(new DocLineResponse { ProductId = line.ProductId, Quantity = line.Quantity, UnitPrice = line.UnitPrice,
                    Difference = document.Kind == "count" ? difference : null, UnitCost = document.Kind == "in" ? null : Vnd(average) });
            }
            responses.Add(new StockDocumentResponse
            {
                Id = document.Id, Kind = document.Kind, Date = document.Date, Party = document.Party, Note = document.Note,
                Lines = resultLines.ToArray(), Total = total, ObligationId = document.ObligationId,
                Cash = document.CashDate is DateOnly date ? new DocumentCash { Date = date, Settled = document.Settled!.Value } : null
            });
        }
        return new ReplayResult(new InventoryResponse(shop.DataVersion, products.Select(x => new ProductResponse
        {
            Id = x.Id, Name = x.Name, Code = x.Code, Unit = x.Unit, SalePrice = x.SalePrice, CostPrice = x.CostPrice,
            LowStockAt = x.LowStockAt, Archived = x.Archived, OnHand = stocks[x.Id].Quantity,
            AverageCost = Vnd(stocks[x.Id].Average), StockValue = Vnd(stocks[x.Id].Quantity * stocks[x.Id].Average)
        }).ToArray(), responses.AsEnumerable().Reverse().ToArray()), sales, losses);
    }

    public async Task<SalesReport> Report(string owner, DateOnly from, DateOnly to, string group, CancellationToken ct)
    {
        if (from == DateOnly.MinValue || to == DateOnly.MinValue || from == DateOnly.MaxValue || to == DateOnly.MaxValue ||
            from > to || group is not ("day" or "week" or "month")) throw Invalid("Chọn khoảng ngày hợp lệ và nhóm day, week hoặc month.");
        await using var tx = await db.Database.BeginTransactionAsync(IsolationLevel.RepeatableRead, ct);
        var shop = await db.Shops.AsNoTracking().SingleOrDefaultAsync(x => x.OwnerUserId == owner, ct) ?? throw NoShop();
        var replay = await Replay(shop, ct);
        var sales = replay.Sales.Where(x => x.Date >= from && x.Date <= to).ToArray();
        static ReportFigures Figures(IEnumerable<SaleLine> rows)
        {
            var list = rows.ToArray();
            var revenue = list.Sum(x => x.Revenue); var cost = list.Sum(x => x.Cost);
            return new ReportFigures(list.Sum(x => x.Quantity), revenue, cost, revenue - cost);
        }
        DateOnly Start(DateOnly date) => group switch
        {
            "month" => new DateOnly(date.Year, date.Month, 1),
            "week" => date.AddDays(-((int)date.DayOfWeek + 6) % 7),
            _ => date
        };
        var grouped = sales.ToLookup(x => Start(x.Date));
        var periods = new List<ReportPeriod>();
        for (var date = Start(from); date <= to;)
        {
            var figures = Figures(grouped[date]);
            periods.Add(new ReportPeriod(date, figures.UnitsSold, figures.Revenue, figures.CostOfGoods, figures.GrossProfit));
            var next = group == "month" ? DateTime.DaysInMonth(date.Year, date.Month) : group == "week" ? 7 : 1;
            if (DateOnly.MaxValue.DayNumber - date.DayNumber < next) break;
            date = date.AddDays(next);
        }
        var totals = Figures(sales);
        var names = replay.Response.Products.ToDictionary(x => x.Id, x => x.Name);
        var products = sales.GroupBy(x => x.ProductId).Select(rows =>
        {
            var f = Figures(rows);
            return new ReportProduct(rows.Key, names[rows.Key], f.UnitsSold, f.Revenue, f.CostOfGoods, f.GrossProfit);
        }).OrderByDescending(x => x.UnitsSold).ThenByDescending(x => x.Revenue).ThenBy(x => x.ProductId).ToArray();
        var report = new SalesReport(from, to, group,
            new ReportTotals(totals.UnitsSold, totals.Revenue, totals.CostOfGoods, totals.GrossProfit,
                replay.Response.Documents.Count(x => x.Kind == "sale" && x.Date >= from && x.Date <= to)),
            periods.ToArray(), products, replay.Losses.Where(x => x.Date >= from && x.Date <= to).Sum(x => x.Value));
        await tx.CommitAsync(ct);
        return report;
    }
}
