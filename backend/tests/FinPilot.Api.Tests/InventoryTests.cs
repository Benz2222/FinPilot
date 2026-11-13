using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using FinPilot.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace FinPilot.Api.Tests;

public sealed partial class ShopTests
{
    private static JsonObject InventoryProduct(string name = "Áo", string code = "") => new()
    {
        ["id"] = Guid.NewGuid().ToString(), ["name"] = name, ["code"] = code, ["unit"] = "cái",
        ["salePrice"] = "30", ["costPrice"] = "10", ["lowStockAt"] = null, ["archived"] = false
    };
    private static string ProductPath(JsonObject product) => $"/api/shop/inventory/products/{product["id"]}";
    private static string DocumentPath(JsonObject document) => $"/api/shop/inventory/documents/{document["id"]}";
    private static JsonObject StockLine(JsonObject product, int quantity, string price = "0") => new()
    {
        ["productId"] = product["id"]!.DeepClone(), ["quantity"] = quantity, ["unitPrice"] = price
    };
    private static JsonObject StockDocument(string kind, string date, params JsonObject[] lines) => new()
    {
        ["id"] = Guid.NewGuid().ToString(), ["kind"] = kind, ["date"] = date, ["party"] = "Shop", ["note"] = "",
        ["lines"] = new JsonArray(lines.Cast<JsonNode?>().ToArray()),
        ["cash"] = kind is "in" or "sale" ? new JsonObject { ["date"] = date, ["settled"] = false } : null
    };
    private static async Task<JsonObject> Inventory(HttpClient client) => (await client.GetFromJsonAsync<JsonObject>("/api/shop/inventory"))!;
    private static Task<JsonObject?> Sales(HttpClient client, string from = "2026-01-01", string to = "2026-01-31", string group = "day") =>
        client.GetFromJsonAsync<JsonObject>($"/api/shop/inventory/report?from={from}&to={to}&group={group}");

    [Fact]
    public async Task BackdatedAndCorrectedReceiptsReplayWeightedCostAndSaleCogs()
    {
        using var client = await factory.Account();
        var product = InventoryProduct();
        await Put(client, ProductPath(product), product);
        var receipt = StockDocument("in", "2026-01-01", StockLine(product, 10, "10"));
        await Put(client, DocumentPath(receipt), receipt);
        var sale = StockDocument("sale", "2026-01-03", StockLine(product, 4, "30"));
        await Put(client, DocumentPath(sale), sale);
        Assert.Equal("40", (await Sales(client))!["totals"]!["costOfGoods"]!.GetValue<string>());
        var backdated = StockDocument("in", "2026-01-02", StockLine(product, 6, "20"));
        var saved = await Put(client, DocumentPath(backdated), backdated);
        Assert.Equal(12, saved["products"]![0]!["onHand"]!.GetValue<int>());
        Assert.Equal("14", saved["products"]![0]!["averageCost"]!.GetValue<string>());
        Assert.Equal("165", saved["products"]![0]!["stockValue"]!.GetValue<string>());
        Assert.Equal("55", (await Sales(client))!["totals"]!["costOfGoods"]!.GetValue<string>());
        backdated["lines"]![0]!["unitPrice"] = "30";
        saved = await Put(client, DocumentPath(backdated), backdated);
        Assert.Equal("210", saved["products"]![0]!["stockValue"]!.GetValue<string>());
        Assert.Equal("70", (await Sales(client))!["totals"]!["costOfGoods"]!.GetValue<string>());
        // Same-day documents retain their creation order through corrections.
        sale["date"] = "2026-01-01";
        await Put(client, DocumentPath(sale), sale);
        Assert.Equal("40", (await Sales(client))!["totals"]!["costOfGoods"]!.GetValue<string>());
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var backdatedId = Guid.Parse(backdated["id"]!.GetValue<string>());
        var history = await db.StockDocumentLines.Where(x => x.DocumentId == backdatedId).ToListAsync();
        Assert.Equal(2, history.Count);
        Assert.Single(history, x => x.RemovedAt != null);
        var tamper = await Assert.ThrowsAsync<PostgresException>(() => db.Database.ExecuteSqlInterpolatedAsync(
            $"UPDATE finpilot.stock_document_lines SET quantity = 9 WHERE document_id = {backdatedId} AND removed_at IS NULL"));
        Assert.Equal(PostgresErrorCodes.RaiseException, tamper.SqlState);
    }

    [Fact]
    public async Task NegativeHistoryRejectsCreateCorrectionAndDeleteWithoutChangingCashVersionOrAudit()
    {
        using var client = await factory.Account();
        var product = InventoryProduct();
        await Put(client, ProductPath(product), product);
        var receipt = StockDocument("in", "2026-01-02", StockLine(product, 5, "10"));
        await Put(client, DocumentPath(receipt), receipt);
        var sale = StockDocument("sale", "2026-01-03", StockLine(product, 4, "30"));
        await Put(client, DocumentPath(sale), sale);
        // Later stock cannot hide an earlier shortfall.
        var later = StockDocument("in", "2026-01-05", StockLine(product, 10, "10"));
        await Put(client, DocumentPath(later), later);
        var inventory = await Inventory(client);
        var shop = await client.GetFromJsonAsync<JsonObject>("/api/shop");
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var id = Guid.Parse(receipt["id"]!.GetValue<string>());
        var shopId = (await db.StockDocuments.AsNoTracking().SingleAsync(x => x.Id == id)).ShopId;
        var audits = await db.AuditLogs.CountAsync(x => x.ShopId == shopId);
        var invalid = StockDocument("sale", "2026-01-01", StockLine(product, 1, "30"));
        var rejected = await client.PutAsJsonAsync(DocumentPath(invalid), invalid);
        Assert.Equal(HttpStatusCode.BadRequest, rejected.StatusCode);
        Assert.Contains(product["name"]!.GetValue<string>(), (await rejected.Content.ReadFromJsonAsync<JsonObject>())!["title"]!.GetValue<string>());
        receipt["lines"]![0]!["quantity"] = 3;
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync(DocumentPath(receipt), receipt)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.DeleteAsync(DocumentPath(receipt))).StatusCode);
        Assert.True(JsonNode.DeepEquals(inventory, await Inventory(client)));
        Assert.True(JsonNode.DeepEquals(shop, await client.GetFromJsonAsync<JsonObject>("/api/shop")));
        Assert.Equal(audits, await db.AuditLogs.CountAsync(x => x.ShopId == shopId));
    }

    [Fact]
    public async Task StocktakesApplyCountDifferencesAndLossAtAverageCostWithoutCash()
    {
        using var client = await factory.Account();
        var product = InventoryProduct();
        await Put(client, ProductPath(product), product);
        var receipt = StockDocument("in", "2026-01-01", StockLine(product, 10, "12"));
        await Put(client, DocumentPath(receipt), receipt);
        var count = StockDocument("count", "2026-01-02", StockLine(product, 7));
        var saved = await Put(client, DocumentPath(count), count);
        var counted = saved["documents"]![0]!;
        Assert.Equal(-3, counted["lines"]![0]!["difference"]!.GetValue<int>());
        Assert.Equal("12", counted["lines"]![0]!["unitCost"]!.GetValue<string>());
        Assert.Null(counted["cash"]);
        Assert.Null(counted["obligationId"]);
        var outDoc = StockDocument("out", "2026-01-03", StockLine(product, 2));
        saved = await Put(client, DocumentPath(outDoc), outDoc);
        Assert.Equal(5, saved["products"]![0]!["onHand"]!.GetValue<int>());
        Assert.Equal("60", (await Sales(client))!["stockLoss"]!.GetValue<string>());
        var recount = StockDocument("count", "2026-01-04", StockLine(product, 8));
        saved = await Put(client, DocumentPath(recount), recount);
        Assert.Equal(3, saved["documents"]![0]!["lines"]![0]!["difference"]!.GetValue<int>());
        Assert.Equal("96", saved["products"]![0]!["stockValue"]!.GetValue<string>());
        Assert.Single((await client.GetFromJsonAsync<JsonObject>("/api/shop"))!["obligations"]!.AsArray());
        // Counting zero clears value; stock counted onto an empty shelf takes the product's default cost.
        recount["lines"]![0]!["quantity"] = 0;
        saved = await Put(client, DocumentPath(recount), recount);
        Assert.Equal("0", saved["products"]![0]!["stockValue"]!.GetValue<string>());
        var opening = StockDocument("count", "2026-01-05", StockLine(product, 4));
        saved = await Put(client, DocumentPath(opening), opening);
        Assert.Equal("40", saved["products"]![0]!["stockValue"]!.GetValue<string>());
    }

    [Fact]
    public async Task DocumentCashLifecycleKeepsOneObligationAndVoidsCorrectedSettlements()
    {
        using var client = await factory.Account();
        var product = InventoryProduct();
        await Put(client, ProductPath(product), product);
        var receipt = StockDocument("in", "2026-01-01", StockLine(product, 5, "10"));
        var before = await Inventory(client);
        var saved = await Put(client, DocumentPath(receipt), receipt);
        Assert.Equal(before["dataVersion"]!.GetValue<long>() + 1, saved["dataVersion"]!.GetValue<long>());
        var obligationId = saved["documents"]![0]!["obligationId"]!.GetValue<string>();
        var cash = (await client.GetFromJsonAsync<JsonObject>("/api/shop"))!["obligations"]![0]!;
        Assert.Equal("Out", cash["direction"]!.GetValue<string>());
        Assert.Equal("50", cash["amount"]!.GetValue<string>());
        Assert.Equal(receipt["id"]!.GetValue<string>(), cash["stockDocumentId"]!.GetValue<string>());
        Assert.Empty(cash["payments"]!.AsArray());
        receipt["cash"]!["settled"] = true;
        receipt["cash"]!["date"] = "2026-01-04";
        await Put(client, DocumentPath(receipt), receipt);
        cash = (await client.GetFromJsonAsync<JsonObject>("/api/shop"))!["obligations"]![0]!;
        Assert.Equal("paid", cash["status"]!.GetValue<string>());
        Assert.Equal("50", cash["payments"]![0]!["amount"]!.GetValue<string>());
        Assert.Equal("2026-01-04", cash["payments"]![0]!["date"]!.GetValue<string>());
        // An identical retry cannot add a second active settlement.
        await Put(client, DocumentPath(receipt), receipt);
        receipt["lines"]![0]!["unitPrice"] = "12";
        receipt["cash"]!["date"] = "2026-01-05";
        saved = await Put(client, DocumentPath(receipt), receipt);
        Assert.Equal(obligationId, saved["documents"]![0]!["obligationId"]!.GetValue<string>());
        var sale = StockDocument("sale", "2026-01-06", StockLine(product, 2, "30"));
        sale["cash"]!["settled"] = true;
        await Put(client, DocumentPath(sale), sale);
        var shop = await client.GetFromJsonAsync<JsonObject>("/api/shop");
        var saleCash = shop!["obligations"]!.AsArray().Single(x => x!["stockDocumentId"]!.GetValue<string>() == sale["id"]!.GetValue<string>())!;
        Assert.Equal("In", saleCash["direction"]!.GetValue<string>());
        Assert.Equal("paid", saleCash["status"]!.GetValue<string>());
        Assert.Single(saleCash["payments"]!.AsArray());
        (await client.DeleteAsync(DocumentPath(sale))).EnsureSuccessStatusCode();
        receipt["cash"]!["settled"] = false;
        await Put(client, DocumentPath(receipt), receipt);
        cash = (await client.GetFromJsonAsync<JsonObject>("/api/shop"))!["obligations"]![0]!;
        Assert.Equal("open", cash["status"]!.GetValue<string>());
        Assert.Empty(cash["payments"]!.AsArray());
        receipt["cash"]!["settled"] = true;
        await Put(client, DocumentPath(receipt), receipt);
        (await client.DeleteAsync(DocumentPath(receipt))).EnsureSuccessStatusCode();
        Assert.Empty((await client.GetFromJsonAsync<JsonObject>("/api/shop"))!["obligations"]!.AsArray());
        Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsJsonAsync($"/api/shop/obligations/{cash["id"]}", cash)).StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var id = Guid.Parse(obligationId);
        var ledger = await db.CashTransactions.Where(x => x.ObligationId == id).ToListAsync();
        Assert.Equal(3, ledger.Count);
        Assert.All(ledger, x => Assert.NotNull(x.VoidedAt));
        Assert.NotNull((await db.Obligations.SingleAsync(x => x.Id == id)).RemovedAt);
        Assert.NotNull((await db.StockDocuments.SingleAsync(x => x.Id == Guid.Parse(receipt["id"]!.GetValue<string>()))).RemovedAt);
    }

    [Fact]
    public async Task ScheduleCannotDetachOwnedCashAndReplacementPreservesCanonicalInventory()
    {
        using var client = await factory.Account();
        var product = InventoryProduct();
        await Put(client, ProductPath(product), product);
        var receipt = StockDocument("in", "2026-01-01", StockLine(product, 5, "10"));
        receipt["cash"]!["settled"] = true;
        await Put(client, DocumentPath(receipt), receipt);
        var shop = (await client.GetFromJsonAsync<JsonObject>("/api/shop"))!;
        var cash = shop["obligations"]![0]!.AsObject();
        Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsJsonAsync($"/api/shop/obligations/{cash["id"]}", cash)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.DeleteAsync($"/api/shop/obligations/{cash["id"]}")).StatusCode);
        await Put(client, "/api/shop/data", shop); // Unchanged full-shop round trip is allowed.
        cash["amount"] = "51";
        Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsJsonAsync("/api/shop/data", shop)).StatusCode);
        cash["amount"] = "50";
        var inventory = await Inventory(client);
        shop["obligations"] = new JsonArray();
        var replaced = await Put(client, "/api/shop/data", shop);
        var preserved = Assert.Single(replaced["obligations"]!.AsArray())!;
        Assert.Equal("paid", preserved["status"]!.GetValue<string>());
        Assert.Single(preserved["payments"]!.AsArray());
        var after = await Inventory(client);
        Assert.True(JsonNode.DeepEquals(inventory["products"], after["products"]));
        Assert.True(JsonNode.DeepEquals(inventory["documents"], after["documents"]));
        // Zero-price documents and kind changes remove old cash rather than leaving duplicates.
        receipt["lines"]![0]!["unitPrice"] = "0";
        var zero = await Put(client, DocumentPath(receipt), receipt);
        Assert.Null(zero["documents"]![0]!["obligationId"]);
        Assert.Empty((await client.GetFromJsonAsync<JsonObject>("/api/shop"))!["obligations"]!.AsArray());
        Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsJsonAsync($"/api/shop/obligations/{cash["id"]}", cash)).StatusCode);
        var stale = shop.DeepClone().AsObject();
        stale["obligations"] = new JsonArray(cash.DeepClone());
        Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsJsonAsync("/api/shop/data", stale)).StatusCode);
        receipt["lines"]![0]!["unitPrice"] = "10";
        await Put(client, DocumentPath(receipt), receipt);
        receipt["kind"] = "count"; receipt["cash"] = null; receipt["lines"]![0]!["unitPrice"] = "0";
        await Put(client, DocumentPath(receipt), receipt);
        Assert.Empty((await client.GetFromJsonAsync<JsonObject>("/api/shop"))!["obligations"]!.AsArray());
    }

    [Fact]
    public async Task InventoryGuessedIdsAndForeignProductLinksCannotCrossShops()
    {
        using var a = await factory.Account();
        using var b = await factory.Account();
        var product = InventoryProduct();
        await Put(a, ProductPath(product), product);
        var receipt = StockDocument("in", "2026-01-01", StockLine(product, 5, "10"));
        await Put(a, DocumentPath(receipt), receipt);
        var sale = StockDocument("sale", "2026-01-02", StockLine(product, 1, "20"));
        await Put(a, DocumentPath(sale), sale);
        var before = await Inventory(a);
        Assert.Equal(HttpStatusCode.NotFound, (await b.PutAsJsonAsync(ProductPath(product), product)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.DeleteAsync(ProductPath(product))).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.PutAsJsonAsync(DocumentPath(receipt), receipt)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.DeleteAsync(DocumentPath(receipt))).StatusCode);
        var own = InventoryProduct("Own");
        await Put(b, ProductPath(own), own);
        var foreignLine = StockDocument("in", "2026-01-01", StockLine(own, 1, "10"), StockLine(product, 1, "10"));
        Assert.Equal(HttpStatusCode.NotFound, (await b.PutAsJsonAsync(DocumentPath(foreignLine), foreignLine)).StatusCode);
        Assert.Empty((await Inventory(b))["documents"]!.AsArray());
        Assert.Equal("0", (await Sales(b))!["totals"]!["revenue"]!.GetValue<string>());
        Assert.True(JsonNode.DeepEquals(before, await Inventory(a)));
        // A direct database write is also stopped by the product's composite shop FK.
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var ownId = Guid.Parse(own["id"]!.GetValue<string>());
        var foreignId = Guid.Parse(product["id"]!.GetValue<string>());
        var ownShop = (await db.Products.SingleAsync(x => x.Id == ownId)).ShopId;
        var docId = Guid.Parse(receipt["id"]!.GetValue<string>());
        var foreignKey = await Assert.ThrowsAsync<PostgresException>(() => db.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO finpilot.stock_document_lines (id, shop_id, document_id, product_id, position, quantity, unit_price)
            VALUES ({Guid.NewGuid()}, {ownShop}, {docId}, {foreignId}, 0, 1, 10)
            """));
        Assert.Equal(PostgresErrorCodes.ForeignKeyViolation, foreignKey.SqlState);
    }

    [Fact]
    public async Task SalesReportUsesDocumentDatesAndShowsProfitProductsEmptyPeriodsAndStockLoss()
    {
        using var client = await factory.Account();
        var a = InventoryProduct("Áo"); var b = InventoryProduct("Túi");
        await Put(client, ProductPath(a), a); await Put(client, ProductPath(b), b);
        var receipt = StockDocument("in", "2026-01-01", StockLine(a, 10, "10"), StockLine(b, 4, "25"));
        await Put(client, DocumentPath(receipt), receipt);
        var first = StockDocument("sale", "2026-01-03", StockLine(a, 3, "20"), StockLine(b, 1, "50"));
        first["cash"]!["date"] = "2026-03-01";
        await Put(client, DocumentPath(first), first);
        var second = StockDocument("sale", "2026-01-10", StockLine(a, 2, "30"));
        await Put(client, DocumentPath(second), second);
        var loss = StockDocument("out", "2026-01-11", StockLine(a, 1));
        await Put(client, DocumentPath(loss), loss);
        var count = StockDocument("count", "2026-01-12", StockLine(b, 1));
        await Put(client, DocumentPath(count), count);
        var report = (await Sales(client, to: "2026-01-15"))!;
        var totals = report["totals"]!;
        Assert.Equal(6, totals["unitsSold"]!.GetValue<int>());
        Assert.Equal(2, totals["saleCount"]!.GetValue<int>());
        Assert.Equal("170", totals["revenue"]!.GetValue<string>());
        Assert.Equal("75", totals["costOfGoods"]!.GetValue<string>());
        Assert.Equal("95", totals["grossProfit"]!.GetValue<string>());
        Assert.Equal("60", report["stockLoss"]!.GetValue<string>());
        Assert.Equal(a["id"]!.GetValue<string>(), report["products"]![0]!["productId"]!.GetValue<string>());
        Assert.Equal("50", report["products"]![0]!["costOfGoods"]!.GetValue<string>());
        Assert.Equal(15, report["periods"]!.AsArray().Count);
        Assert.Equal("0", report["periods"]![0]!["revenue"]!.GetValue<string>());
        var weekly = (await Sales(client, to: "2026-01-15", group: "week"))!;
        Assert.Equal(3, weekly["periods"]!.AsArray().Count);
        Assert.Equal("2025-12-29", weekly["periods"]![0]!["start"]!.GetValue<string>());
        Assert.Equal("110", weekly["periods"]![0]!["revenue"]!.GetValue<string>());
        Assert.Equal("60", weekly["periods"]![1]!["revenue"]!.GetValue<string>());
        var monthly = (await Sales(client, to: "2026-02-02", group: "month"))!;
        Assert.Equal(2, monthly["periods"]!.AsArray().Count);
        Assert.Equal("170", monthly["periods"]![0]!["revenue"]!.GetValue<string>());
        Assert.Equal("0", monthly["periods"]![1]!["revenue"]!.GetValue<string>());
        Assert.Equal("60", (await Sales(client, from: "2026-01-04"))!["totals"]!["revenue"]!.GetValue<string>());
    }

    [Fact]
    public async Task ProductCodesAreUniquePerShopAndReferencedProductsArchive()
    {
        using var client = await factory.Account();
        var product = InventoryProduct(code: "A1");
        await Put(client, ProductPath(product), product);
        var duplicate = InventoryProduct(code: "A1");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync(ProductPath(duplicate), duplicate)).StatusCode);
        duplicate["code"] = "";
        await Put(client, ProductPath(duplicate), duplicate);
        (await client.DeleteAsync(ProductPath(duplicate))).EnsureSuccessStatusCode();
        var receipt = StockDocument("in", "2026-01-01", StockLine(product, 5, "10"));
        await Put(client, DocumentPath(receipt), receipt);
        (await client.DeleteAsync(ProductPath(product))).EnsureSuccessStatusCode();
        var archived = Assert.Single((await Inventory(client))["products"]!.AsArray())!;
        Assert.True(archived["archived"]!.GetValue<bool>());
        Assert.Equal(5, archived["onHand"]!.GetValue<int>());
    }
}
