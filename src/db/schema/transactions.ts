import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { companies, financialYears } from "./core";
import { ledgers, varieties } from "./master";

/**
 * INVOICES (Sales & Purchase)
 */
export const invoices = sqliteTable(
  "invoices",
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

    type: text("type").notNull(), // 'SALE', 'PURCHASE'
    invoiceNumber: text("invoice_number").notNull(),
    date: integer("date", { mode: "timestamp" }).notNull(),

    ledgerId: text("ledger_id")
      .notNull()
      .references(() => ledgers.id), // Customer or Supplier

    // Logistics info
    vehicleNo: text("vehicle_no"),
    declaredWeight: real("declared_weight"),

    // Financial Summary
    subTotal: real("sub_total").notNull(),
    taxTotal: real("tax_total").default(0),
    discountTotal: real("discount_total").default(0),
    freight: real("freight").default(0), // Bhaada
    hamali: real("hamali").default(0), // Labour (Purchase specific)
    otherCharges: real("other_charges").default(0),
    roundOff: real("round_off").default(0),
    grandTotal: real("grand_total").notNull(),

    paidAmount: real("paid_amount").default(0),

    notes: text("notes"),
    status: text("status").default("DRAFT"), // DRAFT, FINAL, CANCELLED

    // ── Flat app columns (migration 0002) ─────────────────────────────────
    // These nullable columns store the legacy UI data model alongside the
    // normalised schema so the app can read back what it wrote.
    invoiceNo: text("invoice_no"),
    customerId: text("customer_id"),
    customerName: text("customer_name"),
    supplierId: text("supplier_id"),
    supplierName: text("supplier_name"),
    billNo: text("bill_no"),
    itemsJson: text("items_json"),
    previousBalance: real("previous_balance").default(0),
    todayAmount: real("today_amount").default(0),
    remainingBalance: real("remaining_balance").default(0),
    discount: real("discount").default(0),

    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
    updatedAt: integer("updated_at", { mode: "timestamp" }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
  },
  (table) => ({
    companyFyIdx: index("invoice_company_fy_idx").on(
      table.companyId,
      table.financialYearId,
    ),
    invoiceNumIdx: index("invoice_num_idx").on(table.invoiceNumber),
  }),
);

/**
 * INVOICE ITEMS
 */
export const invoiceItems = sqliteTable("invoice_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  varietyId: text("variety_id")
    .notNull()
    .references(() => varieties.id),

  quantity: real("quantity").notNull(), // Carets/Crates
  weight: real("weight"), // Actual weight in KG
  rate: real("rate").notNull(),
  pricingType: text("pricing_type").default("caret"), // 'kg' or 'caret'
  amount: real("amount").notNull(),

  taxRate: real("tax_rate").default(0),
  taxAmount: real("tax_amount").default(0),
  rowNote: text("row_note"),
});

/**
 * PAYMENTS / RECEIPTS
 */
export const payments = sqliteTable(
  "payments",
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

    type: text("type").notNull(), // 'PAYMENT', 'RECEIPT'
    voucherNumber: text("voucher_number").notNull(),
    date: integer("date", { mode: "timestamp" }).notNull(),

    ledgerId: text("ledger_id")
      .notNull()
      .references(() => ledgers.id),
    // Offset ledger (usually Cash or Bank)
    offsetLedgerId: text("offset_ledger_id")
      .notNull()
      .references(() => ledgers.id),

    amount: real("amount").notNull(),
    paymentMode: text("payment_mode").default("CASH"), // 'CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI'
    referenceNo: text("reference_no"),
    narration: text("narration"),

    // ── Flat app columns (migration 0002) ─────────────────────────────────
    partyType: text("party_type"),   // 'SUPPLIER' | 'CUSTOMER'
    partyId: text("party_id"),
    partyName: text("party_name"),
    paymentNotes: text("payment_notes"),

    createdAt: integer("created_at", { mode: "timestamp" }).default(
      sql`CURRENT_TIMESTAMP`,
    ),
  },
  (table) => ({
    companyFyIdx: index("payment_company_fy_idx").on(
      table.companyId,
      table.financialYearId,
    ),
  }),
);
