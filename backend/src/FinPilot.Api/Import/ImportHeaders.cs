using System.Globalization;
using System.Text;

namespace FinPilot.Api.Import;

internal static class ImportHeaders
{
    public static readonly string[] Names = ["Loại", "Nội dung", "Số tiền", "Ngày", "Đã thanh toán", "Ghi chú"];

    public static int[] Map(IReadOnlyList<ImportCell> cells)
    {
        var normalized = cells.Select(cell => Normalize(cell.Text)).ToList();
        var columns = Names.Select(name => normalized.IndexOf(Normalize(name))).ToArray();
        var missing = Names.Take(4).Where((_, index) => columns[index] < 0).ToArray();
        if (missing.Length > 0)
            throw new ImportValidationException($"Thiếu cột bắt buộc: {string.Join(", ", missing)}.");
        return columns;
    }

    private static string Normalize(string text)
    {
        var result = new StringBuilder();
        foreach (var character in text.Trim().Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
                continue;
            if (char.IsWhiteSpace(character) || character == '_')
                continue;
            result.Append(character is 'đ' or 'Đ' ? 'd' : char.ToLowerInvariant(character));
        }
        return result.ToString();
    }
}
