import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { companies, financialYears } from "./core";
import { ledgers } from "./master";
import { invoices } from "./transactions";

/**
 * CARET TRANSACTIONS
 * Tracks crates/carets given to or returned by parties.
 */
export const caretTransactions = sqliteTable(
  "caret_transactions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    financialYearId: text("financial_year_id")
      .notNull()
      .references(() => financialYears.id),

    ledgerId: text("ledger_id")
      .notNull()
      .references(() => ledgers.id), // Customer or Supplier

    type: text("type").notNull(), // 'GIVEN', 'RETURNED'
    quantity: integer("quantity").notNull(),
    date: integer("date", { mode: "timestamp" }).notNull(),

    fruitName: text("fruit_name"),
    notes: text("notes"),

    // Optional link to invoice
    invoiceId: text("invoice_id").references(() => invoices.id, {
      onDelete: "set null",
    }),

    // ── Flat app columns (migration 0002) ─────────────────────────────────
    customerIdFlat: text("customer_id_flat"),
    customerName: text("customer_name"),
    caretQty: integer("caret_qty").default(0),
    note: text("note"),
    billId: text("bill_id"),
    billNo: text("bill_no"),

    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
  },
  (table) => ({
    companyFyLedgerIdx: index("caret_company_fy_ledger_idx").on(
      table.companyId,
      table.financialYearId,
      table.ledgerId,
    ),
  }),
);
