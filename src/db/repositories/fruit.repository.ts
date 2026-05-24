/**
 * db/repositories/fruit.repository.ts
 * All Drizzle queries for the fruits table.
 *
 * Fruits represent product types (e.g., Mango, Banana).
 * Each fruit can have multiple varieties.
 *
 * Usage:
 *   const repo = new FruitRepository(db);
 *   const all = await repo.findAll();
 */

import { like } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import { fruits } from "../schema";
import type { DrizzleDb } from "../client";
import type { PaginationParams, PagedResult } from "./base.repository";

export interface DbFruit {
  id: string;
  name: string;
  varieties: string; // JSON array stringified
}

export interface DbFruitInsert {
  id?: string;
  name: string;
  varieties?: string;
  companyId?: string | null; // maps to company_id column
}

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
    return rows[0] ?? null;
  }

  // ── Get varieties ───────────────────────────────────────────────────────────

  async getVarieties(fruitId: string): Promise<string[]> {
    const fruit = await this.findById(fruitId);
    if (!fruit) return [];

    try {
      return JSON.parse(fruit.varieties) as string[];
    } catch {
      return [];
    }
  }

  // ── Add variety ─────────────────────────────────────────────────────────────

  async addVariety(
    fruitId: string,
    varietyName: string,
  ): Promise<DbFruit | null> {
    const fruit = await this.findById(fruitId);
    if (!fruit) return null;

    try {
      const varieties = JSON.parse(fruit.varieties) as string[];
      if (!varieties.includes(varietyName)) {
        varieties.push(varietyName);
        return await this.update(fruitId, {
          varieties: JSON.stringify(varieties),
        });
      }
      return fruit;
    } catch {
      return null;
    }
  }
}
