using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinPilot.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InventoryAndRevenue : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "stock_document_id",
                schema: "finpilot",
                table: "obligations",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "products",
                schema: "finpilot",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    code = table.Column<string>(type: "text", nullable: false),
                    unit = table.Column<string>(type: "text", nullable: false),
                    sale_price = table.Column<decimal>(type: "numeric(18,0)", precision: 18, scale: 0, nullable: false),
                    cost_price = table.Column<decimal>(type: "numeric(18,0)", precision: 18, scale: 0, nullable: false),
                    low_stock_at = table.Column<int>(type: "integer", nullable: true),
                    archived = table.Column<bool>(type: "boolean", nullable: false),
                    shop_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_products", x => x.id);
                    table.UniqueConstraint("AK_products_id_shop_id", x => new { x.id, x.shop_id });
                    table.CheckConstraint("ck_product_low_stock", "low_stock_at IS NULL OR low_stock_at >= 0");
                    table.CheckConstraint("ck_product_name", "length(btrim(name)) > 0");
                    table.CheckConstraint("ck_product_prices", "sale_price >= 0 AND sale_price <> 'NaN'::numeric AND cost_price >= 0 AND cost_price <> 'NaN'::numeric");
                    table.ForeignKey(
                        name: "FK_products_shops_shop_id",
                        column: x => x.shop_id,
                        principalSchema: "finpilot",
                        principalTable: "shops",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "stock_documents",
                schema: "finpilot",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    party = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    note = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    cash_date = table.Column<DateOnly>(type: "date", nullable: true),
                    settled = table.Column<bool>(type: "boolean", nullable: true),
                    obligation_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    removed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    shop_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stock_documents", x => x.id);
                    table.UniqueConstraint("AK_stock_documents_id_shop_id", x => new { x.id, x.shop_id });
                    table.CheckConstraint("ck_stock_document_cash", "(kind IN ('in','sale') AND cash_date IS NOT NULL AND settled IS NOT NULL) OR (kind IN ('out','count') AND cash_date IS NULL AND settled IS NULL AND obligation_id IS NULL)");
                    table.CheckConstraint("ck_stock_document_date", "isfinite(date) AND (cash_date IS NULL OR isfinite(cash_date))");
                    table.CheckConstraint("ck_stock_document_kind", "kind IN ('in','sale','out','count')");
                    table.ForeignKey(
                        name: "FK_stock_documents_obligations_obligation_id_shop_id",
                        columns: x => new { x.obligation_id, x.shop_id },
                        principalSchema: "finpilot",
                        principalTable: "obligations",
                        principalColumns: new[] { "id", "shop_id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_stock_documents_shops_shop_id",
                        column: x => x.shop_id,
                        principalSchema: "finpilot",
                        principalTable: "shops",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "stock_document_lines",
                schema: "finpilot",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    document_id = table.Column<Guid>(type: "uuid", nullable: false),
                    product_id = table.Column<Guid>(type: "uuid", nullable: false),
                    position = table.Column<int>(type: "integer", nullable: false),
                    quantity = table.Column<int>(type: "integer", nullable: false),
                    unit_price = table.Column<decimal>(type: "numeric(18,0)", precision: 18, scale: 0, nullable: false),
                    removed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    shop_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stock_document_lines", x => x.id);
                    table.UniqueConstraint("AK_stock_document_lines_id_shop_id", x => new { x.id, x.shop_id });
                    table.CheckConstraint("ck_stock_line_position", "position >= 0 AND position < 200");
                    table.CheckConstraint("ck_stock_line_price", "unit_price >= 0 AND unit_price <> 'NaN'::numeric");
                    table.CheckConstraint("ck_stock_line_quantity", "quantity >= 0");
                    table.ForeignKey(
                        name: "FK_stock_document_lines_products_product_id_shop_id",
                        columns: x => new { x.product_id, x.shop_id },
                        principalSchema: "finpilot",
                        principalTable: "products",
                        principalColumns: new[] { "id", "shop_id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_stock_document_lines_shops_shop_id",
                        column: x => x.shop_id,
                        principalSchema: "finpilot",
                        principalTable: "shops",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_stock_document_lines_stock_documents_document_id_shop_id",
                        columns: x => new { x.document_id, x.shop_id },
                        principalSchema: "finpilot",
                        principalTable: "stock_documents",
                        principalColumns: new[] { "id", "shop_id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_obligations_stock_document_id_shop_id",
                schema: "finpilot",
                table: "obligations",
                columns: new[] { "stock_document_id", "shop_id" });

            migrationBuilder.CreateIndex(
                name: "IX_products_shop_id_code",
                schema: "finpilot",
                table: "products",
                columns: new[] { "shop_id", "code" },
                unique: true,
                filter: "code <> ''");

            migrationBuilder.CreateIndex(
                name: "IX_stock_document_lines_document_id_shop_id_product_id",
                schema: "finpilot",
                table: "stock_document_lines",
                columns: new[] { "document_id", "shop_id", "product_id" },
                unique: true,
                filter: "removed_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_stock_document_lines_product_id_shop_id",
                schema: "finpilot",
                table: "stock_document_lines",
                columns: new[] { "product_id", "shop_id" });

            migrationBuilder.CreateIndex(
                name: "IX_stock_document_lines_shop_id",
                schema: "finpilot",
                table: "stock_document_lines",
                column: "shop_id");

            migrationBuilder.CreateIndex(
                name: "IX_stock_documents_obligation_id_shop_id",
                schema: "finpilot",
                table: "stock_documents",
                columns: new[] { "obligation_id", "shop_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_stock_documents_shop_id_date_created_at",
                schema: "finpilot",
                table: "stock_documents",
                columns: new[] { "shop_id", "date", "created_at" });

            migrationBuilder.AddForeignKey(
                name: "FK_obligations_stock_documents_stock_document_id_shop_id",
                schema: "finpilot",
                table: "obligations",
                columns: new[] { "stock_document_id", "shop_id" },
                principalSchema: "finpilot",
                principalTable: "stock_documents",
                principalColumns: new[] { "id", "shop_id" },
                onDelete: ReferentialAction.Restrict);

            foreach (var table in new[] { "products", "stock_documents", "stock_document_lines" })
                migrationBuilder.Sql($"ALTER TABLE finpilot.{table} ENABLE ROW LEVEL SECURITY;");
            // Match the existing owner-role deployment: no public policies and no FORCE RLS.
            migrationBuilder.Sql("""
                CREATE TRIGGER stock_documents_no_delete BEFORE DELETE ON finpilot.stock_documents
                    FOR EACH ROW EXECUTE FUNCTION finpilot.reject_mutation();
                CREATE FUNCTION finpilot.stock_line_guard() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Remove stock lines, never DELETE'; END IF;
                    IF OLD.removed_at IS NOT NULL OR NEW.removed_at IS NULL OR
                       (to_jsonb(NEW) - 'removed_at') IS DISTINCT FROM (to_jsonb(OLD) - 'removed_at') THEN
                        RAISE EXCEPTION 'Stock lines are immutable; remove and enter corrected lines';
                    END IF;
                    RETURN NEW;
                END $$;
                CREATE TRIGGER stock_lines_immutable BEFORE UPDATE OR DELETE ON finpilot.stock_document_lines
                    FOR EACH ROW EXECUTE FUNCTION finpilot.stock_line_guard();
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_obligations_stock_documents_stock_document_id_shop_id",
                schema: "finpilot",
                table: "obligations");

            migrationBuilder.DropTable(
                name: "stock_document_lines",
                schema: "finpilot");

            migrationBuilder.DropTable(
                name: "products",
                schema: "finpilot");

            migrationBuilder.DropTable(
                name: "stock_documents",
                schema: "finpilot");

            migrationBuilder.DropIndex(
                name: "IX_obligations_stock_document_id_shop_id",
                schema: "finpilot",
                table: "obligations");

            migrationBuilder.DropColumn(
                name: "stock_document_id",
                schema: "finpilot",
                table: "obligations");
            migrationBuilder.Sql("DROP FUNCTION finpilot.stock_line_guard();");
        }
    }
}
