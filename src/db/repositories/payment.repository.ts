/**
 * db/repositories/payment.repository.ts
 * Drizzle queries for the payments table.
 */

import { eq, desc, and, sum } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { payments } from '../schema/payments';
import type { DbPayment, DbPaymentInsert } from '../schema/payments';
import type { DrizzleDb } from '../client';
import type { PaginationParams, PagedResult } from './base.repository';

export interface PaymentFilter extends PaginationParams {
  partyId?:   string;
  partyType?: 'SUPPLIER' | 'CUSTOMER';
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

    if (filter.partyId)   conditions.push(eq(payments.partyId,   filter.partyId));
    if (filter.partyType) conditions.push(eq(payments.partyType, filter.partyType));
    if (filter.dateFrom)  conditions.push(eq(payments.date,      filter.dateFrom));

    const where = conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

    return this.findPaged(filter, where, desc(payments.date));
  }

  async findByParty(partyId: string): Promise<DbPayment[]> {
    return this.db
      .select()
      .from(payments)
      .where(eq(payments.partyId, partyId))
      .orderBy(desc(payments.date));
  }

  /** Sum of all payments for a party — useful for balance calculations. */
  async totalPaidByParty(partyId: string): Promise<number> {
    const rows = await this.db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(eq(payments.partyId, partyId));
    return Number(rows[0]?.total ?? 0);
  }
}
