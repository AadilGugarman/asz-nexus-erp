/**
 * db/repositories/base.repository.ts
 * Generic base repository providing typed CRUD over Drizzle ORM.
 *
 * All domain repositories extend this class. The generic parameters are:
 *   TTable  — the Drizzle table object (e.g. typeof suppliers)
 *   TSelect — the inferred SELECT type   (e.g. DbSupplier)
 *   TInsert — the inferred INSERT type   (e.g. DbSupplierInsert)
 *
 * Usage:
 *   class SupplierRepository extends BaseRepository<
 *     typeof suppliers, DbSupplier, DbSupplierInsert
 *   > {
 *     constructor(db: DrizzleDb) { super(db, suppliers); }
 *   }
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { eq, like, and, desc, asc, SQL, count } from 'drizzle-orm';
import type { DrizzleDb } from '../client';

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number;   // 1-based, default 1
  limit?: number;  // rows per page, default 20, max 200
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function buildPagination(params: PaginationParams) {
  const page  = Math.max(1, params.page  ?? 1);
  const limit = Math.min(200, Math.max(1, params.limit ?? 20));
  return { page, limit, offset: (page - 1) * limit };
}

// ── Base repository ───────────────────────────────────────────────────────────

export class BaseRepository<
  TTable extends { [K: string]: any },
  TSelect extends Record<string, any>,
  TInsert extends Record<string, any>,
> {
  constructor(
    protected readonly db: DrizzleDb,
    protected readonly table: TTable,
  ) {}

  // ── findById ───────────────────────────────────────────────────────────────

  async findById(id: string): Promise<TSelect | null> {
    const rows = await (this.db as any)
      .select()
      .from(this.table)
      .where(eq((this.table as any).id, id))
      .limit(1);
    return (rows[0] as TSelect) ?? null;
  }

  // ── findAll ────────────────────────────────────────────────────────────────

  async findAll(where?: SQL): Promise<TSelect[]> {
    const q = (this.db as any).select().from(this.table);
    if (where) q.where(where);
    return q as Promise<TSelect[]>;
  }

  // ── findPaged ──────────────────────────────────────────────────────────────

  async findPaged(
    pagination: PaginationParams,
    where?: SQL,
    orderBy?: SQL,
  ): Promise<PagedResult<TSelect>> {
    const { page, limit, offset } = buildPagination(pagination);

    // Count query
    const countQ = (this.db as any).select({ count: count() }).from(this.table);
    if (where) countQ.where(where);
    const [{ count: total }] = await countQ;

    // Data query
    const dataQ = (this.db as any).select().from(this.table);
    if (where)   dataQ.where(where);
    if (orderBy) dataQ.orderBy(orderBy);
    dataQ.limit(limit).offset(offset);
    const items: TSelect[] = await dataQ;

    return {
      items,
      total: Number(total),
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(Number(total) / limit)),
    };
  }

  // ── insert ─────────────────────────────────────────────────────────────────

  async insert(data: TInsert): Promise<TSelect> {
    await (this.db as any).insert(this.table).values(data);
    const row = await this.findById((data as any).id);
    if (!row) throw new Error('Insert succeeded but record not found');
    return row;
  }

  // ── update ─────────────────────────────────────────────────────────────────

  async update(id: string, data: Partial<TInsert>): Promise<TSelect> {
    await (this.db as any)
      .update(this.table)
      .set(data)
      .where(eq((this.table as any).id, id));
    const row = await this.findById(id);
    if (!row) throw new Error(`Record '${id}' not found after update`);
    return row;
  }

  // ── delete ─────────────────────────────────────────────────────────────────

  async delete(id: string): Promise<void> {
    await (this.db as any)
      .delete(this.table)
      .where(eq((this.table as any).id, id));
  }

  // ── exists ─────────────────────────────────────────────────────────────────

  async exists(where: SQL): Promise<boolean> {
    const rows = await (this.db as any)
      .select({ count: count() })
      .from(this.table)
      .where(where)
      .limit(1);
    return Number(rows[0]?.count ?? 0) > 0;
  }
}

// Re-export Drizzle helpers so repositories don't need to import drizzle-orm directly
export { eq, like, and, desc, asc, count };
export type { SQL };
