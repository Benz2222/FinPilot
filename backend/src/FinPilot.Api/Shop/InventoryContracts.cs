using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace FinPilot.Api.Shops;

public record ProductInput
{
    public required Guid Id { get; init; }
    [Required, StringLength(200, MinimumLength = 1)] public required string Name { get; init; }
    [Required(AllowEmptyStrings = true)] public required string Code { get; init; }
    [Required(AllowEmptyStrings = true)] public required string Unit { get; init; }
    [Range(typeof(decimal), "0", Limits.MaxMoney)] public required decimal SalePrice { get; init; }
    [Range(typeof(decimal), "0", Limits.MaxMoney)] public required decimal CostPrice { get; init; }
    [Range(0, int.MaxValue)] public required int? LowStockAt { get; init; }
    public required bool Archived { get; init; }
}

public sealed record ProductResponse : ProductInput
{
    public required long OnHand { get; init; }
    public required decimal AverageCost { get; init; }
    public required decimal StockValue { get; init; }
}

public sealed record DocumentCash
{
    public required DateOnly Date { get; init; }
    public required bool Settled { get; init; }
}

public record DocLine
{
    public required Guid ProductId { get; init; }
    [Range(0, int.MaxValue)] public required int Quantity { get; init; }
    [Range(typeof(decimal), "0", Limits.MaxMoney)] public required decimal UnitPrice { get; init; }
}

public sealed record DocLineResponse : DocLine
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public long? Difference { get; init; }
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] public decimal? UnitCost { get; init; }
}

public record StockDocumentInput
{
    public required Guid Id { get; init; }
    [Required, RegularExpression("^(in|sale|out|count)$")] public required string Kind { get; init; }
    public required DateOnly Date { get; init; }
    [Required(AllowEmptyStrings = true), StringLength(200)] public required string Party { get; init; }
    [Required(AllowEmptyStrings = true), StringLength(1000)] public required string Note { get; init; }
    [Required, MinLength(1), MaxLength(200)] public required DocLine[] Lines { get; init; }
    public required DocumentCash? Cash { get; init; }
}

public sealed record StockDocumentResponse
{
    public required Guid Id { get; init; }
    public required string Kind { get; init; }
    public required DateOnly Date { get; init; }
    public required string Party { get; init; }
    public required string Note { get; init; }
    public required DocLineResponse[] Lines { get; init; }
    public required DocumentCash? Cash { get; init; }
    public required decimal Total { get; init; }
    public required Guid? ObligationId { get; init; }
}

public sealed record InventoryResponse(long DataVersion, ProductResponse[] Products, StockDocumentResponse[] Documents);

public record ReportFigures(long UnitsSold, decimal Revenue, decimal CostOfGoods, decimal GrossProfit);
public sealed record ReportTotals(long UnitsSold, decimal Revenue, decimal CostOfGoods, decimal GrossProfit, int SaleCount)
    : ReportFigures(UnitsSold, Revenue, CostOfGoods, GrossProfit);
public sealed record ReportPeriod(DateOnly Start, long UnitsSold, decimal Revenue, decimal CostOfGoods, decimal GrossProfit)
    : ReportFigures(UnitsSold, Revenue, CostOfGoods, GrossProfit);
public sealed record ReportProduct(Guid ProductId, string Name, long UnitsSold, decimal Revenue, decimal CostOfGoods, decimal GrossProfit)
    : ReportFigures(UnitsSold, Revenue, CostOfGoods, GrossProfit);
public sealed record SalesReport(DateOnly From, DateOnly To, string Group, ReportTotals Totals,
    ReportPeriod[] Periods, ReportProduct[] Products, decimal StockLoss);
