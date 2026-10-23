using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FinPilot.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class PersistKeysAndEnableRowSecurity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DataProtectionKeys",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FriendlyName = table.Column<string>(type: "text", nullable: true),
                    Xml = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DataProtectionKeys", x => x.Id);
                });

            foreach (var table in PublicTables)
                migrationBuilder.Sql($"ALTER TABLE public.\"{table}\" ENABLE ROW LEVEL SECURITY;");
            foreach (var table in BusinessTables)
                migrationBuilder.Sql($"ALTER TABLE finpilot.\"{table}\" ENABLE ROW LEVEL SECURITY;");
            // Views otherwise read as their owner and can bypass the underlying tables' RLS.
            migrationBuilder.Sql("ALTER VIEW finpilot.obligation_balances SET (security_invoker = true);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER VIEW finpilot.obligation_balances RESET (security_invoker);");
            foreach (var table in BusinessTables)
                migrationBuilder.Sql($"ALTER TABLE finpilot.\"{table}\" DISABLE ROW LEVEL SECURITY;");
            foreach (var table in PublicTables)
                migrationBuilder.Sql($"ALTER TABLE public.\"{table}\" DISABLE ROW LEVEL SECURITY;");
            migrationBuilder.DropTable(
                name: "DataProtectionKeys");
        }

        private static readonly string[] PublicTables =
        [
            "AspNetRoleClaims", "AspNetRoles", "AspNetUserClaims", "AspNetUserLogins",
            "AspNetUserRoles", "AspNetUsers", "AspNetUserTokens", "DataProtectionKeys", "__EFMigrationsHistory"
        ];

        private static readonly string[] BusinessTables =
        [
            "shops", "balance_snapshots", "obligations", "cash_transactions", "import_batches", "scenarios", "audit_logs"
        ];
    }
}
