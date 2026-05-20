/**
 * db/schema/settings.ts
 * App settings — key/value store for company profile, invoice config, etc.
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ── App Settings ──────────────────────────────────────────────────────────────
export const appSettings = sqliteTable('app_settings', {
  id:    integer('id').primaryKey({ autoIncrement: true }),
  key:   text('key').notNull().unique(),
  value: text('value').notNull(), // JSON blob
});

// ── Inferred types ────────────────────────────────────────────────────────────
export type DbAppSetting       = typeof appSettings.$inferSelect;
export type DbAppSettingInsert = typeof appSettings.$inferInsert;
