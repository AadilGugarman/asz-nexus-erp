/**
 * db/repositories/supplier.repository.ts
 * All Drizzle queries for the ledgers table filtered by type SUPPLIER.
 */

import { like, or, eq, and, SQL } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import { ledgers, type DbLedger, type DbLedgerInsert } from "../schema/master";
import type { DrizzleDb } from "../client";
import type { PaginationParams, PagedResult } from "./base.repository";

export interface SupplierFilter extends PaginationParams {
  search?: string; // matches name, code, or city
  city?: string;
}

export class SupplierRepository extends BaseRepository<
  typeof ledgers,
  DbLedger,
  DbLedgerInsert
> {
  constructor(db: DrizzleDb) {
    super(db, ledgers);
  }

  async findAll(where?: SQL, companyId?: string): Promise<DbLedger[]> {
    const typeFilter = or(
      eq(ledgers.type, "SUPPLIER"),
      eq(ledgers.type, "BOTH"),
    );
    const combinedWhere = where ? and(where, typeFilter) : typeFilter;
    return super.findAll(combinedWhere, companyId);
  }

  // ── Search / filter ────────────────────────────────────────────────────────

  async search(filter: SupplierFilter): Promise<PagedResult<DbLedger>> {
    const conditions = [
      or(eq(ledgers.type, "SUPPLIER"), eq(ledgers.type, "BOTH")),
    ];

    if (filter.search) {
      const pattern = `%${filter.search}%`;
      conditions.push(
        or(
          like(ledgers.name, pattern),
          like(ledgers.code, pattern),
          like(ledgers.city, pattern),
        )!,
      );
    }

    if (filter.city) {
      conditions.push(eq(ledgers.city, filter.city));
    }

    const where = and(...conditions);

    return this.findPaged(filter, where);
  }

  // ── Find by name (exact, case-insensitive) ─────────────────────────────────

  async findByName(name: string): Promise<DbLedger | null> {
    const rows = await this.db
      .select()
      .from(ledgers)
      .where(
        and(
          like(ledgers.name, name),
          or(eq(ledgers.type, "SUPPLIER"), eq(ledgers.type, "BOTH")),
        ),
      )
      .limit(1);
    return (rows[0] as DbLedger) ?? null;
  }

  // ── Find by code ───────────────────────────────────────────────────────────

  async findByCode(code: string): Promise<DbLedger | null> {
    const rows = await this.db
      .select()
      .from(ledgers)
      .where(
        and(
          eq(ledgers.code, code),
          or(eq(ledgers.type, "SUPPLIER"), eq(ledgers.type, "BOTH")),
        ),
      )
      .limit(1);
    return (rows[0] as DbLedger) ?? null;
  }

  // ── Balance helpers ────────────────────────────────────────────────────────

  async updateBalance(id: string, newBalance: number): Promise<DbLedger> {
    return this.update(id, { openingBalance: newBalance });
  }
}
