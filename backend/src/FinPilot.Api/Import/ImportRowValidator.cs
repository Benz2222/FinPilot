using System.Globalization;
using System.Text.RegularExpressions;

namespace FinPilot.Api.Import;

internal static partial class ImportRowValidator
{
    public static ImportRow Validate(SourceRow source, int[] columns)
    {
        ImportCell Cell(int index) => columns[index] >= 0 && columns[index] < source.Cells.Count
            ? source.Cells[columns[index]] : ImportCell.Empty;
        var errors = new List<ImportError>();

        var type = Cell(0);
        string? direction = type.Invalid ? null : type.Text.Trim().ToLowerInvariant() switch
        {
            "thu" => "In",
            "chi" => "Out",
            _ => null
        };
        if (direction is null)
            errors.Add(new("loai", "Loại phải là Thu hoặc Chi."));

        var labelCell = Cell(1);
        string? label = labelCell.Text.Trim();
        if (labelCell.Invalid || label.Length is 0 or > 200)
        {
            errors.Add(new("noiDung", "Nội dung là bắt buộc và không quá 200 ký tự."));
            label = null;
        }

        decimal? amount = Money(Cell(2));
        if (amount is null or <= 0)
        {
            errors.Add(new("soTien", "Số tiền phải là số nguyên VND lớn hơn 0, không có phần lẻ."));
            amount = null;
        }

        var dateCell = Cell(3);
        DateOnly? date = dateCell.Invalid ? null : dateCell.Date;
        if (date is null && !dateCell.Invalid && dateCell.Number is null
            && DateOnly.TryParseExact(dateCell.Text.Trim(), ["yyyy-MM-dd", "dd/MM/yyyy"],
                CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
            date = parsedDate;
        if (date is null)
            errors.Add(new("ngay", "Ngày phải hợp lệ theo định dạng yyyy-MM-dd hoặc dd/MM/yyyy."));

        var paidCell = Cell(4);
        decimal? paid = string.IsNullOrWhiteSpace(paidCell.Text) && !paidCell.Invalid ? 0m : Money(paidCell);
        if (paid is null or < 0 || (amount is not null && paid > amount))
        {
            errors.Add(new("daThanhToan", "Đã thanh toán phải là số nguyên VND từ 0 đến Số tiền."));
            paid = null;
        }

        var noteCell = Cell(5);
        string? note = string.IsNullOrWhiteSpace(noteCell.Text) ? null : noteCell.Text.Trim();
        if (noteCell.Invalid || note?.Length > 500)
        {
            errors.Add(new("ghiChu", "Ghi chú không quá 500 ký tự và phải là văn bản hợp lệ."));
            note = null;
        }

        return new(source.RowNumber, direction, label, amount, date, paid, note, errors);
    }

    private static decimal? Money(ImportCell cell)
    {
        if (cell.Invalid || cell.Date is not null)
            return null;
        if (cell.Number is { } number)
        {
            if (!double.IsFinite(number) || Math.Truncate(number) != number)
                return null;
            return decimal.TryParse(number.ToString("R", CultureInfo.InvariantCulture), NumberStyles.Float,
                CultureInfo.InvariantCulture, out var numeric) ? numeric : null;
        }

        var text = cell.Text.Trim();
        if (!GroupedVnd().IsMatch(text))
            return null;
        text = text.Replace(".", "").Replace(",", "").Replace(" ", "");
        return decimal.TryParse(text, NumberStyles.None, CultureInfo.InvariantCulture, out var value) ? value : null;
    }

    [GeneratedRegex(@"\A(?:[0-9]+|[0-9]{1,3}(?<separator>[., ])[0-9]{3}(?:\k<separator>[0-9]{3})*)\z")]
    private static partial Regex GroupedVnd();
}
