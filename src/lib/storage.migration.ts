/**
 * lib/storage.migration.ts
 * Migration utilities for transitioning from `apex_*` to `tfc_erp_*` namespace.
 *
 * Strategy:
 *   1. Detect old keys on app startup
 *   2. Copy values from old keys to new keys
 *   3. Remove old keys after successful migration
 *   4. Mark migration as complete to prevent re-running
 *   5. No data loss — all values preserved
 */

import { STORAGE_KEYS, LEGACY_KEYS } from "./storage.constants";

// ── Migration tracking ────────────────────────────────────────────────────────
const MIGRATION_MARKER_KEY = `${STORAGE_KEYS.appearance}_migration_done_v1`;

/**
 * Detect if migration has already been run in this browser/app instance.
 */
function hasMigrationRun(): boolean {
  try {
    return localStorage.getItem(MIGRATION_MARKER_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Mark migration as complete to prevent re-running on every app restart.
 */
function markMigrationComplete(): void {
  try {
    localStorage.setItem(MIGRATION_MARKER_KEY, "true");
  } catch {
    // silent fail
  }
}

/**
 * Safely retrieve a value from localStorage.
 */
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safely store a value in localStorage.
 */
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely remove a key from localStorage.
 */
function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Migrate a single key-value pair from old namespace to new namespace.
 * Returns success status.
 */
function migrateKey(legacyKey: string, newKey: string): boolean {
  const value = safeGetItem(legacyKey);
  if (value === null) {
    // Key doesn't exist — nothing to migrate
    return true;
  }

  // New key already exists — preserve existing value (don't overwrite)
  const existingNew = safeGetItem(newKey);
  if (existingNew !== null) {
    console.debug(
      `[Storage] New key already exists: ${newKey}. Preserving existing value.`,
    );
    safeRemoveItem(legacyKey);
    return true;
  }

  // Migrate value to new key
  const setSuccess = safeSetItem(newKey, value);
  if (!setSuccess) {
    console.warn(`[Storage] Failed to set new key: ${newKey}`);
    return false;
  }

  // Remove old key after successful migration
  safeRemoveItem(legacyKey);
  console.debug(`[Storage] Migrated ${legacyKey} → ${newKey}`);
  return true;
}

/**
 * Run full migration from apex_* to tfc_erp_* namespace.
 *
 * Called on app startup (before any component reads from localStorage).
 * Safe to call multiple times — uses marker to prevent re-running.
 *
 * Returns statistics for logging/debugging.
 */
export interface MigrationStats {
  alreadyRun: boolean;
  keysMigrated: number;
  keysFailed: number;
  legacyKeysRemaining: string[];
  timestamp: string;
}

export function runStorageMigration(): MigrationStats {
  const stats: MigrationStats = {
    alreadyRun: false,
    keysMigrated: 0,
    keysFailed: 0,
    legacyKeysRemaining: [],
    timestamp: new Date().toISOString(),
  };

  // Skip if already run
  if (hasMigrationRun()) {
    stats.alreadyRun = true;
    return stats;
  }

  try {
    // Map legacy keys to new keys and migrate each
    const keyPairs = Object.entries(LEGACY_KEYS) as Array<[string, string]>;

    const sensitiveLegacyKeys = new Set([
      "lockState",
      "refreshToken",
      "refreshTokenExpiry",
    ]);

    for (const [_legacyName, legacyKey] of keyPairs) {
      if (sensitiveLegacyKeys.has(_legacyName)) {
        safeRemoveItem(legacyKey);
        continue;
      }

      // Find corresponding new key
      const newKeyEntry = Object.entries(STORAGE_KEYS).find(
        ([newName]) => newName === _legacyName,
      );

      if (!newKeyEntry) {
        // No mapping exists for this legacy key — skip it
        console.debug(
          `[Storage] No mapping found for legacy key: ${legacyKey}`,
        );
        continue;
      }

      const newKey = newKeyEntry[1];
      const success = migrateKey(legacyKey, newKey);

      if (success) {
        stats.keysMigrated++;
      } else {
        stats.keysFailed++;
      }
    }

    // Clean up any remaining legacy keys that weren't mapped
    if (typeof window !== "undefined" && window.localStorage) {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key?.startsWith("apex_")) {
          stats.legacyKeysRemaining.push(key);
          // Remove unmapped legacy keys — they are no longer needed
          safeRemoveItem(key);
        }
      }
    }

    // Mark migration as complete
    markMigrationComplete();

    console.info(
      `[Storage] Migration complete. Migrated: ${stats.keysMigrated}, Failed: ${stats.keysFailed}, Remaining: ${stats.legacyKeysRemaining.length}`,
    );
  } catch (err) {
    console.error("[Storage] Migration error:", err);
  }

  return stats;
}

/**
 * Force re-run migration (for testing/debugging).
 * ⚠️ Only call this in development.
 */
export function resetMigrationMarker(): void {
  try {
    localStorage.removeItem(MIGRATION_MARKER_KEY);
    console.info(
      "[Storage] Migration marker reset. Will re-run on next startup.",
    );
  } catch {
    // silent fail
  }
}

/**
 * Cleanup: Remove all old apex_* keys (run after confirming migration success).
 * ⚠️ Only call this in development/admin context.
 */
export function cleanupLegacyKeys(): number {
  let removed = 0;

  try {
    if (typeof window === "undefined" || !window.localStorage) return 0;

    const keysToRemove = [];

    // Collect all apex_* keys
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith("apex_")) {
        keysToRemove.push(key);
      }
    }

    // Remove them
    for (const key of keysToRemove) {
      if (safeRemoveItem(key)) {
        removed++;
      }
    }

    console.info(`[Storage] Removed ${removed} legacy keys`);
  } catch (err) {
    console.error("[Storage] Cleanup error:", err);
  }

  return removed;
}

/**
 * Purge any business data that was previously written to localStorage.
 * In production (Tauri), business data lives exclusively in SQLite.
 * This is a one-time cleanup that runs on every startup — it's idempotent
 * and fast (just removes keys that don't exist in production anyway).
 */
export function purgeBusinessDataFromLocalStorage(): void {
  const businessDataKeys = [
    "tfc_erp_fruits",
    "tfc_erp_suppliers",
    "tfc_erp_customers",
    "tfc_erp_vehicles",
    "tfc_erp_invoices",
    "tfc_erp_purchase_invoices",
    "tfc_erp_payments",
    // Legacy apex_* equivalents
    "apex_fruits",
    "apex_suppliers",
    "apex_customers",
    "apex_vehicles",
    "apex_invoices",
    "apex_purchase_invoices",
    "apex_payments",
  ];

  let removed = 0;
  for (const key of businessDataKeys) {
    try {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        removed++;
      }
    } catch {
      // silent fail
    }
  }

  if (removed > 0 && import.meta.env.DEV) {
    console.info(
      `[Storage] Purged ${removed} business data keys from localStorage. ` +
      "Business data is now exclusively in SQLite.",
    );
  }
}

/**
 * Debug helper: Log all storage keys in both namespaces.
 */
export function logStorageState(): void {
  if (typeof window === "undefined" || !window.localStorage) return;

  console.group("[Storage] Current state");

  const newKeys = [];
  const legacyKeys = [];
  const otherKeys = [];

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key) continue;

    if (key.startsWith("tfc_erp_")) newKeys.push(key);
    else if (key.startsWith("apex_")) legacyKeys.push(key);
    else otherKeys.push(key);
  }

  console.log("New namespace (tfc_erp_):", newKeys);
  console.log("Legacy namespace (apex_):", legacyKeys);
  console.log("Other keys:", otherKeys);

  console.groupEnd();
}
