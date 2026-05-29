/**
 * db/repositories/financialYear.repository.ts
 *
 * Provides helpers to ensure a company row and a financial_year row exist
 * before any FK-constrained insert (invoices, payments, caret_transactions).
 *
 * Both helpers use INSERT OR IGNORE semantics so they are safe to call on
 * every save — they only hit the DB when the row is actually missing.
 * Results are cached in a Map to avoid repeated round-trips per session.
 */

import { eq, and } from "drizzle-orm";
import { companies, financialYears } from "../schema/core";
import type { DrizzleDb } from "../client";

export class FinancialYearRepository {
  /** Cache: `${companyId}__${fyName}` → financialYearId */
  private readonly _cache = new Map<string, string>();

  constructor(private readonly db: DrizzleDb) {}

  // ── ensureCompany ──────────────────────────────────────────────────────────

  /**
   * Inserts a minimal companies row if one does not already exist.
   * Uses INSERT OR IGNORE so concurrent calls are safe.
   */
  async ensureCompany(companyId: string, companyName: string): Promise<void> {
    if (!this.db) return;

    const existing = await (this.db as any)
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (existing.length === 0) {
      await (this.db as any)
        .insert(companies)
        .values({
          id: companyId,
          name: companyName || companyId,
        })
        .onConflictDoNothing();
    }
  }

  // ── ensureFinancialYear ────────────────────────────────────────────────────

  /**
   * Looks up or creates a financial_year row for the given company + FY name.
   * Returns the financial year's ID.
   *
   * @param companyId   - The active company ID (e.g. "co-1234")
   * @param fyName      - FY string like "2024-25"
   * @param companyName - Used only when the company row itself needs creating
   */
  async ensureFinancialYear(
    companyId: string,
    fyName: string,
    companyName = companyId,
  ): Promise<string> {
    const cacheKey = `${companyId}__${fyName}`;
    const cached = this._cache.get(cacheKey);
    if (cached) return cached;

    if (!this.db) {
      // Fallback ID when DB is unavailable (browser dev mode)
      const fallback = cacheKey;
      this._cache.set(cacheKey, fallback);
      return fallback;
    }

    // Ensure the parent company row exists first (FK constraint)
    await this.ensureCompany(companyId, companyName);

    // Check if the FY row already exists
    const existing = await (this.db as any)
      .select({ id: financialYears.id })
      .from(financialYears)
      .where(
        and(
          eq(financialYears.companyId, companyId),
          eq(financialYears.name, fyName),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const id: string = existing[0].id;
      this._cache.set(cacheKey, id);
      return id;
    }

    // Parse "2024-25" → startDate = 2024-04-01, endDate = 2025-03-31
    const { startDate, endDate } = this._parseFyDates(fyName);

    // Stable deterministic ID so concurrent inserts don't create duplicates
    const fyId = `${companyId}__fy__${fyName}`;

    await (this.db as any)
      .insert(financialYears)
      .values({
        id: fyId,
        companyId,
        name: fyName,
        startDate,
        endDate,
        isClosed: false,
      })
      .onConflictDoNothing();

    // Re-fetch in case another concurrent call already inserted a different ID
    const row = await (this.db as any)
      .select({ id: financialYears.id })
      .from(financialYears)
      .where(
        and(
          eq(financialYears.companyId, companyId),
          eq(financialYears.name, fyName),
        ),
      )
      .limit(1);

    const resolvedId: string = row[0]?.id ?? fyId;
    this._cache.set(cacheKey, resolvedId);
    return resolvedId;
  }

  // ── _parseFyDates ──────────────────────────────────────────────────────────

  /**
   * Parses a FY name like "2024-25" into start/end Date objects.
   * Assumes Indian FY: April 1 → March 31.
   * Falls back gracefully for unexpected formats.
   */
  private _parseFyDates(fyName: string): { startDate: Date; endDate: Date } {
    // Expected format: "YYYY-YY" e.g. "2024-25"
    const parts = fyName.split("-");
    const startYear = parseInt(parts[0], 10);

    if (!isNaN(startYear)) {
      const endYear = startYear + 1;
      return {
        startDate: new Date(startYear, 3, 1),   // April 1 of start year
        endDate: new Date(endYear, 2, 31),       // March 31 of end year
      };
    }

    // Fallback: current calendar year
    const now = new Date();
    return {
      startDate: new Date(now.getFullYear(), 3, 1),
      endDate: new Date(now.getFullYear() + 1, 2, 31),
    };
  }
}
