/**
 * db/schema/payments.ts
 * Payment receipts — covers both supplier payments and customer receipts.
 */

import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core';

// ── Payments ──────────────────────────────────────────────────────────────────
export const payments = sqliteTable('payments', {
  id:          text('id').primaryKey(),
  date:        text('date').notNull(),
  partyType:   text('party_type').notNull(),    // 'SUPPLIER' | 'CUSTOMER'
  partyId:     text('party_id').notNull(),
  partyName:   text('party_name').notNull(),
  amount:      real('amount').notNull(),
  paymentMode: text('payment_mode').notNull(),  // 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI'
  referenceNo: text('reference_no'),
  notes:       text('notes'),
});

// ── Inferred types ────────────────────────────────────────────────────────────
export type DbPayment       = typeof payments.$inferSelect;
export type DbPaymentInsert = typeof payments.$inferInsert;
