/**
 * db/repositories/company.repository.ts
 */

import { BaseRepository } from './base.repository';
import { companies, financialYears } from '../schema/core';
import { eq } from 'drizzle-orm';
import type { DrizzleDb } from '../client';

export type DbCompany = typeof companies.$inferSelect;
export type DbCompanyInsert = typeof companies.$inferInsert;
export type DbFinancialYear = typeof financialYears.$inferSelect;
export type DbFinancialYearInsert = typeof financialYears.$inferInsert;

export class CompanyRepository extends BaseRepository<
  typeof companies,
  DbCompany,
  DbCompanyInsert
> {
  constructor(db: DrizzleDb) {
    super(db, companies);
  }

  async getFinancialYears(companyId: string): Promise<DbFinancialYear[]> {
    return this.db
      .select()
      .from(financialYears)
      .where(eq(financialYears.companyId, companyId));
  }

  async addFinancialYear(insert: DbFinancialYearInsert): Promise<DbFinancialYear> {
    const [row] = await this.db
      .insert(financialYears)
      .values(insert)
      .returning();
    return row as DbFinancialYear;
  }
}
