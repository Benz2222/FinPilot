using System.Net;
using System.Net.Mail;
using System.Net.Mime;
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
    Task Send(string email, EmailContent content, CancellationToken cancellationToken = default);
}

public sealed class SmtpEmailDelivery(IOptions<SmtpSettings> options, IWebHostEnvironment environment,
    ILogger<SmtpEmailDelivery> logger) : IEmailDelivery
{
    public async Task Send(string email, EmailContent content, CancellationToken cancellationToken = default)
    {
        var smtp = options.Value;
        if (!smtp.IsConfigured)
        {
            if (!environment.IsDevelopment()) throw new InvalidOperationException("Smtp is not configured.");
            logger.LogWarning("Development email delivery is disabled. {Subject}: {Body}", content.Subject, content.Text);
            return;
        }
        using var client = new SmtpClient(smtp.Host!, smtp.Port)
        {
            EnableSsl = smtp.UseStartTls,
            UseDefaultCredentials = false,
            Credentials = string.IsNullOrEmpty(smtp.Username) ? null : new NetworkCredential(smtp.Username, smtp.Password)
        };
        // multipart/alternative: the text part first, the HTML part (preferred by capable clients) last.
        using var message = new MailMessage(smtp.From!, email, content.Subject, content.Text)
        {
            SubjectEncoding = Encoding.UTF8,
            BodyEncoding = Encoding.UTF8,
            BodyTransferEncoding = TransferEncoding.QuotedPrintable
        };
        var html = AlternateView.CreateAlternateViewFromString(content.Html, Encoding.UTF8, MediaTypeNames.Text.Html);
        html.TransferEncoding = TransferEncoding.QuotedPrintable;
        message.AlternateViews.Add(html);
        await client.SendMailAsync(message, cancellationToken);
    }
}

public sealed class IdentityEmailSender(IEmailDelivery delivery, IConfiguration configuration,
    IOptions<DataProtectionTokenProviderOptions> tokens, ILogger<IdentityEmailSender> logger) : IEmailSender<IdentityUser>
{
    private static readonly TimeSpan DeliveryTimeout = TimeSpan.FromSeconds(20);

    private string BaseUrl => configuration["App:PublicBaseUrl"]!.TrimEnd('/');

    private async Task Send(string kind, string email, EmailContent content)
    {
        using var timeout = new CancellationTokenSource(DeliveryTimeout);
        try
        {
            // Bound the request even if a transport ignores cancellation.
            await delivery.Send(email, content, timeout.Token).WaitAsync(timeout.Token);
        }
        catch (OperationCanceledException) when (timeout.IsCancellationRequested)
        {
            logger.LogError("Identity {EmailKind} email delivery timed out after {TimeoutSeconds} seconds. Account request will continue.",
                kind, DeliveryTimeout.TotalSeconds);
        }
        catch (Exception exception)
        {
            // Provider exception messages can contain links or codes; log only safe diagnostic fields.
            logger.LogError("Identity {EmailKind} email delivery failed ({ExceptionType}, cause: {CauseType}, SMTP status: {SmtpStatus}). Account request will continue.",
                kind, exception.GetType().Name, exception.GetBaseException().GetType().Name,
                (exception as SmtpException)?.StatusCode);
        }
    }

    public Task SendConfirmationLinkAsync(IdentityUser user, string email, string confirmationLink)
    {
        // Decode Identity's HTML escaping, then preserve its query for the web page to forward.
        var query = new Uri(WebUtility.HtmlDecode(confirmationLink)).Query;
        var link = $"{BaseUrl}/confirm-email{query}";
        return Send("confirmation", email, AccountEmails.Confirmation(email, link, BaseUrl, tokens.Value.TokenLifespan));
    }

    public Task SendPasswordResetLinkAsync(IdentityUser user, string email, string resetLink) =>
        Send("password reset", email, AccountEmails.PasswordReset(email, resetLink, BaseUrl, tokens.Value.TokenLifespan));

    public Task SendPasswordResetCodeAsync(IdentityUser user, string email, string resetCode)
    {
        var link = $"{BaseUrl}/reset-password?email={Uri.EscapeDataString(email)}&code={Uri.EscapeDataString(resetCode)}";
        return SendPasswordResetLinkAsync(user, email, link);
    }
}
