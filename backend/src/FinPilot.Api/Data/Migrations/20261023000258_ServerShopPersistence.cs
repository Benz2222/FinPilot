using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinPilot.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ServerShopPersistence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "audit_logs",
                schema: "finpilot",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    actor_user_id = table.Column<string>(type: "text", nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    entity_type = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    entity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    action = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    before_json = table.Column<string>(type: "jsonb", nullable: true),
                    after_json = table.Column<string>(type: "jsonb", nullable: false),
                    shop_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_logs", x => x.id);
                    table.UniqueConstraint("AK_audit_logs_id_shop_id", x => new { x.id, x.shop_id });
                    table.CheckConstraint("ck_audit_after", "jsonb_typeof(after_json) = 'object'");
                    table.CheckConstraint("ck_audit_before", "before_json IS NULL OR jsonb_typeof(before_json) = 'object'");
                    table.ForeignKey(
                        name: "FK_audit_logs_AspNetUsers_actor_user_id",
                        column: x => x.actor_user_id,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_audit_logs_shops_shop_id",
                        column: x => x.shop_id,
                        principalSchema: "finpilot",
                        principalTable: "shops",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "balance_snapshots",
                schema: "finpilot",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    as_of_date = table.Column<DateOnly>(type: "date", nullable: false),
                    closing_amount = table.Column<decimal>(type: "numeric(18,0)", precision: 18, scale: 0, nullable: false),
                    created_by = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    shop_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_balance_snapshots", x => x.id);
                    table.UniqueConstraint("AK_balance_snapshots_id_shop_id", x => new { x.id, x.shop_id });
                    table.CheckConstraint("ck_snapshot_amount", "closing_amount >= 0 AND closing_amount <> 'NaN'::numeric");
                    table.CheckConstraint("ck_snapshot_date", "isfinite(as_of_date)");
                    table.ForeignKey(
                        name: "FK_balance_snapshots_AspNetUsers_created_by",
                        column: x => x.created_by,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_balance_snapshots_shops_shop_id",
                        column: x => x.shop_id,
                        principalSchema: "finpilot",
                        principalTable: "shops",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "import_batches",
                schema: "finpilot",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    line_count = table.Column<int>(type: "integer", nullable: false),
                    created_by = table.Column<string>(type: "text", nullable: false),
                    committed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    removed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    shop_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_import_batches", x => x.id);
                    table.UniqueConstraint("AK_import_batches_id_shop_id", x => new { x.id, x.shop_id });
                    table.CheckConstraint("ck_import_count", "line_count >= 0");
                    table.CheckConstraint("ck_import_hash", "file_sha256 ~ '^[0-9a-f]{64}$'");
                    table.ForeignKey(
                        name: "FK_import_batches_AspNetUsers_created_by",
                        column: x => x.created_by,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_import_batches_shops_shop_id",
                        column: x => x.shop_id,
                        principalSchema: "finpilot",
                        principalTable: "shops",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "scenarios",
                schema: "finpilot",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    payload_json = table.Column<string>(type: "jsonb", nullable: false),
                    base_input_json = table.Column<string>(type: "jsonb", nullable: false),
                    base_data_version = table.Column<long>(type: "bigint", nullable: false),
                    created_by = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    removed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    shop_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_scenarios", x => x.id);
                    table.UniqueConstraint("AK_scenarios_id_shop_id", x => new { x.id, x.shop_id });
                    table.CheckConstraint("ck_scenario_baseline", "jsonb_typeof(base_input_json) = 'object'");
                    table.CheckConstraint("ck_scenario_name", "length(btrim(name)) > 0");
                    table.CheckConstraint("ck_scenario_payload", "jsonb_typeof(payload_json) = 'object'");
                    table.CheckConstraint("ck_scenario_version", "base_data_version >= 0");
                    table.ForeignKey(
                        name: "FK_scenarios_AspNetUsers_created_by",
                        column: x => x.created_by,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_scenarios_shops_shop_id",
                        column: x => x.shop_id,
                        principalSchema: "finpilot",
                        principalTable: "shops",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "obligations",
                schema: "finpilot",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    direction = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,0)", precision: 18, scale: 0, nullable: false),
                    due_date = table.Column<DateOnly>(type: "date", nullable: false),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    status = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    import_batch_id = table.Column<Guid>(type: "uuid", nullable: true),
                    removed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_by = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    shop_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_obligations", x => x.id);
                    table.UniqueConstraint("AK_obligations_id_shop_id", x => new { x.id, x.shop_id });
                    table.UniqueConstraint("AK_obligations_id_shop_id_direction", x => new { x.id, x.shop_id, x.direction });
                    table.CheckConstraint("ck_obligation_amount", "amount > 0 AND amount <> 'NaN'::numeric");
                    table.CheckConstraint("ck_obligation_date", "isfinite(due_date)");
                    table.CheckConstraint("ck_obligation_direction", "direction IN ('In','Out')");
                    table.CheckConstraint("ck_obligation_label", "length(btrim(label)) > 0");
                    table.CheckConstraint("ck_obligation_status", "status IN ('open','paid','cancelled')");
                    table.ForeignKey(
                        name: "FK_obligations_AspNetUsers_created_by",
                        column: x => x.created_by,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_obligations_import_batches_import_batch_id_shop_id",
                        columns: x => new { x.import_batch_id, x.shop_id },
                        principalSchema: "finpilot",
                        principalTable: "import_batches",
                        principalColumns: new[] { "id", "shop_id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_obligations_shops_shop_id",
                        column: x => x.shop_id,
                        principalSchema: "finpilot",
                        principalTable: "shops",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "cash_transactions",
                schema: "finpilot",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    payment_id = table.Column<Guid>(type: "uuid", nullable: false),
                    obligation_id = table.Column<Guid>(type: "uuid", nullable: false),
                    direction = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(18,0)", precision: 18, scale: 0, nullable: false),
                    tx_date = table.Column<DateOnly>(type: "date", nullable: false),
                    recorded_by = table.Column<string>(type: "text", nullable: false),
                    recorded_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    voided_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    voided_by = table.Column<string>(type: "text", nullable: true),
                    void_reason = table.Column<string>(type: "text", nullable: true),
                    shop_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cash_transactions", x => x.id);
                    table.UniqueConstraint("AK_cash_transactions_id_shop_id", x => new { x.id, x.shop_id });
                    table.CheckConstraint("ck_cash_amount", "amount > 0 AND amount <> 'NaN'::numeric");
                    table.CheckConstraint("ck_cash_date", "isfinite(tx_date)");
                    table.CheckConstraint("ck_cash_direction", "direction IN ('In','Out')");
                    table.CheckConstraint("ck_cash_void", "(voided_at IS NULL AND voided_by IS NULL AND void_reason IS NULL) OR (voided_at IS NOT NULL AND voided_by IS NOT NULL AND void_reason IS NOT NULL AND length(btrim(void_reason)) > 0)");
                    table.ForeignKey(
                        name: "FK_cash_transactions_AspNetUsers_recorded_by",
                        column: x => x.recorded_by,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_cash_transactions_AspNetUsers_voided_by",
                        column: x => x.voided_by,
                        principalTable: "AspNetUsers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_cash_transactions_obligations_obligation_id_shop_id_directi~",
                        columns: x => new { x.obligation_id, x.shop_id, x.direction },
                        principalSchema: "finpilot",
                        principalTable: "obligations",
                        principalColumns: new[] { "id", "shop_id", "direction" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_cash_transactions_shops_shop_id",
                        column: x => x.shop_id,
                        principalSchema: "finpilot",
                        principalTable: "shops",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_shops_current_snapshot_id_id",
                schema: "finpilot",
                table: "shops",
                columns: new[] { "current_snapshot_id", "id" });

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_actor_user_id",
                schema: "finpilot",
                table: "audit_logs",
                column: "actor_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_shop_id_occurred_at",
                schema: "finpilot",
                table: "audit_logs",
                columns: new[] { "shop_id", "occurred_at" });

            migrationBuilder.CreateIndex(
                name: "IX_balance_snapshots_created_by",
                schema: "finpilot",
                table: "balance_snapshots",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_balance_snapshots_shop_id",
                schema: "finpilot",
                table: "balance_snapshots",
                column: "shop_id");

            migrationBuilder.CreateIndex(
                name: "IX_cash_transactions_obligation_id_shop_id_direction",
                schema: "finpilot",
                table: "cash_transactions",
                columns: new[] { "obligation_id", "shop_id", "direction" });

            migrationBuilder.CreateIndex(
                name: "IX_cash_transactions_recorded_by",
                schema: "finpilot",
                table: "cash_transactions",
                column: "recorded_by");

            migrationBuilder.CreateIndex(
                name: "IX_cash_transactions_shop_id_obligation_id",
                schema: "finpilot",
                table: "cash_transactions",
                columns: new[] { "shop_id", "obligation_id" });

            migrationBuilder.CreateIndex(
                name: "IX_cash_transactions_shop_id_payment_id",
                schema: "finpilot",
                table: "cash_transactions",
                columns: new[] { "shop_id", "payment_id" },
                unique: true,
                filter: "voided_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_cash_transactions_voided_by",
                schema: "finpilot",
                table: "cash_transactions",
                column: "voided_by");

            migrationBuilder.CreateIndex(
                name: "IX_import_batches_created_by",
                schema: "finpilot",
                table: "import_batches",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_import_batches_shop_id_file_sha256",
                schema: "finpilot",
                table: "import_batches",
                columns: new[] { "shop_id", "file_sha256" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_obligations_created_by",
                schema: "finpilot",
                table: "obligations",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_obligations_import_batch_id_shop_id",
                schema: "finpilot",
                table: "obligations",
                columns: new[] { "import_batch_id", "shop_id" });

            migrationBuilder.CreateIndex(
                name: "IX_obligations_shop_id_due_date",
                schema: "finpilot",
                table: "obligations",
                columns: new[] { "shop_id", "due_date" });

            migrationBuilder.CreateIndex(
                name: "IX_scenarios_created_by",
                schema: "finpilot",
                table: "scenarios",
                column: "created_by");

            migrationBuilder.CreateIndex(
                name: "IX_scenarios_shop_id",
                schema: "finpilot",
                table: "scenarios",
                column: "shop_id");

            migrationBuilder.AddForeignKey(
                name: "FK_shops_balance_snapshots_current_snapshot_id_id",
                schema: "finpilot",
                table: "shops",
                columns: new[] { "current_snapshot_id", "id" },
                principalSchema: "finpilot",
                principalTable: "balance_snapshots",
                principalColumns: new[] { "id", "shop_id" },
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.Sql("""
                CREATE FUNCTION finpilot.reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    RAISE EXCEPTION '% is append-only: % forbidden', TG_TABLE_NAME, TG_OP;
                END $$;
                CREATE TRIGGER balance_snapshots_append_only BEFORE UPDATE OR DELETE ON finpilot.balance_snapshots
                    FOR EACH ROW EXECUTE FUNCTION finpilot.reject_mutation();
                CREATE TRIGGER audit_logs_append_only BEFORE UPDATE OR DELETE ON finpilot.audit_logs
                    FOR EACH ROW EXECUTE FUNCTION finpilot.reject_mutation();
                CREATE TRIGGER obligations_no_delete BEFORE DELETE ON finpilot.obligations
                    FOR EACH ROW EXECUTE FUNCTION finpilot.reject_mutation();
                CREATE TRIGGER import_batches_no_delete BEFORE DELETE ON finpilot.import_batches
                    FOR EACH ROW EXECUTE FUNCTION finpilot.reject_mutation();
                CREATE TRIGGER scenarios_no_delete BEFORE DELETE ON finpilot.scenarios
                    FOR EACH ROW EXECUTE FUNCTION finpilot.reject_mutation();
                CREATE FUNCTION finpilot.cash_transaction_guard() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Use VOID, never DELETE'; END IF;
                    IF OLD.voided_at IS NOT NULL THEN RAISE EXCEPTION 'A voided cash record is immutable'; END IF;
                    IF (to_jsonb(NEW) - ARRAY['voided_at','voided_by','void_reason']) IS DISTINCT FROM
                       (to_jsonb(OLD) - ARRAY['voided_at','voided_by','void_reason']) THEN
                        RAISE EXCEPTION 'Cash amount/date/link are immutable; void and enter a corrected record';
                    END IF;
                    IF NEW.voided_at IS NULL THEN RAISE EXCEPTION 'Only one-way VOID is allowed'; END IF;
                    RETURN NEW;
                END $$;
                CREATE TRIGGER cash_transaction_immutable BEFORE UPDATE OR DELETE ON finpilot.cash_transactions
                    FOR EACH ROW EXECUTE FUNCTION finpilot.cash_transaction_guard();
                CREATE VIEW finpilot.obligation_balances AS
                SELECT o.id, o.shop_id, o.direction, o.amount, o.status,
                       coalesce(p.settled_amount, 0::numeric) AS settled_amount,
                       o.amount - coalesce(p.settled_amount, 0::numeric) AS remaining_amount,
                       CASE WHEN o.status <> 'open' THEN 0::numeric
                            ELSE o.amount - coalesce(p.settled_amount, 0::numeric) END AS outstanding_amount
                FROM finpilot.obligations o
                LEFT JOIN (
                    SELECT shop_id, obligation_id, sum(amount) AS settled_amount
                    FROM finpilot.cash_transactions WHERE voided_at IS NULL
                    GROUP BY shop_id, obligation_id
                ) p ON p.shop_id = o.shop_id AND p.obligation_id = o.id
                WHERE o.removed_at IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP VIEW finpilot.obligation_balances;");
            migrationBuilder.DropForeignKey(
                name: "FK_shops_balance_snapshots_current_snapshot_id_id",
                schema: "finpilot",
                table: "shops");

            migrationBuilder.DropTable(
                name: "audit_logs",
                schema: "finpilot");

            migrationBuilder.DropTable(
                name: "balance_snapshots",
                schema: "finpilot");

            migrationBuilder.DropTable(
                name: "cash_transactions",
                schema: "finpilot");

            migrationBuilder.DropTable(
                name: "scenarios",
                schema: "finpilot");

            migrationBuilder.DropTable(
                name: "obligations",
                schema: "finpilot");

            migrationBuilder.DropTable(
                name: "import_batches",
                schema: "finpilot");

            migrationBuilder.DropIndex(
                name: "IX_shops_current_snapshot_id_id",
                schema: "finpilot",
                table: "shops");

            migrationBuilder.Sql("DROP FUNCTION finpilot.cash_transaction_guard(); DROP FUNCTION finpilot.reject_mutation();");
        }
    }
}
