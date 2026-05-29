/**
 * db/repositories/accountGroup.repository.ts
 * Manages account_groups rows — used to seed default groups per company
 * so that ledger (party) inserts satisfy the group_id foreign key.
 */

import { eq, and } from "drizzle-orm";
import { accountGroups, type DbLedger } from "../schema/master";
import { companies } from "../schema/core";
import type { DrizzleDb } from "../client";

export interface DefaultGroup {
  slug: string; // stable slug used as the scoped id suffix
  name: string;
  nature: string; // Asset | Liability | Income | Expense
}

export const DEFAULT_GROUPS: DefaultGroup[] = [
  { slug: "sundry-debtors", name: "Sundry Debtors", nature: "Asset" },
  { slug: "sundry-creditors", name: "Sundry Creditors", nature: "Liability" },
  { slug: "direct-expenses", name: "Direct Expenses", nature: "Expense" },
  { slug: "direct-income", name: "Direct Income", nature: "Income" },
  { slug: "indirect-expenses", name: "Indirect Expenses", nature: "Expense" },
  { slug: "indirect-income", name: "Indirect Income", nature: "Income" },
  { slug: "cash-in-hand", name: "Cash in Hand", nature: "Asset" },
  { slug: "bank-accounts", name: "Bank Accounts", nature: "Asset" },
];

/**
 * Returns the scoped group ID for a given company + slug.
 * e.g. scopedGroupId("co-123", "sundry-debtors") → "co-123__sundry-debtors"
 */
export function scopedGroupId(companyId: string, slug: string): string {
  return `${companyId}__${slug}`;
}

export class AccountGroupRepository {
  constructor(private readonly db: DrizzleDb) {}

  /**
   * Ensure all default account groups exist for the given company.
   * Uses INSERT OR IGNORE semantics — safe to call on every party save.
   * Only hits the DB if a group is actually missing.
   */
  async ensureDefaultGroups(companyId: string): Promise<void> {
    if (!this.db) return;
    // Ensure the company exists in `companies` table so FK constraints on
    // `account_groups.company_id` do not fail. If missing, insert a minimal
    // company row (name is required by schema).
    const existingCompany = await (this.db as any)
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    if (!existingCompany || existingCompany.length === 0) {
      try {
        await (this.db as any).insert(companies).values({
          id: companyId,
          name: `Company ${companyId}`,
        });
      } catch (e) {
        // If insertion fails, continue — subsequent group inserts will still
        // either succeed (if company was concurrently created) or fail with
        // the original FK error which will surface to the caller.
        console.warn(
          "AccountGroupRepository: could not create company row:",
          e,
        );
      }
    }

    for (const group of DEFAULT_GROUPS) {
      const id = scopedGroupId(companyId, group.slug);

      // Check if already exists
      const existing = await (this.db as any)
        .select({ id: accountGroups.id })
        .from(accountGroups)
        .where(eq(accountGroups.id, id))
        .limit(1);

      if (existing.length === 0) {
        await (this.db as any).insert(accountGroups).values({
          id,
          companyId,
          name: group.name,
          nature: group.nature,
        });
      }
    }
  }
}
