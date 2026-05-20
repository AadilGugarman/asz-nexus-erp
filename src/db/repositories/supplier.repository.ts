/**
 * db/repositories/supplier.repository.ts
 * All Drizzle queries for the suppliers table.
 *
 * Usage:
 *   const db = await getDb();
 *   if (!db) return;
 *   const repo = new SupplierRepository(db);
 *   const all  = await repo.findAll();
 *   const one  = await repo.findById('abc');
 */

import { like, or, eq } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { suppliers } from '../schema/parties';
import type { DbSupplier, DbSupplierInsert } from '../schema/parties';
import type { DrizzleDb } from '../client';
import type { PaginationParams, PagedResult } from './base.repository';

export interface SupplierFilter extends PaginationParams {
  search?: string; // matches name, code, or city
  city?:   string;
}

export class SupplierRepository extends BaseRepository<
  typeof suppliers,
  DbSupplier,
  DbSupplierInsert
> {
  constructor(db: DrizzleDb) {
    super(db, suppliers);
  }

  // ── Search / filter ────────────────────────────────────────────────────────

  async search(filter: SupplierFilter): Promise<PagedResult<DbSupplier>> {
    const conditions = [];

    if (filter.search) {
      const pattern = `%${filter.search}%`;
      conditions.push(
        or(
          like(suppliers.name, pattern),
          like(suppliers.code, pattern),
          like(suppliers.city, pattern),
        ),
      );
    }

    if (filter.city) {
      conditions.push(eq(suppliers.city, filter.city));
    }

    const where = conditions.length > 0
      ? (conditions.length === 1 ? conditions[0] : conditions.reduce((a, b) => a && b))
      : undefined;

    return this.findPaged(filter, where);
  }

  // ── Find by name (exact, case-insensitive) ─────────────────────────────────

  async findByName(name: string): Promise<DbSupplier | null> {
    const rows = await this.db
      .select()
      .from(suppliers)
      .where(like(suppliers.name, name))
      .limit(1);
    return rows[0] ?? null;
  }

  // ── Find by code ───────────────────────────────────────────────────────────

  async findByCode(code: string): Promise<DbSupplier | null> {
    const rows = await this.db
      .select()
      .from(suppliers)
      .where(eq(suppliers.code, code))
      .limit(1);
    return rows[0] ?? null;
  }

  // ── Balance helpers ────────────────────────────────────────────────────────

  async updateBalance(id: string, newBalance: number): Promise<DbSupplier> {
    return this.update(id, { previousBalance: newBalance });
  }
}
