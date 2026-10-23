using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using FinPilot.Api.Data;
using FinPilot.Api.Auth;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Testcontainers.PostgreSql;

namespace FinPilot.Api.Tests;

public sealed class ShopFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private PostgreSqlContainer? postgres;
    private string connection = "";
    private string? adminConnection;
    public CapturingEmailDelivery Mail { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder) => builder
        .UseEnvironment("Development")
        .UseSetting("ConnectionStrings:Default", connection)
        .UseSetting("App:PublicBaseUrl", "https://finpilot.test")
        .ConfigureTestServices(services =>
        {
            services.AddSingleton<IEmailDelivery>(Mail);
            services.AddDataProtection().UseEphemeralDataProtectionProvider();
        });

    public async Task InitializeAsync()
    {
        var supplied = Environment.GetEnvironmentVariable("FINPILOT_TEST_POSTGRES");
        if (string.IsNullOrWhiteSpace(supplied))
        {
            postgres = new PostgreSqlBuilder("postgres:17-alpine").Build();
            await postgres.StartAsync();
            connection = postgres.GetConnectionString();
        }
        else
        {
            adminConnection = supplied;
            var isolated = new NpgsqlConnectionStringBuilder(supplied) { Database = $"finpilot_test_{Guid.NewGuid():N}" };
            await using var admin = new NpgsqlConnection(adminConnection);
            await admin.OpenAsync();
            await using var create = new NpgsqlCommand($"CREATE DATABASE {isolated.Database}", admin);
            await create.ExecuteNonQueryAsync();
            connection = isolated.ConnectionString;
        }
        using var scope = Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.MigrateAsync();
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        if (postgres is not null) await postgres.DisposeAsync();
        if (adminConnection is not null && connection.Length > 0)
        {
            NpgsqlConnection.ClearAllPools();
            await using var admin = new NpgsqlConnection(adminConnection);
            await admin.OpenAsync();
            var database = new NpgsqlConnectionStringBuilder(connection).Database;
            await using var drop = new NpgsqlCommand($"DROP DATABASE {database} WITH (FORCE)", admin);
            await drop.ExecuteNonQueryAsync();
        }
    }

    public async Task<HttpClient> Account()
    {
        var client = CreateClient();
        await Token(client);
        var email = $"{Guid.NewGuid():N}@example.test";
        (await client.PostAsJsonAsync("/api/auth/register", new { email, password = "Initial-Password1!" })).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/auth/login", new { email, password = "Initial-Password1!" })).EnsureSuccessStatusCode();
        await Token(client);
        (await client.PostAsJsonAsync("/api/shop", new { name = email })).EnsureSuccessStatusCode();
        return client;
    }

    public static async Task Token(HttpClient client)
    {
        var token = await client.GetFromJsonAsync<JsonObject>("/api/csrf");
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-CSRF-TOKEN", token!["token"]!.GetValue<string>());
    }
}

public sealed class CapturingEmailDelivery : IEmailDelivery
{
    public ConcurrentQueue<(string Email, string Body)> Messages { get; } = new();
    public Task Send(string email, string subject, string body)
    {
        Messages.Enqueue((email, body));
        return Task.CompletedTask;
    }
}

public sealed class ShopTests(ShopFixture factory) : IClassFixture<ShopFixture>
{
    private static JsonObject Obligation(Guid? id = null, JsonArray? payments = null) => new()
    {
        ["id"] = (id ?? Guid.NewGuid()).ToString(), ["direction"] = "Out", ["label"] = "Inventory",
        ["amount"] = "10", ["date"] = "2026-01-10", ["note"] = "", ["status"] = "open",
        ["payments"] = payments ?? new JsonArray()
    };

    private static async Task<JsonObject> Put(HttpClient client, string path, JsonObject body)
    {
        var response = await client.PutAsJsonAsync(path, body);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<JsonObject>())!;
    }

    [Fact]
    public async Task OtherShopIdsCannotBeReadChangedOrDeleted()
    {
        using var a = await factory.Account();
        using var b = await factory.Account();
        var paymentId = Guid.NewGuid();
        var obligation = Obligation(payments: new JsonArray(new JsonObject
            { ["id"] = paymentId.ToString(), ["amount"] = "4", ["date"] = "2026-01-02" }));
        var obligationPath = $"/api/shop/obligations/{obligation["id"]}";
        await Put(a, obligationPath, obligation);
        var scenario = new JsonObject
        {
            ["id"] = Guid.NewGuid().ToString(), ["name"] = "Private plan", ["createdAt"] = "2026-01-01T00:00:00Z",
            ["adjustments"] = new JsonArray(), ["baseFingerprint"] = "abc", ["outcome"] = null
        };
        var scenarioPath = $"/api/shop/scenarios/{scenario["id"]}";
        await Put(a, scenarioPath, scenario);
        var before = await a.GetFromJsonAsync<JsonObject>("/api/shop");
        Assert.Equal(HttpStatusCode.NotFound, (await b.GetAsync(obligationPath)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.PutAsJsonAsync(obligationPath, obligation)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.DeleteAsync(obligationPath)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.GetAsync(scenarioPath)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.PutAsJsonAsync(scenarioPath, scenario)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.DeleteAsync(scenarioPath)).StatusCode);
        Assert.True(JsonNode.DeepEquals(before, await a.GetFromJsonAsync<JsonObject>("/api/shop")));
        var other = await b.GetFromJsonAsync<JsonObject>("/api/shop");
        Assert.Empty(other!["obligations"]!.AsArray());
        Assert.Empty(other["scenarios"]!.AsArray());
        var mixedPayment = Obligation(payments: new JsonArray(new JsonObject
            { ["id"] = paymentId.ToString(), ["amount"] = "4", ["date"] = "2026-01-02" }));
        Assert.Equal(HttpStatusCode.NotFound, (await b.PutAsJsonAsync($"/api/shop/obligations/{mixedPayment["id"]}", mixedPayment)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.PostAsJsonAsync("/api/shop/imports", new
            { fileSha256 = new string('c', 64), fileName = "foreign.csv", obligations = new[] { obligation } })).StatusCode);
        var replacement = new JsonObject
        {
            ["version"] = 1, ["balance"] = null, ["obligations"] = new JsonArray(obligation.DeepClone()),
            ["scenarios"] = new JsonArray(), ["imports"] = new JsonArray()
        };
        Assert.Equal(HttpStatusCode.NotFound, (await b.PutAsJsonAsync("/api/shop/data", replacement)).StatusCode);
        Assert.True(JsonNode.DeepEquals(before, await a.GetFromJsonAsync<JsonObject>("/api/shop")));
        Assert.True(JsonNode.DeepEquals(other, await b.GetFromJsonAsync<JsonObject>("/api/shop")));
    }

    [Fact]
    public async Task MissingCsrfTokenRejectsAuthenticatedAndAnonymousWrites()
    {
        using var client = await factory.Account();
        client.DefaultRequestHeaders.Remove("X-CSRF-TOKEN");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync("/api/shop/balance",
            new { amount = "50", cutoff = "2026-01-01" })).StatusCode);
        using var anonymous = factory.CreateClient();
        Assert.Equal(HttpStatusCode.BadRequest, (await anonymous.PostAsJsonAsync("/api/auth/register",
            new { email = "csrf@example.test", password = "Initial-Password1!" })).StatusCode);
    }

    [Fact]
    public async Task ImportIsAtomicAndSameHashCannotCommitTwice()
    {
        using var client = await factory.Account();
        var hash = new string('a', 64);
        var body = new { fileSha256 = hash, fileName = "cash.csv", obligations = new[] { Obligation() } };
        (await client.PostAsJsonAsync("/api/shop/imports", body)).EnsureSuccessStatusCode();
        var retry = await client.PostAsJsonAsync("/api/shop/imports", body);
        Assert.Equal(HttpStatusCode.Conflict, retry.StatusCode);
        Assert.NotNull((await retry.Content.ReadFromJsonAsync<JsonObject>())!["committedAt"]);
        var shop = await client.GetFromJsonAsync<JsonObject>("/api/shop");
        Assert.Single(shop!["obligations"]!.AsArray());
        Assert.Single(shop["imports"]!.AsArray());
    }

    [Fact]
    public async Task PaymentsReduceRemainderAndRemovalPreservesVoidedCashRecord()
    {
        using var client = await factory.Account();
        var paymentId = Guid.NewGuid();
        var obligation = Obligation(payments: new JsonArray(new JsonObject
            { ["id"] = paymentId.ToString(), ["amount"] = "4", ["date"] = "2026-01-02" }));
        var path = $"/api/shop/obligations/{obligation["id"]}";
        var saved = await Put(client, path, obligation);
        var row = Assert.Single(saved["obligations"]!.AsArray())!;
        Assert.Equal(6m, decimal.Parse(row["amount"]!.GetValue<string>()) -
            decimal.Parse(row["payments"]![0]!["amount"]!.GetValue<string>()));
        using (var balanceScope = factory.Services.CreateScope())
        {
            var balanceDb = balanceScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var obligationId = Guid.Parse(obligation["id"]!.GetValue<string>());
            Assert.Equal(6m, await balanceDb.Database.SqlQuery<decimal>(
                $"SELECT remaining_amount AS \"Value\" FROM finpilot.obligation_balances WHERE id = {obligationId}").SingleAsync());
        }
        obligation["payments"] = new JsonArray();
        var removed = await Put(client, path, obligation);
        Assert.Empty(removed["obligations"]![0]!["payments"]!.AsArray());
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var voided = await db.Database.SqlQuery<int>($"SELECT count(*)::int AS \"Value\" FROM finpilot.cash_transactions WHERE payment_id = {paymentId} AND voided_at IS NOT NULL").SingleAsync();
        Assert.Equal(1, voided);
        var delete = await Assert.ThrowsAsync<PostgresException>(() => db.Database.ExecuteSqlInterpolatedAsync(
            $"DELETE FROM finpilot.cash_transactions WHERE payment_id = {paymentId}"));
        Assert.Equal(PostgresErrorCodes.RaiseException, delete.SqlState);
    }

    [Fact]
    public async Task WriteBumpsVersionAndCreatesAuditInSameTransaction()
    {
        using var client = await factory.Account();
        var before = await client.GetFromJsonAsync<JsonObject>("/api/shop");
        var obligation = Obligation();
        var after = await Put(client, $"/api/shop/obligations/{obligation["id"]}", obligation);
        Assert.Equal(before!["dataVersion"]!.GetValue<long>() + 1, after["dataVersion"]!.GetValue<long>());
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var id = Guid.Parse(obligation["id"]!.GetValue<string>());
        Assert.Equal(1, await db.Database.SqlQuery<int>($"SELECT count(*)::int AS \"Value\" FROM finpilot.audit_logs WHERE entity_id = {id}").SingleAsync());
        var tamper = await Assert.ThrowsAsync<PostgresException>(() => db.Database.ExecuteSqlInterpolatedAsync(
            $"DELETE FROM finpilot.audit_logs WHERE entity_id = {id}"));
        Assert.Equal(PostgresErrorCodes.RaiseException, tamper.SqlState);
    }

    [Fact]
    public async Task ForgotPasswordDeliversUsableResetLinkAndOldPasswordStopsWorking()
    {
        using var client = await factory.Account();
        var email = (await client.GetFromJsonAsync<JsonObject>("/api/auth/me"))!["email"]!.GetValue<string>();
        using (var scope = factory.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<IdentityUser>>();
            var user = (await users.FindByEmailAsync(email))!;
            var token = await users.GenerateEmailConfirmationTokenAsync(user);
            Assert.True((await users.ConfirmEmailAsync(user, token)).Succeeded);
        }
        (await client.PostAsJsonAsync("/api/auth/forgotPassword", new { email })).EnsureSuccessStatusCode();
        var message = Assert.Single(factory.Mail.Messages, x => x.Email == email && x.Body.Contains("/reset-password?"));
        var link = new Uri(System.Text.RegularExpressions.Regex.Match(message.Body, @"https?://\S+").Value);
        Assert.Equal("/reset-password", link.AbsolutePath);
        var query = QueryHelpers.ParseQuery(link.Query);
        Assert.Equal(email, query["email"]);
        (await client.PostAsJsonAsync("/api/auth/logout", new { })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
        await ShopFixture.Token(client);
        (await client.PostAsJsonAsync("/api/auth/resetPassword", new
        {
            email, resetCode = query["code"].ToString(), newPassword = "Changed-Password2!"
        })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/login",
            new { email, password = "Initial-Password1!" })).StatusCode);
        (await client.PostAsJsonAsync("/api/auth/login", new { email, password = "Changed-Password2!" })).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task FailedImportRollsBackEarlierRowsBatchAuditAndVersion()
    {
        using var client = await factory.Account();
        var before = await client.GetFromJsonAsync<JsonObject>("/api/shop");
        var invalid = Obligation(payments: new JsonArray(new JsonObject
            { ["id"] = Guid.NewGuid().ToString(), ["amount"] = "11", ["date"] = "2026-01-02" }));
        var response = await client.PostAsJsonAsync("/api/shop/imports", new
        {
            fileSha256 = new string('b', 64), fileName = "invalid.csv", obligations = new[] { Obligation(), invalid }
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True(JsonNode.DeepEquals(before, await client.GetFromJsonAsync<JsonObject>("/api/shop")));
    }

    [Fact]
    public async Task FractionalMoneyIsRejectedBeforePostgresCanRoundIt()
    {
        using var client = await factory.Account();
        var response = await client.PutAsJsonAsync("/api/shop/balance", new { amount = "50.5", cutoff = "2026-01-01" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Null((await client.GetFromJsonAsync<JsonObject>("/api/shop"))!["balance"]);
    }

    [Fact]
    public async Task InvalidCalendarDateCannotBecomeASnapshot()
    {
        using var client = await factory.Account();
        var response = await client.PutAsJsonAsync("/api/shop/balance", new { amount = "50", cutoff = "2026-02-30" });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Null((await client.GetFromJsonAsync<JsonObject>("/api/shop"))!["balance"]);
    }

    [Fact]
    public async Task ScenarioAdjustmentsDoNotChangeRealObligations()
    {
        using var client = await factory.Account();
        var obligation = Obligation();
        var before = await Put(client, $"/api/shop/obligations/{obligation["id"]}", obligation);
        var scenario = new JsonObject
        {
            ["id"] = Guid.NewGuid().ToString(), ["name"] = "Smaller purchase", ["createdAt"] = "2026-01-01T00:00:00Z",
            ["baseFingerprint"] = "abc", ["outcome"] = null,
            ["adjustments"] = new JsonArray(new JsonObject
            {
                ["id"] = Guid.NewGuid().ToString(), ["targetId"] = obligation["id"]!.GetValue<string>(),
                ["amount"] = "3", ["kind"] = "resize"
            })
        };
        var after = await Put(client, $"/api/shop/scenarios/{scenario["id"]}", scenario);
        Assert.True(JsonNode.DeepEquals(before["obligations"], after["obligations"]));
        Assert.Equal("3", after["scenarios"]![0]!["adjustments"]![0]!["amount"]!.GetValue<string>());
    }

    [Fact]
    public async Task ReplacingDataHidesOldRowsWhilePreservingFinancialHistory()
    {
        using var client = await factory.Account();
        await Put(client, "/api/shop/balance", new JsonObject { ["amount"] = "50", ["cutoff"] = "2026-01-01" });
        var obligation = Obligation(payments: new JsonArray(new JsonObject
        {
            ["id"] = Guid.NewGuid().ToString(), ["amount"] = "4", ["date"] = "2026-01-02"
        }));
        var before = await Put(client, $"/api/shop/obligations/{obligation["id"]}", obligation);
        var after = await Put(client, "/api/shop/data", new JsonObject
        {
            ["version"] = 1, ["balance"] = null, ["obligations"] = new JsonArray(),
            ["scenarios"] = new JsonArray(), ["imports"] = new JsonArray()
        });
        Assert.Empty(after["obligations"]!.AsArray());
        Assert.Null(after["balance"]);
        Assert.Equal(before["dataVersion"]!.GetValue<long>() + 1, after["dataVersion"]!.GetValue<long>());
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var id = Guid.Parse(obligation["id"]!.GetValue<string>());
        Assert.NotNull((await db.Obligations.SingleAsync(x => x.Id == id)).RemovedAt);
        Assert.NotNull((await db.CashTransactions.SingleAsync(x => x.ObligationId == id)).VoidedAt);
        var shopId = (await db.Obligations.SingleAsync(x => x.Id == id)).ShopId;
        Assert.Equal(1, await db.BalanceSnapshots.CountAsync(x => x.ShopId == shopId));
    }

    [Fact]
    public async Task ConcurrentWritesKeepBothObligationsAndVersions()
    {
        using var client = await factory.Account();
        var obligation = Obligation();
        var first = await Put(client, $"/api/shop/obligations/{obligation["id"]}", obligation);
        var left = Obligation();
        var right = Obligation();
        await Task.WhenAll(Put(client, $"/api/shop/obligations/{left["id"]}", left),
            Put(client, $"/api/shop/obligations/{right["id"]}", right));
        var after = await client.GetFromJsonAsync<JsonObject>("/api/shop");
        Assert.Equal(3, after!["obligations"]!.AsArray().Count);
        Assert.Equal(first["dataVersion"]!.GetValue<long>() + 2, after["dataVersion"]!.GetValue<long>());
    }
}
