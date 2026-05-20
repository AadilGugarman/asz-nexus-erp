/**
 * db/queries/common.queries.ts
 * Reusable typed query patterns shared across modules.
 *
 * These are standalone functions (not class methods) for cases where
 * you need a one-off query without a full repository instance.
 */

import { eq, like, desc, count, sum } from 'drizzle-orm';
import type { DrizzleDb } from '../client';
import { suppliers }       from '../schema/parties';
import { customers }       from '../schema/parties';
import { invoices }        from '../schema/billing';
import { purchaseInvoices } from '../schema/billing';
import { payments }        from '../schema/payments';
import { vehicleArrivals } from '../schema/inventory';

// ── Dashboard summary queries ─────────────────────────────────────────────────

export interface DashboardStats {
  totalSuppliers:  number;
  totalCustomers:  number;
  totalInvoices:   number;
  totalPurchases:  number;
  totalPayments:   number;
  totalArrivals:   number;
}

export async function getDashboardStats(db: DrizzleDb): Promise<DashboardStats> {
  const [
    [suppliersRow],
    [customersRow],
    [invoicesRow],
    [purchasesRow],
    [paymentsRow],
    [arrivalsRow],
  ] = await Promise.all([
    db.select({ count: count() }).from(suppliers),
    db.select({ count: count() }).from(customers),
    db.select({ count: count() }).from(invoices),
    db.select({ count: count() }).from(purchaseInvoices),
    db.select({ count: count() }).from(payments),
    db.select({ count: count() }).from(vehicleArrivals),
  ]);

  return {
    totalSuppliers: Number(suppliersRow?.count ?? 0),
    totalCustomers: Number(customersRow?.count ?? 0),
    totalInvoices:  Number(invoicesRow?.count  ?? 0),
    totalPurchases: Number(purchasesRow?.count ?? 0),
    totalPayments:  Number(paymentsRow?.count  ?? 0),
    totalArrivals:  Number(arrivalsRow?.count  ?? 0),
  };
}

// ── Party balance queries ─────────────────────────────────────────────────────

/** Total outstanding balance for a supplier (previousBalance + purchases - payments). */
export async function getSupplierBalance(db: DrizzleDb, supplierId: string): Promise<number> {
  const [supplierRow] = await db
    .select({ previousBalance: suppliers.previousBalance })
    .from(suppliers)
    .where(eq(suppliers.id, supplierId))
    .limit(1);

  if (!supplierRow) return 0;

  const [purchaseRow] = await db
    .select({ total: sum(purchaseInvoices.todayAmount) })
    .from(purchaseInvoices)
    .where(eq(purchaseInvoices.supplierId, supplierId));

  const [paymentRow] = await db
    .select({ total: sum(payments.amount) })
    .from(payments)
    .where(eq(payments.partyId, supplierId));

  const purchases = Number(purchaseRow?.total ?? 0);
  const paid      = Number(paymentRow?.total  ?? 0);

  return supplierRow.previousBalance + purchases - paid;
}

/** Total outstanding balance for a customer (previousBalance + invoices - payments). */
export async function getCustomerBalance(db: DrizzleDb, customerId: string): Promise<number> {
  const [customerRow] = await db
    .select({ previousBalance: customers.previousBalance })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  if (!customerRow) return 0;

  const [invoiceRow] = await db
    .select({ total: sum(invoices.todayAmount) })
    .from(invoices)
    .where(eq(invoices.customerId, customerId));

  const [paymentRow] = await db
    .select({ total: sum(payments.amount) })
    .from(payments)
    .where(eq(payments.partyId, customerId));

  const invoiced = Number(invoiceRow?.total ?? 0);
  const paid     = Number(paymentRow?.total ?? 0);

  return customerRow.previousBalance + invoiced - paid;
}

// ── Recent records ────────────────────────────────────────────────────────────

export async function getRecentInvoices(db: DrizzleDb, limit = 10) {
  return db
    .select()
    .from(invoices)
    .orderBy(desc(invoices.createdAt))
    .limit(limit);
}

export async function getRecentArrivals(db: DrizzleDb, limit = 10) {
  return db
    .select()
    .from(vehicleArrivals)
    .orderBy(desc(vehicleArrivals.createdAt))
    .limit(limit);
}

// ── Search across parties ─────────────────────────────────────────────────────

export async function searchSuppliers(db: DrizzleDb, query: string) {
  const pattern = `%${query}%`;
  return db
    .select()
    .from(suppliers)
    .where(like(suppliers.name, pattern))
    .limit(20);
}

export async function searchCustomers(db: DrizzleDb, query: string) {
  const pattern = `%${query}%`;
  return db
    .select()
    .from(customers)
    .where(like(customers.name, pattern))
    .limit(20);
}
