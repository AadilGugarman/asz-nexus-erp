/**
 * db/repositories/invoice.repository.ts
 * Drizzle queries for sales invoices and purchase invoices.
 */

import { eq, like, desc, and } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { invoices, purchaseInvoices } from '../schema/billing';
import type {
  DbInvoice, DbInvoiceInsert,
  DbPurchaseInvoice, DbPurchaseInvoiceInsert,
} from '../schema/billing';
import type { DrizzleDb } from '../client';
import type { PaginationParams, PagedResult } from './base.repository';
import type { InvoiceItem, PurchaseInvoiceItem } from '@/types';

// ── Sales Invoice Repository ──────────────────────────────────────────────────

export interface InvoiceFilter extends PaginationParams {
  customerId?: string;
  dateFrom?:   string;
  dateTo?:     string;
  search?:     string; // matches invoiceNo or customerName
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

    if (filter.customerId) conditions.push(eq(invoices.customerId, filter.customerId));
    if (filter.dateFrom)   conditions.push(eq(invoices.date, filter.dateFrom));
    if (filter.search) {
      conditions.push(like(invoices.customerName, `%${filter.search}%`));
    }

    const where = conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

    return this.findPaged(filter, where, desc(invoices.date));
  }

  async findByCustomer(customerId: string): Promise<DbInvoice[]> {
    return this.db
      .select()
      .from(invoices)
      .where(eq(invoices.customerId, customerId))
      .orderBy(desc(invoices.date));
  }

  async getLastInvoiceNo(): Promise<string | null> {
    const rows = await this.db
      .select({ invoiceNo: invoices.invoiceNo })
      .from(invoices)
      .orderBy(desc(invoices.createdAt))
      .limit(1);
    return rows[0]?.invoiceNo ?? null;
  }

  parseItems(invoice: DbInvoice): InvoiceItem[] {
    try { return JSON.parse(invoice.items) as InvoiceItem[]; }
    catch { return []; }
  }
}

// ── Purchase Invoice Repository ───────────────────────────────────────────────

export interface PurchaseInvoiceFilter extends PaginationParams {
  supplierId?: string;
  dateFrom?:   string;
  search?:     string;
}

export class PurchaseInvoiceRepository extends BaseRepository<
  typeof purchaseInvoices,
  DbPurchaseInvoice,
  DbPurchaseInvoiceInsert
> {
  constructor(db: DrizzleDb) {
    super(db, purchaseInvoices);
  }

  async search(filter: PurchaseInvoiceFilter): Promise<PagedResult<DbPurchaseInvoice>> {
    const conditions = [];

    if (filter.supplierId) conditions.push(eq(purchaseInvoices.supplierId, filter.supplierId));
    if (filter.dateFrom)   conditions.push(eq(purchaseInvoices.date, filter.dateFrom));
    if (filter.search) {
      conditions.push(like(purchaseInvoices.supplierName, `%${filter.search}%`));
    }

    const where = conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

    return this.findPaged(filter, where, desc(purchaseInvoices.date));
  }

  async findBySupplier(supplierId: string): Promise<DbPurchaseInvoice[]> {
    return this.db
      .select()
      .from(purchaseInvoices)
      .where(eq(purchaseInvoices.supplierId, supplierId))
      .orderBy(desc(purchaseInvoices.date));
  }

  parseItems(invoice: DbPurchaseInvoice): PurchaseInvoiceItem[] {
    try { return JSON.parse(invoice.items) as PurchaseInvoiceItem[]; }
    catch { return []; }
  }
}
