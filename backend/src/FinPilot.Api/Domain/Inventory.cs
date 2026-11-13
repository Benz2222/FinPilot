namespace FinPilot.Api.Domain;

public sealed class Product : ShopRecord
{
    public required string Name { get; set; }
    public required string Code { get; set; }
    public required string Unit { get; set; }
    public decimal SalePrice { get; set; }
    public decimal CostPrice { get; set; }
    public int? LowStockAt { get; set; }
    public bool Archived { get; set; }
}

public sealed class StockDocument : ShopRecord
{
    public required string Kind { get; set; }
    public DateOnly Date { get; set; }
    public required string Party { get; set; }
    public required string Note { get; set; }
    public DateOnly? CashDate { get; set; }
    public bool? Settled { get; set; }
    public Guid? ObligationId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? RemovedAt { get; set; }
}

public sealed class StockDocumentLine : ShopRecord
{
    public Guid DocumentId { get; set; }
    public Guid ProductId { get; set; }
    public int Position { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public DateTimeOffset? RemovedAt { get; set; }
}
