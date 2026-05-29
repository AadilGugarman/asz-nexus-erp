/**
 * db/queries/common.queries.ts
 * Reusable typed query patterns shared across modules.
 */

import { eq, and, count } from 'drizzle-orm';
import type { DrizzleDb } from '../client';
import { ledgers, invoices, payments, accountGroups } from '../schema';

export interface DashboardStats {
  totalLedgers:  number;
  totalInvoices:   number;
  totalPayments:   number;
}

/**
 * Get stats for a specific company and financial year
 */
export async function getDashboardStats(
  db: DrizzleDb, 
  companyId: string, 
  fyId: string
): Promise<DashboardStats> {
  const [
    [ledgersRow],
    [invoicesRow],
    [paymentsRow],
  ] = await Promise.all([
    db.select({ count: count() }).from(ledgers).where(eq(ledgers.companyId, companyId)),
    db.select({ count: count() }).from(invoices).where(
      and(eq(invoices.companyId, companyId), eq(invoices.financialYearId, fyId))
    ),
    db.select({ count: count() }).from(payments).where(
      and(eq(payments.companyId, companyId), eq(payments.financialYearId, fyId))
    ),
  ]);

  return {
    totalLedgers: Number(ledgersRow?.count ?? 0),
    totalInvoices:  Number(invoicesRow?.count  ?? 0),
    totalPayments:  Number(paymentsRow?.count  ?? 0),
  };
}
