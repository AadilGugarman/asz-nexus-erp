/**
 * drizzle.config.ts
 * Used by drizzle-kit for migration generation.
 * Run: npm run db:generate
 *
 * NOTE: This config targets a local SQLite file for tooling purposes.
 * At runtime, the Tauri plugin manages the actual DB file location.
 */

import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // Point at the schema folder — drizzle-kit picks up all *.ts files inside
  schema: './src/db/schema',
  out: './src/db/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: './dev.db', // local dev SQLite file (not committed)
  },
  verbose: true,
  strict: true,
});
