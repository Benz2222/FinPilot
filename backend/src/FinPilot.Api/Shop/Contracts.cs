using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace FinPilot.Api.Shops;

public static class Limits
{
    public const string MaxMoney = "999999999999999999";
}

public sealed record CreateShop([Required, StringLength(200, MinimumLength = 1)] string Name);
public sealed record BalanceInput
{
    [Range(typeof(decimal), "0", Limits.MaxMoney)] public required decimal Amount { get; init; }
    public required DateOnly Cutoff { get; init; }
}
public sealed record PaymentInput
{
    public required Guid Id { get; init; }
    [Range(typeof(decimal), "1", Limits.MaxMoney)] public required decimal Amount { get; init; }
    public required DateOnly Date { get; init; }
}
public sealed record ObligationInput
{
    public required Guid Id { get; init; }
    [Required, RegularExpression("^(In|Out)$")] public required string Direction { get; init; }
    [Required, StringLength(200)] public required string Label { get; init; }
    [Range(typeof(decimal), "1", Limits.MaxMoney)] public required decimal Amount { get; init; }
    public required DateOnly Date { get; init; }
    [Required(AllowEmptyStrings = true), StringLength(1000)] public required string Note { get; init; }
    [Required, RegularExpression("^(open|paid|cancelled)$")] public required string Status { get; init; }
    [Required] public required PaymentInput[] Payments { get; init; }
    [RegularExpression("^[0-9a-f]{64}$")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ImportedFrom { get; init; }
}
public sealed record ImportInput
{
    [Required, RegularExpression("^[0-9a-f]{64}$")] public required string FileSha256 { get; init; }
    [Required, StringLength(255)] public required string FileName { get; init; }
    [Required, MinLength(1), MaxLength(1000)] public required ObligationInput[] Obligations { get; init; }
}
public sealed record ImportRecord
{
    [Required, RegularExpression("^[0-9a-f]{64}$")] public required string FileSha256 { get; init; }
    [Required, StringLength(255)] public required string FileName { get; init; }
    public required DateTimeOffset CommittedAt { get; init; }
    [Range(0, 1000)] public required int LineCount { get; init; }
}

[JsonPolymorphic(TypeDiscriminatorPropertyName = "kind")]
[JsonDerivedType(typeof(AddAdjustment), "add")]
[JsonDerivedType(typeof(ShiftAdjustment), "shift")]
[JsonDerivedType(typeof(ResizeAdjustment), "resize")]
[JsonDerivedType(typeof(SplitAdjustment), "split")]
[JsonDerivedType(typeof(ExcludeAdjustment), "exclude")]
public abstract record Adjustment
{
    [Required] public required string Id { get; init; }
}
public sealed record AddAdjustment : Adjustment
{
    [Required, RegularExpression("^(In|Out)$")] public required string Direction { get; init; }
    [Required, StringLength(200)] public required string Label { get; init; }
    [Range(typeof(decimal), "1", Limits.MaxMoney)] public required decimal Amount { get; init; }
    public required DateOnly Date { get; init; }
}
public abstract record TargetAdjustment : Adjustment
{
    [Required] public required string TargetId { get; init; }
}
public sealed record ShiftAdjustment : TargetAdjustment { public required DateOnly Date { get; init; } }
public sealed record ResizeAdjustment : TargetAdjustment
{
    [Range(typeof(decimal), "1", Limits.MaxMoney)] public required decimal Amount { get; init; }
}
public sealed record SplitPart
{
    [Required] public required string Id { get; init; }
    [Range(typeof(decimal), "1", Limits.MaxMoney)] public required decimal Amount { get; init; }
    public required DateOnly Date { get; init; }
}
public sealed record SplitAdjustment : TargetAdjustment
{
    [Required, MinLength(1)] public required SplitPart[] Parts { get; init; }
}
public sealed record ExcludeAdjustment : TargetAdjustment;
public sealed record ScenarioOutcome
{
    public required DateOnly Start { get; init; }
    [Required] public required decimal[] Closings { get; init; }
    public required decimal LowestBalance { get; init; }
    public required DateOnly LowestBalanceDate { get; init; }
    public required DateOnly? FirstShortageDate { get; init; }
    public required decimal MaxShortage { get; init; }
    public required decimal EndingBalance { get; init; }
}
public sealed record ScenarioInput
{
    public required Guid Id { get; init; }
    [Required, StringLength(200)] public required string Name { get; init; }
    public required DateTimeOffset CreatedAt { get; init; }
    [Required] public required Adjustment[] Adjustments { get; init; }
    [Required] public required string BaseFingerprint { get; init; }
    public required ScenarioOutcome? Outcome { get; init; }
}
public record ShopInput
{
    [Range(1, 1)] public required int Version { get; init; }
    public required BalanceInput? Balance { get; init; }
    [Required] public required ObligationInput[] Obligations { get; init; }
    [Required] public required ScenarioInput[] Scenarios { get; init; }
    [Required] public required ImportRecord[] Imports { get; init; }
}
public sealed record ShopResponse : ShopInput
{
    public required string Name { get; init; }
    public required long DataVersion { get; init; }
}
