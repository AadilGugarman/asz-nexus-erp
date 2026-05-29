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
import * as schema from "./schema/index";
import { APP_CONFIG } from "@/config";

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDb | null = null;

/**
 * Initialise and return the Drizzle DB instance.
 * Safe to call multiple times — returns the cached instance after first call.
 *
 * Uses window.__TAURI_INTERNALS__.invoke directly instead of importing
 * @tauri-apps/plugin-sql, because in `npm run tauri dev` Vite aliases that
 * package to a mock shim that returns undefined for every call.
 * __TAURI_INTERNALS__ is injected by the Tauri runtime onto window at startup
 * and always points to the real IPC bridge, bypassing Vite's module system.
 */
export async function getDb(): Promise<DrizzleDb | null> {
  if (!APP_CONFIG.isTauri) {
    // Running in browser dev mode — no SQLite available
    return null;
  }

  if (_db) return _db;

  // Get the real invoke from Tauri's runtime-injected internals.
  // This bypasses the Vite alias that maps @tauri-apps/plugin-sql to tauri-mock.ts.
  const tauriInvoke = (window as any).__TAURI_INTERNALS__?.invoke as
    | ((cmd: string, args?: object) => Promise<any>)
    | undefined;

  if (!tauriInvoke) {
    console.error("[db] __TAURI_INTERNALS__.invoke not available — DB cannot be initialised");
    return null;
  }

  // Load the SQLite database via the Tauri SQL plugin IPC commands directly.
  // plugin:sql|load returns the resolved DB path string — store it for subsequent calls.
  const dbPath: string = await tauriInvoke("plugin:sql|load", { db: "sqlite:asz_nexus_erp.db" });

  _db = drizzle(
    async (sql, params, method) => {
      try {
        if (method === "run") {
          await tauriInvoke("plugin:sql|execute", {
            db: dbPath,
            query: sql,
            values: params as unknown[],
          });
          return { rows: [] };
        }

        const rows: Record<string, unknown>[] = await tauriInvoke("plugin:sql|select", {
          db: dbPath,
          query: sql,
          values: params as unknown[],
        });

        // Drizzle's sqlite-proxy expects an array of arrays if method is 'values',
        // otherwise it expects an array of objects for 'all' and 'get'.
        if (method === "values") {
          if (!rows || rows.length === 0) return { rows: [] };
          const keys = Object.keys(rows[0]);
          return {
            rows: rows.map((row: any) => keys.map((key) => row[key])),
          };
        }

        return { rows: rows ?? [] };
      } catch (err) {
        if (import.meta.env.DEV) console.error("[db] Query error:", err);
        throw err;
      }
    },
    { schema },
  );

  return _db;
}
