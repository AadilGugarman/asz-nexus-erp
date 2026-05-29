/**
 * db/repositories/customer.repository.ts
 * All Drizzle queries for the ledgers table filtered by type CUSTOMER.
 */

import { like, or, eq, and, SQL } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import { ledgers, type DbLedger, type DbLedgerInsert } from "../schema/master";
import type { DrizzleDb } from "../client";
import type { PaginationParams, PagedResult } from "./base.repository";

export interface CustomerFilter extends PaginationParams {
  search?: string; // matches name, phone, or city
  city?: string;
}

export class CustomerRepository extends BaseRepository<
  typeof ledgers,
  DbLedger,
  DbLedgerInsert
> {
  constructor(db: DrizzleDb) {
    super(db, ledgers);
  }

  async findAll(where?: SQL, companyId?: string): Promise<DbLedger[]> {
    const typeFilter = or(
      eq(ledgers.type, "CUSTOMER"),
      eq(ledgers.type, "BOTH"),
    );
    const combinedWhere = where ? and(where, typeFilter) : typeFilter;
    return super.findAll(combinedWhere, companyId);
  }

  async search(filter: CustomerFilter): Promise<PagedResult<DbLedger>> {
    const conditions = [
      or(eq(ledgers.type, "CUSTOMER"), eq(ledgers.type, "BOTH")),
    ];

    if (filter.search) {
      const pattern = `%${filter.search}%`;
      conditions.push(
        or(
          like(ledgers.name, pattern),
          like(ledgers.phone, pattern),
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

  async updateBalance(id: string, newBalance: number): Promise<DbLedger> {
    return this.update(id, { openingBalance: newBalance });
  }
}
