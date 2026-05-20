/**
 * db/schema.ts
 * Drizzle ORM schema — SQLite (used via Tauri's SQLite plugin).
 *
 * Each table mirrors the TypeScript types in src/types.ts.
 * Add new tables here; run `npm run db:generate` to create migrations.
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// ── Fruits ───────────────────────────────────────────────────────────────────
export const fruits = sqliteTable('fruits', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  varieties: text('varieties').notNull().default('[]'), // JSON array
});

// ── Suppliers ────────────────────────────────────────────────────────────────
export const suppliers = sqliteTable('suppliers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().default(''),
  phone: text('phone').notNull().default(''),
  city: text('city').notNull().default(''),
  previousBalance: real('previous_balance').notNull().default(0),
});

// ── Customers ────────────────────────────────────────────────────────────────
export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull().default(''),
  city: text('city').notNull().default(''),
  previousBalance: real('previous_balance').notNull().default(0),
});

// ── Vehicle Arrivals ─────────────────────────────────────────────────────────
export const vehicleArrivals = sqliteTable('vehicle_arrivals', {
  id: text('id').primaryKey(),
  arrivalNo: text('arrival_no').notNull(),
  date: text('date').notNull(),
  day: text('day').notNull().default(''),
  vehicleNo: text('vehicle_no').notNull(),
  vehicleName: text('vehicle_name'),
  fruitType: text('fruit_type').notNull(),
  totalVehicleWeight: real('total_vehicle_weight').notNull().default(0),
  driverName: text('driver_name'),
  notes: text('notes'),
  rows: text('rows').notNull().default('[]'),         // JSON
  totalCarets: real('total_carets').notNull().default(0),
  totalCalculatedWeight: real('total_calculated_weight').notNull().default(0),
  totalAmount: real('total_amount').notNull().default(0),
  freightCharge: real('freight_charge'),
  hamaliCharge: real('hamali_charge'),
  advancePaid: real('advance_paid'),
  status: text('status').notNull().default('DRAFT'),  // 'DRAFT' | 'SAVED'
  createdAt: text('created_at').notNull(),
});

// ── Purchase Invoices ────────────────────────────────────────────────────────
export const purchaseInvoices = sqliteTable('purchase_invoices', {
  id: text('id').primaryKey(),
  billNo: text('bill_no').notNull(),
  date: text('date').notNull(),
  supplierId: text('supplier_id').notNull(),
  supplierName: text('supplier_name').notNull(),
  items: text('items').notNull().default('[]'),       // JSON
  previousBalance: real('previous_balance').notNull().default(0),
  todayAmount: real('today_amount').notNull().default(0),
  freight: real('freight'),
  hamali: real('hamali'),
  paidAmount: real('paid_amount').notNull().default(0),
  remainingBalance: real('remaining_balance').notNull().default(0),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

// ── Sales Invoices ───────────────────────────────────────────────────────────
export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  invoiceNo: text('invoice_no').notNull(),
  date: text('date').notNull(),
  customerId: text('customer_id').notNull(),
  customerName: text('customer_name').notNull(),
  items: text('items').notNull().default('[]'),       // JSON
  previousBalance: real('previous_balance').notNull().default(0),
  todayAmount: real('today_amount').notNull().default(0),
  hamali: real('hamali'),
  discount: real('discount'),
  paidAmount: real('paid_amount').notNull().default(0),
  remainingBalance: real('remaining_balance').notNull().default(0),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

// ── Payment Receipts ─────────────────────────────────────────────────────────
export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  partyType: text('party_type').notNull(),            // 'SUPPLIER' | 'CUSTOMER'
  partyId: text('party_id').notNull(),
  partyName: text('party_name').notNull(),
  amount: real('amount').notNull(),
  paymentMode: text('payment_mode').notNull(),        // 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI'
  referenceNo: text('reference_no'),
  notes: text('notes'),
});

// ── App Settings ─────────────────────────────────────────────────────────────
export const appSettings = sqliteTable('app_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),                     // JSON blob
});

// ── Type exports (inferred from schema) ──────────────────────────────────────
export type DbFruit = typeof fruits.$inferSelect;
export type DbSupplier = typeof suppliers.$inferSelect;
export type DbCustomer = typeof customers.$inferSelect;
export type DbVehicleArrival = typeof vehicleArrivals.$inferSelect;
export type DbPurchaseInvoice = typeof purchaseInvoices.$inferSelect;
export type DbInvoice = typeof invoices.$inferSelect;
export type DbPayment = typeof payments.$inferSelect;
