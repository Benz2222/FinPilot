using System.Globalization;
using System.Text;
using CsvHelper;
using CsvHelper.Configuration;

namespace FinPilot.Api.Import;

internal static class CsvImportParser
{
    public static IEnumerable<SourceRow> Read(byte[] bytes)
    {
        var offset = bytes.AsSpan().StartsWith(new byte[] { 0xef, 0xbb, 0xbf }) ? 3 : 0;
        using var reader = new StringReader(new UTF8Encoding(false, true).GetString(bytes, offset, bytes.Length - offset));
        using var parser = new CsvParser(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            Delimiter = ",",
            IgnoreBlankLines = false
        });
        while (parser.Read())
            yield return new SourceRow(parser.Row, parser.Record!.Select(value => new ImportCell(value)).ToArray());
    }
}
