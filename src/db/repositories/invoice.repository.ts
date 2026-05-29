/**
 * db/repositories/invoice.repository.ts
 * Drizzle queries for invoices (Sales & Purchase).
 */

import { eq, like, desc, and } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { invoices, invoiceItems } from '../schema/transactions';
import type { DrizzleDb } from '../client';
import type { PaginationParams, PagedResult } from './base.repository';

export type DbInvoice = typeof invoices.$inferSelect;
export type DbInvoiceInsert = typeof invoices.$inferInsert;
export type DbInvoiceItem = typeof invoiceItems.$inferSelect;
export type DbInvoiceItemInsert = typeof invoiceItems.$inferInsert;

// ── Invoice Repository ────────────────────────────────────────────────────────

export interface InvoiceFilter extends PaginationParams {
  ledgerId?: string;
  type?:      'SALE' | 'PURCHASE';
  dateFrom?:   string;
  search?:     string; // matches invoiceNumber
}

export class InvoiceRepository extends BaseRepository<
  typeof invoices,
  DbInvoice,
  DbInvoiceInsert
> {
  constructor(db: DrizzleDb) {
    super(db, invoices);
  }

  async search(filter: InvoiceFilter): Promise<PagedResult<DbInvoice>> {
    const conditions = [];

    if (filter.ledgerId) conditions.push(eq(invoices.ledgerId, filter.ledgerId));
    if (filter.type)     conditions.push(eq(invoices.type, filter.type));
    if (filter.dateFrom) conditions.push(eq(invoices.date, new Date(filter.dateFrom)));
    if (filter.search) {
      conditions.push(like(invoices.invoiceNumber, `%${filter.search}%`));
    }

    const where = conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

    return this.findPaged(filter, where, desc(invoices.date));
  }

  async findByLedger(ledgerId: string): Promise<DbInvoice[]> {
    return this.db
      .select()
      .from(invoices)
      .where(eq(invoices.ledgerId, ledgerId))
      .orderBy(desc(invoices.date));
  }

  async getLastInvoiceNo(type: 'SALE' | 'PURCHASE'): Promise<string | null> {
    const rows = await this.db
      .select({ invoiceNumber: invoices.invoiceNumber })
      .from(invoices)
      .where(eq(invoices.type, type))
      .orderBy(desc(invoices.createdAt))
      .limit(1);
    return rows[0]?.invoiceNumber ?? null;
  }

  async getItems(invoiceId: string): Promise<DbInvoiceItem[]> {
    return this.db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId));
  }
}
