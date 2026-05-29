/**
 * db/repositories/payment.repository.ts
 * Drizzle queries for the payments table.
 */

import { eq, desc, and, sum } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { payments } from '../schema/transactions';
import { ledgers } from '../schema/master';
import type { DrizzleDb } from '../client';
import type { PaginationParams, PagedResult } from './base.repository';

export type DbPayment = typeof payments.$inferSelect;
export type DbPaymentInsert = typeof payments.$inferInsert;

export interface PaymentFilter extends PaginationParams {
  ledgerId?: string;
  type?:      'PAYMENT' | 'RECEIPT';
  dateFrom?:  string;
}

export class PaymentRepository extends BaseRepository<
  typeof payments,
  DbPayment,
  DbPaymentInsert
> {
  constructor(db: DrizzleDb) {
    super(db, payments);
  }

  async search(filter: PaymentFilter): Promise<PagedResult<DbPayment>> {
    const conditions = [];

    if (filter.ledgerId) conditions.push(eq(payments.ledgerId, filter.ledgerId));
    if (filter.type)     conditions.push(eq(payments.type,     filter.type));
    if (filter.dateFrom)  conditions.push(eq(payments.date,      new Date(filter.dateFrom)));

    const where = conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

    return this.findPaged(filter, where, desc(payments.date));
  }

  async findByLedger(ledgerId: string): Promise<DbPayment[]> {
    return this.db
      .select()
      .from(payments)
      .where(eq(payments.ledgerId, ledgerId))
      .orderBy(desc(payments.date));
  }

  /** Sum of all payments for a ledger — useful for balance calculations. */
  async totalByLedger(ledgerId: string, type: 'PAYMENT' | 'RECEIPT'): Promise<number> {
    const rows = await this.db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(and(eq(payments.ledgerId, ledgerId), eq(payments.type, type)));
    return Number(rows[0]?.total ?? 0);
  }

  /**
   * Ensure a system Cash ledger exists for the given company.
   * The cash ledger is used as the offsetLedgerId for payment vouchers.
   * Returns the cash ledger ID.
   */
  async ensureCashLedger(companyId: string): Promise<string> {
    const cashLedgerId = `${companyId}__cash`;

    const existing = await (this.db as any)
      .select({ id: ledgers.id })
      .from(ledgers)
      .where(eq(ledgers.id, cashLedgerId))
      .limit(1);

    if (existing.length === 0) {
      await (this.db as any)
        .insert(ledgers)
        .values({
          id: cashLedgerId,
          companyId,
          groupId: `${companyId}__cash-in-hand`,
          name: 'Cash',
          type: 'BOTH',
          isSystem: true,
        })
        .onConflictDoNothing();
    }

    return cashLedgerId;
  }
}
