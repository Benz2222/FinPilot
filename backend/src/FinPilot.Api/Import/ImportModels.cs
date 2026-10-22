namespace FinPilot.Api.Import;

public sealed record ImportError(string Column, string Message);

public sealed record ImportRow(
    int RowNumber,
    string? Direction,
    string? Label,
    decimal? Amount,
    DateOnly? Date,
    decimal? Paid,
    string? Note,
    IReadOnlyList<ImportError> Errors);

public sealed record ImportPreview(
    string FileName,
    string FileSha256,
    IReadOnlyList<ImportRow> Rows,
    int ValidCount,
    int ErrorCount);

public sealed class ImportValidationException(string message) : Exception(message);

internal sealed record ImportCell(string Text, double? Number = null, DateOnly? Date = null, bool Invalid = false)
{
    public static readonly ImportCell Empty = new("");
}

internal sealed record SourceRow(int RowNumber, IReadOnlyList<ImportCell> Cells);
