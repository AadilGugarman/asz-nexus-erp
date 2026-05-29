/**
 * db/repositories/caret.repository.ts
 * CRUD for caret_transactions table.
 */

import { caretTransactions } from "../schema";
import { BaseRepository, eq } from "./base.repository";
import type { DrizzleDb } from "../client";

export type DbCaretTransaction = typeof caretTransactions.$inferSelect;
export type DbCaretTransactionInsert = typeof caretTransactions.$inferInsert;

export class CaretRepository extends BaseRepository<
  typeof caretTransactions,
  DbCaretTransaction,
  DbCaretTransactionInsert
> {
  constructor(db: DrizzleDb) {
    super(db, caretTransactions);
  }

  /** All transactions for a specific ledger (Customer/Supplier), scoped to company. */
  async findByLedger(
    ledgerId: string,
    companyId?: string,
  ): Promise<DbCaretTransaction[]> {
    return this.findAll(eq(caretTransactions.ledgerId, ledgerId), companyId);
  }
}
