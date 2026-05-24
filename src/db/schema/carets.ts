/**
 * db/schema/carets.ts
 * Caret (crate/box) transaction ledger.
 *
 * Every time a customer takes carets (GIVEN) or returns them (RETURN),
 * one row is inserted here. The running balance is computed on the fly
 * as: SUM(GIVEN) - SUM(RETURN) per customer.
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ── Caret Transactions ────────────────────────────────────────────────────────
export const caretTransactions = sqliteTable('caret_transactions', {
  id:          text('id').primaryKey(),
  date:        text('date').notNull(),
  customerId:  text('customer_id').notNull(),
  customerName:text('customer_name').notNull(),
  type:        text('type').notNull(),          // 'GIVEN' | 'RETURN'
  fruitName:   text('fruit_name').notNull().default(''),
  caretQty:    integer('caret_qty').notNull().default(0),
  note:        text('note'),
  billId:      text('bill_id'),                 // optional link to invoice
  billNo:      text('bill_no'),                 // optional invoice number
  companyId:   text('company_id'),
  createdAt:   text('created_at').notNull(),
});

// ── Inferred types ────────────────────────────────────────────────────────────
export type DbCaretTransaction       = typeof caretTransactions.$inferSelect;
export type DbCaretTransactionInsert = typeof caretTransactions.$inferInsert;
