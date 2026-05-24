/**
 * db/repositories/caret.repository.ts
 * CRUD for caret_transactions table.
 */

import { caretTransactions, DbCaretTransaction, DbCaretTransactionInsert } from '../schema/carets';
import { BaseRepository, eq } from './base.repository';
import type { DrizzleDb } from '../client';

export class CaretRepository extends BaseRepository<
  typeof caretTransactions,
  DbCaretTransaction,
  DbCaretTransactionInsert
> {
  constructor(db: DrizzleDb) {
    super(db, caretTransactions);
  }

  /** All transactions for a specific customer, scoped to company. */
  async findByCustomer(customerId: string, companyId?: string): Promise<DbCaretTransaction[]> {
    return this.findAll(eq(caretTransactions.customerId, customerId), companyId);
  }
}
