using System.Globalization;
using System.Text;
using ClosedXML.Excel;
using CsvHelper;

namespace FinPilot.Api.Import;

public static class ImportTemplate
{
    public static byte[] Create(string format, DateOnly today)
    {
        (string Type, string Label, decimal Amount, DateOnly Date)[] examples =
        [
            ("Chi", "Nhập hàng", 30000000m, today),
            ("Chi", "Lương + thuê", 25000000m, today.AddDays(7)),
            ("Thu", "Tiền sàn", 35000000m, today.AddDays(14))
        ];
        using var stream = new MemoryStream();
        if (format == "csv")
        {
            using var writer = new StreamWriter(stream, new UTF8Encoding(true), leaveOpen: true);
            using var csv = new CsvWriter(writer, CultureInfo.InvariantCulture);
            foreach (var header in ImportHeaders.Names)
                csv.WriteField(header);
            csv.NextRecord();
            foreach (var example in examples)
            {
                csv.WriteField(example.Type);
                csv.WriteField(example.Label);
                csv.WriteField(example.Amount.ToString("0", CultureInfo.InvariantCulture));
                csv.WriteField(example.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
                csv.WriteField("0");
                csv.WriteField("");
                csv.NextRecord();
            }
            csv.Flush();
            writer.Flush();
        }
        else
        {
            using var workbook = new XLWorkbook();
            var sheet = workbook.AddWorksheet("Lịch thu chi");
            for (var column = 0; column < ImportHeaders.Names.Length; column++)
                sheet.Cell(1, column + 1).Value = ImportHeaders.Names[column];
            for (var index = 0; index < examples.Length; index++)
            {
                var row = index + 2;
                var example = examples[index];
                sheet.Cell(row, 1).Value = example.Type;
                sheet.Cell(row, 2).Value = example.Label;
                sheet.Cell(row, 3).Value = example.Amount;
                sheet.Cell(row, 3).Style.NumberFormat.Format = "#,##0";
                sheet.Cell(row, 4).Value = example.Date.ToDateTime(TimeOnly.MinValue);
                sheet.Cell(row, 4).Style.DateFormat.Format = "yyyy-mm-dd";
                sheet.Cell(row, 5).Value = 0;
            }
            sheet.Row(1).Style.Font.Bold = true;
            sheet.Columns().AdjustToContents();
            workbook.SaveAs(stream);
        }
        return stream.ToArray();
    }
}
