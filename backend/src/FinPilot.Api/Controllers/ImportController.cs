using FinPilot.Api.Import;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FinPilot.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/import")]
public sealed class ImportController(ImportPreviewService previewService) : ControllerBase
{
    [HttpPost("preview")]
    [ReadImportForm]
    [DisableRequestSizeLimit]
    [RequestFormLimits(MultipartBodyLengthLimit = ImportPreviewService.MaxFileBytes,
        MemoryBufferThreshold = ImportPreviewService.MaxFileBytes)]
    public async Task<ActionResult<ImportPreview>> Preview(CancellationToken cancellationToken)
    {
        try
        {
            if (!Request.HasFormContentType || !Request.ContentType!.StartsWith("multipart/form-data", StringComparison.OrdinalIgnoreCase))
                throw new ImportValidationException("Vui lòng gửi tệp trong trường file của multipart/form-data.");
            var form = await Request.ReadFormAsync(cancellationToken);
            var file = form.Files.GetFile("file")
                ?? throw new ImportValidationException("Vui lòng chọn tệp để xem trước.");
            if (file.Length > ImportPreviewService.MaxFileBytes)
                throw new ImportValidationException("Tệp không được vượt quá 1 MB.");
            using var stream = new MemoryStream();
            await file.CopyToAsync(stream, cancellationToken);
            return Ok(previewService.Preview(Path.GetFileName(file.FileName), stream.ToArray()));
        }
        catch (InvalidDataException)
        {
            return InvalidFile("Tệp tải lên không hợp lệ hoặc vượt quá giới hạn 1 MB.");
        }
        catch (ImportValidationException exception)
        {
            return InvalidFile(exception.Message);
        }
    }

    [HttpGet("template")]
    public IActionResult Template([FromQuery] string format = "xlsx")
    {
        format = format.ToLowerInvariant();
        if (format is not ("csv" or "xlsx"))
            return InvalidFile("Định dạng mẫu phải là csv hoặc xlsx.");
        var bytes = ImportTemplate.Create(format, DateOnly.FromDateTime(DateTime.Today));
        var contentType = format == "csv" ? "text/csv; charset=utf-8"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        return File(bytes, contentType, $"finpilot-mau-nhap.{format}");
    }

    private ActionResult InvalidFile(string message)
    {
        ModelState.AddModelError("file", message);
        return ValidationProblem(ModelState);
    }
}
