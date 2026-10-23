namespace FinPilot.Api.Domain;

public abstract class ShopRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ShopId { get; set; }
}

public sealed class BalanceSnapshot : ShopRecord
{
    public DateOnly AsOfDate { get; set; }
    public decimal ClosingAmount { get; set; }
    public required string CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class Obligation : ShopRecord
{
    public required string Direction { get; set; }
    public required string Label { get; set; }
    public decimal Amount { get; set; }
    public DateOnly DueDate { get; set; }
    public required string Notes { get; set; }
    public required string Status { get; set; }
    public Guid? ImportBatchId { get; set; }
    public DateTimeOffset? RemovedAt { get; set; }
    public required string CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class CashTransaction : ShopRecord
{
    // A corrected payment keeps its client ID, but gets a fresh immutable ledger row.
    public Guid PaymentId { get; set; }
    public Guid ObligationId { get; set; }
    public required string Direction { get; set; }
    public decimal Amount { get; set; }
    public DateOnly TxDate { get; set; }
    public required string RecordedBy { get; set; }
    public DateTimeOffset RecordedAt { get; set; }
    public DateTimeOffset? VoidedAt { get; set; }
    public string? VoidedBy { get; set; }
    public string? VoidReason { get; set; }
}

public sealed class ImportBatch : ShopRecord
{
    public required string FileSha256 { get; set; }
    public required string FileName { get; set; }
    public int LineCount { get; set; }
    public required string CreatedBy { get; set; }
    public DateTimeOffset CommittedAt { get; set; }
    public DateTimeOffset? RemovedAt { get; set; }
}

public sealed class Scenario : ShopRecord
{
    public required string Name { get; set; }
    public required string PayloadJson { get; set; }
    public required string BaseInputJson { get; set; }
    public long BaseDataVersion { get; set; }
    public required string CreatedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? RemovedAt { get; set; }
}

public sealed class AuditLog : ShopRecord
{
    public required string ActorUserId { get; set; }
    public DateTimeOffset OccurredAt { get; set; }
    public required string EntityType { get; set; }
    public Guid EntityId { get; set; }
    public required string Action { get; set; }
    public string? BeforeJson { get; set; }
    public required string AfterJson { get; set; }
}
