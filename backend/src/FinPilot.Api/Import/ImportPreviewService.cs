using System.Security.Cryptography;

namespace FinPilot.Api.Import;

public sealed class ImportPreviewService
{
    public const int MaxFileBytes = 1024 * 1024;
    public const int MaxRows = 1000;

    public ImportPreview Preview(string fileName, byte[] bytes)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        if (extension is not (".csv" or ".xlsx"))
            throw new ImportValidationException("Chỉ chấp nhận tệp .csv hoặc .xlsx.");
        if (bytes.Length > MaxFileBytes)
            throw new ImportValidationException("Tệp không được vượt quá 1 MB.");

        var rows = new List<ImportRow>();
        try
        {
            using var source = (extension == ".csv" ? CsvImportParser.Read(bytes) : XlsxImportParser.Read(bytes)).GetEnumerator();
            if (!source.MoveNext())
                throw new ImportValidationException("Tệp không có dòng dữ liệu.");
            var columns = ImportHeaders.Map(source.Current.Cells);
            while (source.MoveNext())
            {
                if (source.Current.Cells.All(cell => string.IsNullOrWhiteSpace(cell.Text) && !cell.Invalid))
                    continue;
                if (rows.Count == MaxRows)
                    throw new ImportValidationException("Tệp không được có quá 1000 dòng dữ liệu.");
                rows.Add(ImportRowValidator.Validate(source.Current, columns));
            }
        }
        // File libraries throw several exception types for malformed CSV/ZIP/XML packages.
        catch (Exception exception) when (exception is not ImportValidationException
            and not OperationCanceledException and not OutOfMemoryException)
        {
            throw new ImportValidationException("Không thể đọc tệp. Hãy kiểm tra định dạng CSV UTF-8 hoặc XLSX.");
        }

        if (rows.Count == 0)
            throw new ImportValidationException("Tệp không có dòng dữ liệu.");
        var valid = rows.Count(row => row.Errors.Count == 0);
        return new(fileName, Convert.ToHexStringLower(SHA256.HashData(bytes)), rows, valid, rows.Count - valid);
    }
}
