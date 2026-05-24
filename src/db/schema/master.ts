/**
 * db/schema/master.ts
 * Master data tables: fruits, varieties.
 */

import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ── Fruits ────────────────────────────────────────────────────────────────────
export const fruits = sqliteTable('fruits', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull(),
  varieties: text('varieties').notNull().default('[]'), // JSON: string[]
  companyId: text('company_id'),
});

// ── Inferred types ────────────────────────────────────────────────────────────
export type DbFruit       = typeof fruits.$inferSelect;
export type DbFruitInsert = typeof fruits.$inferInsert;
