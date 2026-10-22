using System.Globalization;
using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace FinPilot.Api.Tests;

public sealed class ImportTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private const string Headers = "Loại,Nội dung,Số tiền,Ngày,Đã thanh toán,Ghi chú";
    private readonly HttpClient client;

    public ImportTests(WebApplicationFactory<Program> factory)
    {
        client = factory.WithWebHostBuilder(builder => builder
            .UseEnvironment("Development")
            .UseSetting("ConnectionStrings:Default", "Host=localhost;Database=unused;Username=unused;Password=unused"))
            .CreateClient();
    }

    [Fact]
    public async Task CsvAndXlsxProduceIdenticalRowsWithoutLosingMoneyOrDates()
    {
        var csv = Encoding.UTF8.GetPreamble().Concat(Utf8(Headers + "\r\n"
            + "Chi,Nhập hàng,30.000.000,2026-10-22,4.000.000,Đợt đầu\r\n"
            + "Chi,Lương + thuê,\"25,000,000\",29/10/2026,,\r\n"
            + "Thu,Tiền sàn,35 000 000,2026-11-05,0,\r\n")).ToArray();
        var xlsx = Workbook(ImportHeaders(),
            ["Chi", "Nhập hàng", 30000000d, new DateTime(2026, 10, 22), 4000000d, "Đợt đầu"],
            ["Chi", "Lương + thuê", 25000000d, new DateTime(2026, 10, 29), "", ""],
            ["Thu", "Tiền sàn", 35000000d, new DateTime(2026, 11, 5), 0d, ""]);
        var csvResult = await Preview(csv, "cash.csv");
        var xlsxResult = await Preview(xlsx, "cash.xlsx");

        Assert.Equal(csvResult.GetProperty("rows").GetRawText(), xlsxResult.GetProperty("rows").GetRawText());
        Assert.Equal(3, csvResult.GetProperty("validCount").GetInt32());
        Assert.Equal(0, xlsxResult.GetProperty("errorCount").GetInt32());
        Assert.Equal(Convert.ToHexStringLower(SHA256.HashData(csv)), csvResult.GetProperty("fileSha256").GetString());
        var first = csvResult.GetProperty("rows")[0];
        Assert.Equal("30000000", first.GetProperty("amount").GetString());
        Assert.Equal("2026-10-22", first.GetProperty("date").GetString());
        Assert.Equal(2, first.GetProperty("rowNumber").GetInt32());
    }

    [Fact]
    public async Task InvalidRowKeepsOtherRowsAndNullsOnlyFailedFields()
    {
        var result = await Preview(Utf8(Headers + "\n"
            + $"Sai,{new string('x', 201)},1000,31/02/2026,0,{new string('x', 501)}\n"
            + "Thu,Tiền sàn,35000000,2026-11-05,0,\n"), "cash.csv");

        Assert.Equal(1, result.GetProperty("validCount").GetInt32());
        Assert.Equal(1, result.GetProperty("errorCount").GetInt32());
        var rows = result.GetProperty("rows");
        var invalid = rows[0];
        Assert.Equal(new[] { "loai", "noiDung", "ngay", "ghiChu" }, invalid.GetProperty("errors")
            .EnumerateArray().Select(error => error.GetProperty("column").GetString()));
        Assert.Equal(JsonValueKind.Null, invalid.GetProperty("direction").ValueKind);
        Assert.Equal(JsonValueKind.Null, invalid.GetProperty("label").ValueKind);
        Assert.Equal(JsonValueKind.Null, invalid.GetProperty("date").ValueKind);
        Assert.Equal(JsonValueKind.Null, invalid.GetProperty("note").ValueKind);
        Assert.Equal("1000", invalid.GetProperty("amount").GetString());
        Assert.Empty(rows[1].GetProperty("errors").EnumerateArray());
    }

    [Fact]
    public async Task AmountMustStayPositiveAndIntegralInTextAndNumericCells()
    {
        var text = await Preview(Utf8(Headers + "\n"
            + "Chi,A,1.5,2026-10-22,,\nChi,B,-1,2026-10-22,,\nChi,C,0,2026-10-22,,\n"), "cash.csv");
        var numeric = await Preview(Workbook(ImportHeaders(),
            ["Chi", "A", 1.5d, "2026-10-22"], ["Chi", "B", -1d, "2026-10-22"],
            ["Chi", "C", 0d, "2026-10-22"]), "cash.xlsx");

        Assert.Equal(3, text.GetProperty("errorCount").GetInt32());
        Assert.Equal(text.GetProperty("rows").GetRawText(), numeric.GetProperty("rows").GetRawText());
        Assert.All(text.GetProperty("rows").EnumerateArray(), row =>
        {
            Assert.Equal(JsonValueKind.Null, row.GetProperty("amount").ValueKind);
            Assert.Equal("soTien", Assert.Single(row.GetProperty("errors").EnumerateArray()).GetProperty("column").GetString());
        });
    }

    [Fact]
    public async Task PaidCannotExceedAmount()
    {
        var result = await Preview(Utf8(Headers + "\nChi,Hàng,1000,2026-10-22,1001,\n"), "cash.csv");
        var row = result.GetProperty("rows")[0];
        Assert.Equal(JsonValueKind.Null, row.GetProperty("paid").ValueKind);
        Assert.Equal("1000", row.GetProperty("amount").GetString());
        Assert.Equal("daThanhToan", Assert.Single(row.GetProperty("errors").EnumerateArray()).GetProperty("column").GetString());
    }

    [Fact]
    public async Task MissingRequiredHeaderReturnsValidationProblemNamingColumn()
    {
        var errors = await Rejected(Utf8("Loại,Nội dung,Ngày\nChi,Hàng,2026-10-22\n"), "cash.csv");
        Assert.Contains("Số tiền", errors);
    }

    [Fact]
    public async Task NormalizedHeadersAllowReorderingAndBlankRowsKeepSpreadsheetNumbers()
    {
        var result = await Preview(Utf8(" ngay ,SO_TIEN,noi dung,LOAI,da_thanh_toan,ghi_chu,Unknown\n"
            + ",,,,,,\n2026-10-22,1000,Hàng,chi,500,Ghi chú,bỏ qua\n"), "cash.csv");
        var row = Assert.Single(result.GetProperty("rows").EnumerateArray());
        Assert.Equal(1, result.GetProperty("validCount").GetInt32());
        Assert.Equal(3, row.GetProperty("rowNumber").GetInt32());
        Assert.Equal("Out", row.GetProperty("direction").GetString());
        Assert.Equal("500", row.GetProperty("paid").GetString());
        Assert.Equal("Ghi chú", row.GetProperty("note").GetString());
    }

    [Fact]
    public async Task MissingFileReturnsValidationProblem()
    {
        using var content = new MultipartFormDataContent();
        using var response = await client.PostAsync("/api/import/preview", content);
        await ValidationErrors(response);
    }

    [Fact]
    public async Task WrongExtensionReturnsValidationProblem()
    {
        await Rejected(Utf8(Headers), "cash.txt");
    }

    [Fact]
    public async Task FileOverOneMegabyteReturnsValidationProblem()
    {
        await Rejected(new byte[1024 * 1024 + 1], "cash.csv");
    }

    [Fact]
    public async Task UnreadableFileReturnsValidationProblem()
    {
        await Rejected(Utf8("not an XLSX archive"), "cash.xlsx");
        await Rejected([0xff, 0xfe, 0xff], "cash.csv");
    }

    [Fact]
    public async Task MoreThanOneThousandNonemptyRowsReturnsValidationProblem()
    {
        await Rejected(Utf8(Headers + "\n" + string.Concat(Enumerable.Repeat(
            "Chi,Hàng,1000,2026-10-22,,\n", 1001))), "cash.csv");
    }

    [Fact]
    public async Task HeaderAndEmptyRowsHaveNoDataToPreview()
    {
        await Rejected(Utf8(Headers + "\n,,,,,\n\n"), "cash.csv");
    }

    [Fact]
    public async Task DownloadedTemplatesRoundTripToThreeValidRows()
    {
        using var xlsx = await client.GetAsync("/api/import/template");
        xlsx.EnsureSuccessStatusCode();
        Assert.Equal("attachment", xlsx.Content.Headers.ContentDisposition?.DispositionType);
        var xlsxPreview = await Preview(await xlsx.Content.ReadAsByteArrayAsync(), "template.xlsx");
        using var csv = await client.GetAsync("/api/import/template?format=csv");
        csv.EnsureSuccessStatusCode();
        var csvPreview = await Preview(await csv.Content.ReadAsByteArrayAsync(), "template.csv");
        Assert.Equal(3, xlsxPreview.GetProperty("validCount").GetInt32());
        Assert.Equal(0, csvPreview.GetProperty("errorCount").GetInt32());
        Assert.Equal(xlsxPreview.GetProperty("rows").GetRawText(), csvPreview.GetProperty("rows").GetRawText());
    }

    private async Task<JsonElement> Preview(byte[] bytes, string name)
    {
        using var response = await Upload(bytes, name);
        response.EnsureSuccessStatusCode();
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return document.RootElement.Clone();
    }

    private async Task<string> Rejected(byte[] bytes, string name)
    {
        using var response = await Upload(bytes, name);
        return await ValidationErrors(response);
    }

    private static async Task<string> ValidationErrors(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return string.Join(" ", document.RootElement.GetProperty("errors").GetProperty("file")
            .EnumerateArray().Select(error => error.GetString()));
    }

    private async Task<HttpResponseMessage> Upload(byte[] bytes, string name)
    {
        using var content = new MultipartFormDataContent();
        content.Add(new ByteArrayContent(bytes), "file", name);
        return await client.PostAsync("/api/import/preview", content);
    }

    private static byte[] Utf8(string text) => Encoding.UTF8.GetBytes(text);
    private static string[] ImportHeaders() => Headers.Split(',');

    private static byte[] Workbook(string[] headers, params object[][] rows)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.AddWorksheet("Cash");
        for (var column = 0; column < headers.Length; column++)
            sheet.Cell(1, column + 1).Value = headers[column];
        for (var index = 0; index < rows.Length; index++)
            for (var column = 0; column < rows[index].Length; column++)
            {
                var cell = sheet.Cell(index + 2, column + 1);
                cell.Value = XLCellValue.FromObject(rows[index][column], CultureInfo.InvariantCulture);
                if (rows[index][column] is DateTime)
                    cell.Style.DateFormat.Format = "yyyy-mm-dd";
            }
        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public void Dispose() => client.Dispose();
}
