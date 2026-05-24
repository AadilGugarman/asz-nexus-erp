/**
 * db/schema/billing.ts
 * Purchase invoices and Sales invoices.
 */

import { sqliteTable, text, real } from "drizzle-orm/sqlite-core";

// ── Purchase Invoices ─────────────────────────────────────────────────────────
export const purchaseInvoices = sqliteTable("purchase_invoices", {
  id:               text("id").primaryKey(),
  billNo:           text("bill_no").notNull(),
  date:             text("date").notNull(),
  supplierId:       text("supplier_id").notNull(),
  supplierName:     text("supplier_name").notNull(),
  items:            text("items").notNull().default("[]"),
  previousBalance:  real("previous_balance").notNull().default(0),
  todayAmount:      real("today_amount").notNull().default(0),
  freight:          real("freight"),
  hamali:           real("hamali"),
  paidAmount:       real("paid_amount").notNull().default(0),
  remainingBalance: real("remaining_balance").notNull().default(0),
  notes:            text("notes"),
  createdAt:        text("created_at").notNull(),
  companyId:        text("company_id"),
});

// ── Sales Invoices ────────────────────────────────────────────────────────────
export const invoices = sqliteTable("invoices", {
  id:               text("id").primaryKey(),
  invoiceNo:        text("invoice_no").notNull(),
  date:             text("date").notNull(),
  customerId:       text("customer_id").notNull(),
  customerName:     text("customer_name").notNull(),
  items:            text("items").notNull().default("[]"),
  previousBalance:  real("previous_balance").notNull().default(0),
  todayAmount:      real("today_amount").notNull().default(0),
  hamali:           real("hamali"),
  discount:         real("discount"),
  paidAmount:       real("paid_amount").notNull().default(0),
  remainingBalance: real("remaining_balance").notNull().default(0),
  notes:            text("notes"),
  createdAt:        text("created_at").notNull(),
  companyId:        text("company_id"),
});

// ── Inferred types ────────────────────────────────────────────────────────────
export type DbPurchaseInvoice       = typeof purchaseInvoices.$inferSelect;
export type DbPurchaseInvoiceInsert = typeof purchaseInvoices.$inferInsert;
export type DbInvoice               = typeof invoices.$inferSelect;
export type DbInvoiceInsert         = typeof invoices.$inferInsert;
