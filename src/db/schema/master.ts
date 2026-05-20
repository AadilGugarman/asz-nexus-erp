/**
 * db/schema/master.ts
 * Master data tables: fruits, varieties.
 * These are the reference/lookup tables used across all modules.
 */

import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ── Fruits ────────────────────────────────────────────────────────────────────
export const fruits = sqliteTable('fruits', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull(),
  varieties: text('varieties').notNull().default('[]'), // JSON: string[]
});

// ── Inferred types ────────────────────────────────────────────────────────────
export type DbFruit       = typeof fruits.$inferSelect;
export type DbFruitInsert = typeof fruits.$inferInsert;
