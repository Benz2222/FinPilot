using ClosedXML.Excel;

namespace FinPilot.Api.Import;

internal static class XlsxImportParser
{
    public static IEnumerable<SourceRow> Read(byte[] bytes)
    {
        using var stream = new MemoryStream(bytes, writable: false);
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.First();
        yield return ReadRow(sheet.Row(1));
        foreach (var row in sheet.RowsUsed(XLCellsUsedOptions.Contents).Where(row => row.RowNumber() > 1))
            yield return ReadRow(row);
    }

    private static SourceRow ReadRow(IXLRow row)
    {
        var last = row.LastCellUsed(XLCellsUsedOptions.Contents)?.Address.ColumnNumber ?? 0;
        var cells = new ImportCell[last];
        for (var column = 1; column <= last; column++)
        {
            var cell = row.Cell(column);
            // Imported formulas are never executed; only literal values belong in the template.
            cells[column - 1] = cell.HasFormula ? new ImportCell(cell.FormulaA1, Invalid: true) : cell.DataType switch
            {
                XLDataType.Number => new ImportCell(cell.GetString(), Number: cell.GetDouble()),
                XLDataType.DateTime => new ImportCell(cell.GetString(), Date: DateOnly.FromDateTime(cell.GetDateTime())),
                XLDataType.Error or XLDataType.Boolean or XLDataType.TimeSpan => new ImportCell(cell.GetString(), Invalid: true),
                _ => new ImportCell(cell.GetString())
            };
        }
        return new SourceRow(row.RowNumber(), cells);
    }
}
