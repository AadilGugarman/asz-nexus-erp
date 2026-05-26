/**
 * db/schema/parties.ts
 * Suppliers and Customers — the two party types in the ERP.
 */

import { sqliteTable, text, real } from 'drizzle-orm/sqlite-core';

// ── Suppliers ─────────────────────────────────────────────────────────────────
export const suppliers = sqliteTable('suppliers', {
  id:              text('id').primaryKey(),
  name:            text('name').notNull(),
  code:            text('code').notNull().default(''),
  phone:           text('phone').notNull().default(''),
  email:           text('email').notNull().default(''),
  gstin:           text('gstin').notNull().default(''),
  city:            text('city').notNull().default(''),
  state:           text('state').notNull().default(''),
  billingAddress:  text('billing_address').notNull().default(''),
  shippingAddress: text('shipping_address').notNull().default(''),
  previousBalance: real('previous_balance').notNull().default(0),
  creditLimit:     real('credit_limit').notNull().default(0),
  notes:           text('notes').notNull().default(''),
  companyId:       text('company_id'),
});

// ── Customers ─────────────────────────────────────────────────────────────────
export const customers = sqliteTable('customers', {
  id:              text('id').primaryKey(),
  name:            text('name').notNull(),
  phone:           text('phone').notNull().default(''),
  email:           text('email').notNull().default(''),
  gstin:           text('gstin').notNull().default(''),
  city:            text('city').notNull().default(''),
  state:           text('state').notNull().default(''),
  billingAddress:  text('billing_address').notNull().default(''),
  shippingAddress: text('shipping_address').notNull().default(''),
  previousBalance: real('previous_balance').notNull().default(0),
  creditLimit:     real('credit_limit').notNull().default(0),
  notes:           text('notes').notNull().default(''),
  companyId:       text('company_id'),
});

// ── Inferred types ────────────────────────────────────────────────────────────
export type DbSupplier       = typeof suppliers.$inferSelect;
export type DbSupplierInsert = typeof suppliers.$inferInsert;
export type DbCustomer       = typeof customers.$inferSelect;
export type DbCustomerInsert = typeof customers.$inferInsert;
