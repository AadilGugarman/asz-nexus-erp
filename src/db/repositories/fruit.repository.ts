/**
 * db/repositories/fruit.repository.ts
 * All Drizzle queries for the fruits and varieties tables.
 */

import { like, eq } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import { fruits, varieties } from "../schema/master";
import type { DrizzleDb } from "../client";
import type { PaginationParams, PagedResult } from "./base.repository";

export type DbFruit = typeof fruits.$inferSelect;
export type DbFruitInsert = typeof fruits.$inferInsert;
export type DbVariety = typeof varieties.$inferSelect;
export type DbVarietyInsert = typeof varieties.$inferInsert;

export interface FruitFilter extends PaginationParams {
  search?: string; // matches name
}

export class FruitRepository extends BaseRepository<
  typeof fruits,
  DbFruit,
  DbFruitInsert
> {
  constructor(db: DrizzleDb) {
    super(db, fruits);
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  async search(filter: FruitFilter): Promise<PagedResult<DbFruit>> {
    const where = filter.search
      ? like(fruits.name, `%${filter.search}%`)
      : undefined;

    return this.findPaged(filter, where);
  }

  // ── Find by name ────────────────────────────────────────────────────────────

  async findByName(name: string): Promise<DbFruit | null> {
    const rows = await this.db
      .select()
      .from(fruits)
      .where(like(fruits.name, name))
      .limit(1);
    return (rows[0] as DbFruit) ?? null;
  }

  // ── Varieties ───────────────────────────────────────────────────────────────

  async getVarieties(fruitId: string): Promise<DbVariety[]> {
    return this.db
      .select()
      .from(varieties)
      .where(eq(varieties.fruitId, fruitId));
  }

  async addVariety(insert: DbVarietyInsert): Promise<DbVariety> {
    const [row] = await this.db
      .insert(varieties)
      .values(insert)
      .returning();
    return row as DbVariety;
  }
}
