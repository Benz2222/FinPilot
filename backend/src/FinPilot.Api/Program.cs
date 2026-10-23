using System.Text.Json;
using System.Text.Json.Serialization;
using FinPilot.Api.Data;
using FinPilot.Api.Json;
using FinPilot.Api.Import;
using FinPilot.Api.Auth;
using FinPilot.Api.Shops;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException(
        "ConnectionStrings:Default is required. In Development, configure it with dotnet user-secrets for FinPilot.Api.");

builder.Services.AddSingleton<ImportPreviewService>();
builder.Services.AddScoped<ShopService>();
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-CSRF-TOKEN";
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
});

var smtp = builder.Configuration.GetSection("Smtp").Get<SmtpSettings>() ?? new SmtpSettings();
if (!builder.Environment.IsDevelopment() && !smtp.IsConfigured)
    throw new InvalidOperationException("Configure Smtp:Host, Port, UseStartTls, Username, Password and From before starting Production.");
var publicBaseUrl = builder.Configuration["App:PublicBaseUrl"];
if (string.IsNullOrWhiteSpace(publicBaseUrl) && builder.Environment.IsDevelopment())
    builder.Configuration["App:PublicBaseUrl"] = publicBaseUrl = "http://localhost:5173";
if (!Uri.TryCreate(publicBaseUrl, UriKind.Absolute, out var publicUri) || publicUri.Scheme is not ("http" or "https") ||
    (!builder.Environment.IsDevelopment() && publicUri.Scheme != "https"))
    throw new InvalidOperationException("App:PublicBaseUrl must be the public frontend URL (HTTPS in Production).");
builder.Services.Configure<SmtpSettings>(builder.Configuration.GetSection("Smtp"));
builder.Services.AddTransient<IEmailDelivery, SmtpEmailDelivery>();

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.JsonSerializerOptions.Converters.Add(new VndStringConverter());
    options.JsonSerializerOptions.Converters.Add(new IsoDateConverter());
    options.JsonSerializerOptions.AllowOutOfOrderMetadataProperties = true;
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false));
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));
builder.Services.AddAuthorization();
builder.Services.AddIdentityApiEndpoints<IdentityUser>()
    .AddEntityFrameworkStores<AppDbContext>();
builder.Services.AddTransient<IEmailSender<IdentityUser>, IdentityEmailSender>();
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = IdentityConstants.ApplicationScheme;
    options.DefaultChallengeScheme = IdentityConstants.ApplicationScheme;
    options.DefaultForbidScheme = IdentityConstants.ApplicationScheme;
});
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment()
        ? CookieSecurePolicy.SameAsRequest
        : CookieSecurePolicy.Always;
    options.Events.OnRedirectToLogin = context =>
    {
        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    options.Events.OnRedirectToAccessDenied = context =>
    {
        context.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

var app = builder.Build();
if (!smtp.IsConfigured && app.Environment.IsDevelopment())
    app.Logger.LogWarning("Smtp is not configured. Development reset links will be logged; do not use this mode in Production.");

if (!app.Environment.IsDevelopment())
    app.UseHttpsRedirection();

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api"))
        context.Response.Headers.CacheControl = "no-store";
    var path = context.Request.Path.Value?.TrimEnd('/') ?? "";
    var write = HttpMethods.IsPost(context.Request.Method) || HttpMethods.IsPut(context.Request.Method) ||
        HttpMethods.IsDelete(context.Request.Method) || HttpMethods.IsPatch(context.Request.Method);
    var stateless = path.Equals("/api/forecast/preview", StringComparison.OrdinalIgnoreCase) ||
        path.Equals("/api/import/preview", StringComparison.OrdinalIgnoreCase) ||
        path.Equals("/api/import/template", StringComparison.OrdinalIgnoreCase);
    if (write && context.Request.Path.StartsWithSegments("/api") && !stateless)
    {
        try
        {
            // Require the header even when an antiforgery form field was provided.
            if (!context.Request.Headers.ContainsKey("X-CSRF-TOKEN")) throw new AntiforgeryValidationException("Missing CSRF header.");
            await context.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(context);
        }
        catch (AntiforgeryValidationException)
        {
            await Results.Problem(statusCode: 400, title: "A valid X-CSRF-TOKEN header is required.").ExecuteAsync(context);
            return;
        }
    }
    await next(context);
});
app.UseAuthorization();

app.MapGroup("/api/auth").AddEndpointFilterFactory((context, next) =>
{
    var useCookiesIndex = Array.FindIndex(context.MethodInfo.GetParameters(), parameter => parameter.Name == "useCookies");
    return async invocation =>
    {
        if (string.Equals(invocation.HttpContext.Request.Path.Value?.TrimEnd('/'), "/api/auth/refresh", StringComparison.OrdinalIgnoreCase))
            return Results.NotFound();

        if (useCookiesIndex >= 0)
            invocation.Arguments[useCookiesIndex] = true;

        return await next(invocation);
    };
}).MapIdentityApi<IdentityUser>();
app.MapGet("/api/csrf", (HttpContext context, IAntiforgery antiforgery) =>
{
    context.Response.Headers.CacheControl = "no-store";
    return Results.Ok(new { token = antiforgery.GetAndStoreTokens(context).RequestToken });
}).AllowAnonymous();
app.MapPost("/api/auth/logout", async (SignInManager<IdentityUser> manager) =>
{
    await manager.SignOutAsync();
    return Results.NoContent();
}).RequireAuthorization();
app.MapGet("/api/auth/me", async (HttpContext context, UserManager<IdentityUser> users) =>
{
    var user = await users.GetUserAsync(context.User);
    return user is null ? Results.Unauthorized() : Results.Ok(new { user.Email });
}).RequireAuthorization();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" })).AllowAnonymous();
app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();

public partial class Program;
