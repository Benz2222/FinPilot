using System.Net;
using System.Net.Mail;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace FinPilot.Api.Auth;

public sealed class SmtpSettings
{
    public string? Host { get; set; }
    public int Port { get; set; } = 587;
    public bool UseStartTls { get; set; } = true;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string? From { get; set; }
    public bool IsConfigured => !string.IsNullOrWhiteSpace(Host) && Port is > 0 and <= 65535 &&
        MailAddress.TryCreate(From, out _) && (string.IsNullOrEmpty(Username) || !string.IsNullOrEmpty(Password));
}

public interface IEmailDelivery
{
    Task Send(string email, string subject, string body);
}

public sealed class SmtpEmailDelivery(IOptions<SmtpSettings> options, IWebHostEnvironment environment,
    ILogger<SmtpEmailDelivery> logger) : IEmailDelivery
{
    public async Task Send(string email, string subject, string body)
    {
        var smtp = options.Value;
        if (!smtp.IsConfigured)
        {
            if (!environment.IsDevelopment()) throw new InvalidOperationException("Smtp is not configured.");
            logger.LogWarning("Development email delivery is disabled. {Subject}: {Body}", subject, body);
            return;
        }
        using var client = new SmtpClient(smtp.Host!, smtp.Port)
        {
            EnableSsl = smtp.UseStartTls,
            UseDefaultCredentials = false,
            Credentials = string.IsNullOrEmpty(smtp.Username) ? null : new NetworkCredential(smtp.Username, smtp.Password)
        };
        using var message = new MailMessage(smtp.From!, email, subject, body)
        {
            SubjectEncoding = Encoding.UTF8,
            BodyEncoding = Encoding.UTF8
        };
        await client.SendMailAsync(message);
    }
}

public sealed class IdentityEmailSender(IEmailDelivery delivery, IConfiguration configuration) : IEmailSender<IdentityUser>
{
    public Task SendConfirmationLinkAsync(IdentityUser user, string email, string confirmationLink) =>
        delivery.Send(email, "Xác nhận email FinPilot",
            $"Mở liên kết dưới đây để xác nhận email cho tài khoản FinPilot của bạn.\n\n{confirmationLink}\n\nNếu bạn không đăng ký tài khoản này, bạn có thể bỏ qua email này.");

    public Task SendPasswordResetLinkAsync(IdentityUser user, string email, string resetLink) =>
        delivery.Send(email, "Đặt lại mật khẩu FinPilot",
            $"Mở liên kết dưới đây để đặt lại mật khẩu tài khoản FinPilot của bạn.\n\n{resetLink}\n\nNếu bạn không yêu cầu đặt lại mật khẩu, bạn có thể bỏ qua email này.");

    public Task SendPasswordResetCodeAsync(IdentityUser user, string email, string resetCode)
    {
        var baseUrl = configuration["App:PublicBaseUrl"]!.TrimEnd('/');
        var link = $"{baseUrl}/reset-password?email={Uri.EscapeDataString(email)}&code={Uri.EscapeDataString(resetCode)}";
        return SendPasswordResetLinkAsync(user, email, link);
    }
}
