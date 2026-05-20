/**
 * db/repositories/customer.repository.ts
 * All Drizzle queries for the customers table.
 */

import { like, or, eq } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { customers } from '../schema/parties';
import type { DbCustomer, DbCustomerInsert } from '../schema/parties';
import type { DrizzleDb } from '../client';
import type { PaginationParams, PagedResult } from './base.repository';

export interface CustomerFilter extends PaginationParams {
  search?: string; // matches name, phone, or city
  city?:   string;
}

export class CustomerRepository extends BaseRepository<
  typeof customers,
  DbCustomer,
  DbCustomerInsert
> {
  constructor(db: DrizzleDb) {
    super(db, customers);
  }

  async search(filter: CustomerFilter): Promise<PagedResult<DbCustomer>> {
    const conditions = [];

    if (filter.search) {
      const pattern = `%${filter.search}%`;
      conditions.push(
        or(
          like(customers.name,  pattern),
          like(customers.phone, pattern),
          like(customers.city,  pattern),
        ),
      );
    }

    if (filter.city) {
      conditions.push(eq(customers.city, filter.city));
    }

    const where = conditions.length > 0
      ? (conditions.length === 1 ? conditions[0] : conditions.reduce((a, b) => a && b))
      : undefined;

    return this.findPaged(filter, where);
  }

  async updateBalance(id: string, newBalance: number): Promise<DbCustomer> {
    return this.update(id, { previousBalance: newBalance });
  }
}
