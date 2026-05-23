/**
 * db/client.ts
 * Drizzle ORM client for Tauri SQLite.
 *
 * In Tauri, SQLite is accessed via the tauri-plugin-sql Rust plugin.
 * The drizzle-orm/sqlite-proxy adapter lets Drizzle talk to it through
 * a custom execute function that calls the Tauri command.
 *
 * In browser/dev mode (no Tauri), the client is null — all DB calls
 * should be guarded with `if (!db)` or fall back to localStorage.
 *
 * NOTE: @tauri-apps/plugin-sql is injected by the Tauri runtime, not
 * installed as an npm package. The dynamic import is guarded by isTauri.
 *
 * Usage:
 *   import { getDb } from '@/db/client';
 *   const db = await getDb();
 *   if (db) {
 *     const rows = await db.select().from(suppliers).all();
 *   }
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";
import { APP_CONFIG } from "@/config";

export type DrizzleDb = ReturnType<typeof drizzle>;

let _db: DrizzleDb | null = null;

/**
 * Initialise and return the Drizzle DB instance.
 * Safe to call multiple times — returns the cached instance after first call.
 */
export async function getDb(): Promise<DrizzleDb | null> {
  if (!APP_CONFIG.isTauri) {
    // Running in browser dev mode — no SQLite available
    return null;
  }

  if (_db) return _db;

  // Dynamically import Tauri SQL plugin (only available in Tauri runtime)
  const Database = (await import("@tauri-apps/plugin-sql" as any)).default as {
    load: (url: string) => Promise<{
      execute: (sql: string, params: unknown[]) => Promise<void>;
      select: (
        sql: string,
        params: unknown[],
      ) => Promise<Record<string, unknown>[]>;
    }>;
  };

  const sqliteDb = await Database.load("sqlite:tfc_erp.db");

  _db = drizzle(
    async (sql, params, method) => {
      try {
        if (method === "run") {
          await sqliteDb.execute(sql, params as unknown[]);
          return { rows: [] };
        }

        const rows = await sqliteDb.select(sql, params as unknown[]);

        // Drizzle's sqlite-proxy expects an array of arrays if method is 'values',
        // otherwise it expects an array of objects for 'all' and 'get'.
        if (method === "values") {
          if (rows.length === 0) return { rows: [] };
          const keys = Object.keys(rows[0]);
          return {
            rows: rows.map((row: any) => keys.map((key) => row[key])),
          };
        }

        return { rows };
      } catch (err) {
        if (import.meta.env.DEV) console.error("[db] Query error:", err);
        throw err;
      }
    },
    { schema },
  );

  return _db;
}
