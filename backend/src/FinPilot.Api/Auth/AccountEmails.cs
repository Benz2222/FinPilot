using System.Net;

namespace FinPilot.Api.Auth;

/// <summary>A ready-to-send mail: the plain-text part and the HTML part carry the same message and link.</summary>
public sealed record EmailContent(string Subject, string Text, string Html);

/// <summary>
/// Account mails (email confirmation, password reset) as text + HTML. The HTML is a light card under a dark brand band:
/// light survives Gmail's automatic dark-mode inversion, and clients that honour prefers-color-scheme get the dark cockpit
/// palette. No web fonts and no remote assets except the logo, which degrades to the cyan square behind it.
/// </summary>
public static class AccountEmails
{
    public const string LogoFile = "email-logo.png";

    public static EmailContent Confirmation(string email, string link, string publicBaseUrl, TimeSpan linkLifetime) =>
        Build(publicBaseUrl, link, new Copy(
            Subject: "Xác nhận email FinPilot",
            Preheader: "Xác nhận địa chỉ email để dùng FinPilot.",
            Heading: "Xác nhận email của bạn",
            Intro: ("Nhấn nút bên dưới để xác nhận địa chỉ ", email, "."),
            TextIntro: "Mở liên kết dưới đây để xác nhận địa chỉ",
            Button: "Xác nhận email",
            Expiry: $"Liên kết có hiệu lực trong {Duration(linkLifetime)}.",
            Safety: "Không phải bạn đăng ký? Bỏ qua email này."));

    public static EmailContent PasswordReset(string email, string link, string publicBaseUrl, TimeSpan linkLifetime) =>
        Build(publicBaseUrl, link, new Copy(
            Subject: "Đặt lại mật khẩu FinPilot",
            Preheader: $"Chọn mật khẩu mới cho tài khoản FinPilot. Liên kết có hiệu lực trong {Duration(linkLifetime)}.",
            Heading: "Đặt lại mật khẩu",
            Intro: ("Có yêu cầu đặt lại mật khẩu cho tài khoản ", email, ". Nhấn nút bên dưới để chọn mật khẩu mới."),
            TextIntro: "Mở liên kết dưới đây để chọn mật khẩu mới cho tài khoản",
            Button: "Đặt mật khẩu mới",
            Expiry: $"Liên kết có hiệu lực trong {Duration(linkLifetime)} và chỉ dùng được một lần.",
            Safety: "Không phải bạn yêu cầu? Bỏ qua email này, mật khẩu của bạn vẫn giữ nguyên."));

    /// <summary>Intro carries the address in the middle: plain in the text part, bold in the HTML.</summary>
    private sealed record Copy(string Subject, string Preheader, string Heading,
        (string Before, string Value, string After) Intro, string TextIntro, string Button, string Expiry, string Safety);

    private static string Duration(TimeSpan span) =>
        span.TotalHours < 48 ? $"{Math.Max(1, (int)Math.Round(span.TotalHours))} giờ" : $"{(int)Math.Round(span.TotalDays)} ngày";

    private static EmailContent Build(string publicBaseUrl, string link, Copy copy)
    {
        if (!Uri.TryCreate(link, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https"))
            throw new ArgumentException("Email links must be absolute http(s) URLs.", nameof(link));
        var baseUrl = publicBaseUrl.TrimEnd('/');
        var site = new Uri(baseUrl).Host;

        var text = $"""
            {copy.Heading}

            {copy.TextIntro} {copy.Intro.Value}:

            {link}

            {copy.Expiry}
            {copy.Safety}

            --
            FinPilot - Sổ dòng tiền của shop
            {baseUrl}
            """;

        static string E(string value) => WebUtility.HtmlEncode(value);

        const string sans = "'IBM Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
        const string mono = "'IBM Plex Mono',ui-monospace,'SF Mono',Menlo,Consolas,'Roboto Mono',monospace";
        var href = E(link);

        var html = $$"""
            <!doctype html>
            <html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
            <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <meta name="x-apple-disable-message-reformatting">
            <meta name="color-scheme" content="light dark">
            <meta name="supported-color-schemes" content="light dark">
            <title>{{E(copy.Subject)}}</title>
            <style>
            a{text-decoration:none}
            @media (max-width:520px){
              .fp-outer{padding:12px 8px !important}
              .fp-pad{padding-left:22px !important;padding-right:22px !important}
              .fp-btn{width:100% !important}
              .fp-btn a{display:block !important}
              .fp-h1{font-size:22px !important}
            }
            @media (prefers-color-scheme:dark){
              .fp-page{background:#090d12 !important}
              .fp-card{background:#10161d !important;border-color:#212b37 !important}
              .fp-text{color:#e6ecf3 !important}
              .fp-soft{color:#c2ccd8 !important}
              .fp-muted{color:#8d9aab !important}
              .fp-box{background:#161e28 !important;border-color:#212b37 !important}
              .fp-link{color:#4cc9e0 !important}
              .fp-btn-fill{background:#4cc9e0 !important}
              .fp-btn-text{color:#04161c !important}
            }
            </style>
            </head>
            <body class="fp-page" style="margin:0;padding:0;background:#eef1f5;-webkit-text-size-adjust:100%">
            <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">{{E(copy.Preheader)}}{{string.Concat(Enumerable.Repeat("&#847;&zwnj;&nbsp;", 40))}}</div>
            <table role="presentation" class="fp-page" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef1f5" style="background:#eef1f5">
            <tr><td class="fp-outer" align="center" style="padding:28px 12px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
            <tr><td bgcolor="#090d12" style="background:#090d12;border-radius:12px 12px 0 0;padding:16px 28px;border-bottom:3px solid #4cc9e0" class="fp-pad">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td width="32" height="32" bgcolor="#4cc9e0" style="background:#4cc9e0;border-radius:8px;width:32px;height:32px"><img src="{{E(baseUrl)}}/{{LogoFile}}" width="32" height="32" alt="" style="display:block;border:0;width:32px;height:32px"></td>
                <td style="padding-left:10px;font-family:{{sans}};font-size:18px;line-height:24px;font-weight:600;color:#ffffff;letter-spacing:-0.2px">FinPilot</td>
              </tr></table>
            </td></tr>
            <tr><td class="fp-card fp-pad" bgcolor="#ffffff" style="background:#ffffff;border:1px solid #dde3ea;border-top:0;border-radius:0 0 12px 12px;padding:32px 36px 28px">
              <h1 class="fp-text fp-h1" style="margin:0 0 14px;font-family:{{sans}};font-size:24px;line-height:32px;font-weight:600;color:#0f1720">{{E(copy.Heading)}}</h1>
              <p class="fp-soft" style="margin:0 0 26px;font-family:{{sans}};font-size:16px;line-height:26px;color:#334155">{{E(copy.Intro.Before)}}<strong style="font-weight:600;word-wrap:break-word;overflow-wrap:break-word">{{E(copy.Intro.Value)}}</strong>{{E(copy.Intro.After)}}</p>
              <table role="presentation" class="fp-btn" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 22px"><tr>
                <td class="fp-btn-fill" bgcolor="#090d12" style="background:#090d12;border:1px solid #4cc9e0;border-radius:8px;mso-padding-alt:15px 32px" align="center">
                  <a class="fp-btn-text" href="{{href}}" target="_blank" style="display:inline-block;padding:15px 32px;font-family:{{sans}};font-size:17px;line-height:20px;font-weight:600;color:#4cc9e0;text-decoration:none;border-radius:8px">{{E(copy.Button)}}</a>
                </td>
              </tr></table>
              <p class="fp-soft" style="margin:0 0 6px;font-family:{{sans}};font-size:14px;line-height:22px;color:#334155">{{E(copy.Expiry)}}</p>
              <p class="fp-muted" style="margin:0 0 24px;font-family:{{sans}};font-size:14px;line-height:22px;color:#5b6676">{{E(copy.Safety)}}</p>
              <table role="presentation" class="fp-box" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f6f9" style="background:#f4f6f9;border:1px solid #e3e8ee;border-radius:8px"><tr>
                <td style="padding:14px 16px">
                  <p class="fp-muted" style="margin:0 0 6px;font-family:{{sans}};font-size:13px;line-height:20px;color:#5b6676">Nút không bấm được? Sao chép liên kết này vào trình duyệt:</p>
                  <a class="fp-link" href="{{href}}" target="_blank" style="font-family:{{mono}};font-size:13px;line-height:20px;color:#0e7490;word-break:break-all;text-decoration:underline">{{E(link)}}</a>
                </td>
              </tr></table>
            </td></tr>
            <tr><td class="fp-pad" style="padding:20px 36px 8px">
              <p class="fp-muted" style="margin:0;font-family:{{sans}};font-size:12px;line-height:19px;color:#5b6676">FinPilot · Sổ dòng tiền của shop · <a class="fp-muted" href="{{E(baseUrl)}}" target="_blank" style="color:#5b6676;text-decoration:underline">{{E(site)}}</a></p>
            </td></tr>
            </table>
            </td></tr>
            </table>
            </body>
            </html>
            """;

        return new EmailContent(copy.Subject, text, html);
    }
}
