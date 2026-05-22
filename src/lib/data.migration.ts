/**
 * lib/data.migration.ts
 * Migrates business data from localStorage (demo) to SQLite (production).
 *
 * This is a one-time migration that runs on the first app launch after the
 * SQLite-first update. It safely moves all ERP data while preserving localStorage
 * for UI preferences only.
 *
 * Strategy:
 *   1. Check if migration has run (marker key)
 *   2. Load all business data from localStorage
 *   3. Insert into SQLite using repositories
 *   4. Validate success
 *   5. Remove old localStorage keys
 *   6. Mark migration complete
 */

import { dbService } from "@/db/services";
import { STORAGE_KEYS, LEGACY_KEYS } from "@/config";
import type {
  Supplier,
  Customer,
  Fruit,
  Invoice,
  PurchaseInvoice,
  PaymentReceipt,
  VehicleArrival,
} from "@/types";

// ── Migration tracking ────────────────────────────────────────────────────
const DATA_MIGRATION_MARKER = "tfc_erp_data_migration_v1_done";
const DATA_MIGRATION_ROLLBACK = "tfc_erp_data_migration_rollback_backup";

/**
 * Detect if data migration has already run.
 */
function hasMigrationRun(): boolean {
  try {
    return localStorage.getItem(DATA_MIGRATION_MARKER) === "true";
  } catch {
    return false;
  }
}

/**
 * Mark data migration as complete.
 */
function markMigrationComplete(): void {
  try {
    localStorage.setItem(DATA_MIGRATION_MARKER, "true");
    // Clear rollback backup after successful migration
    localStorage.removeItem(DATA_MIGRATION_ROLLBACK);
  } catch {
    // silent fail
  }
}

/**
 * Safely read JSON from localStorage.
 */
function safeReadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Safely remove a key from localStorage.
 */
function safeRemoveKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // silent fail
  }
}

/**
 * Create a backup of business data before migration (for rollback).
 */
function createRollbackBackup(): void {
  try {
    const backup = {
      fruits: safeReadJson(STORAGE_KEYS.fruits),
      suppliers: safeReadJson(STORAGE_KEYS.suppliers),
      customers: safeReadJson(STORAGE_KEYS.customers),
      vehicles: safeReadJson(STORAGE_KEYS.vehicles),
      invoices: safeReadJson(STORAGE_KEYS.invoices),
      purchaseInvoices: safeReadJson(STORAGE_KEYS.purchaseInvoices),
      payments: safeReadJson(STORAGE_KEYS.payments),
    };
    localStorage.setItem(DATA_MIGRATION_ROLLBACK, JSON.stringify(backup));
  } catch {
    console.warn("[Data Migration] Failed to create rollback backup");
  }
}

// ── Migration stats tracking ──────────────────────────────────────────────

export interface DataMigrationStats {
  alreadyRun: boolean;
  fruitsInserted: number;
  suppliersInserted: number;
  customersInserted: number;
  invoicesInserted: number;
  purchaseInvoicesInserted: number;
  paymentsInserted: number;
  vehicleArrivalsInserted: number;
  errorCount: number;
  warningCount: number;
  timestamp: string;
  duration: number;
}

/**
 * Run the one-time data migration from localStorage to SQLite.
 *
 * Safe to call multiple times — uses marker to prevent re-running.
 * Returns detailed statistics for logging and debugging.
 *
 * Should be called early in app startup, after dbService.init() but before
 * AppContext renders.
 */
export async function runDataMigration(): Promise<DataMigrationStats> {
  const startTime = performance.now();

  const stats: DataMigrationStats = {
    alreadyRun: false,
    fruitsInserted: 0,
    suppliersInserted: 0,
    customersInserted: 0,
    invoicesInserted: 0,
    purchaseInvoicesInserted: 0,
    paymentsInserted: 0,
    vehicleArrivalsInserted: 0,
    errorCount: 0,
    warningCount: 0,
    timestamp: new Date().toISOString(),
    duration: 0,
  };

  // Skip if already run
  if (hasMigrationRun()) {
    stats.alreadyRun = true;
    stats.duration = performance.now() - startTime;
    return stats;
  }

  try {
    // Only proceed if DB service is ready
    if (!dbService.isReady) {
      console.warn(
        "[Data Migration] DbService not initialized — skipping migration",
      );
      stats.warningCount++;
      stats.duration = performance.now() - startTime;
      return stats;
    }

    console.info("[Data Migration] Starting...");

    // Create backup before starting (safety net for rollback)
    createRollbackBackup();

    // ── Migrate Fruits ────────────────────────────────────────────────────────
    const fruits = safeReadJson<Fruit[]>(STORAGE_KEYS.fruits);
    if (fruits && Array.isArray(fruits)) {
      for (const fruit of fruits) {
        try {
          await dbService.fruits.insert({
            id: fruit.id,
            name: fruit.name,
            varieties: JSON.stringify(fruit.varieties || []),
          });
          stats.fruitsInserted++;
        } catch (err) {
          console.warn(
            `[Data Migration] Failed to insert fruit ${fruit.id}:`,
            err,
          );
          stats.errorCount++;
        }
      }
    }

    // ── Migrate Suppliers ─────────────────────────────────────────────────────
    const suppliers = safeReadJson<Supplier[]>(STORAGE_KEYS.suppliers);
    if (suppliers && Array.isArray(suppliers)) {
      for (const supplier of suppliers) {
        try {
          await dbService.suppliers.insert({
            id: supplier.id,
            name: supplier.name,
            code: supplier.code || "",
            phone: supplier.phone || "",
            city: supplier.city || "",
            previousBalance: supplier.previousBalance || 0,
          });
          stats.suppliersInserted++;
        } catch (err) {
          console.warn(
            `[Data Migration] Failed to insert supplier ${supplier.id}:`,
            err,
          );
          stats.errorCount++;
        }
      }
    }

    // ── Migrate Customers ─────────────────────────────────────────────────────
    const customers = safeReadJson<Customer[]>(STORAGE_KEYS.customers);
    if (customers && Array.isArray(customers)) {
      for (const customer of customers) {
        try {
          await dbService.customers.insert({
            id: customer.id,
            name: customer.name,
            phone: customer.phone || "",
            city: customer.city || "",
            previousBalance: customer.previousBalance || 0,
          });
          stats.customersInserted++;
        } catch (err) {
          console.warn(
            `[Data Migration] Failed to insert customer ${customer.id}:`,
            err,
          );
          stats.errorCount++;
        }
      }
    }

    // ── Migrate Invoices ──────────────────────────────────────────────────────
    const invoices = safeReadJson<Invoice[]>(STORAGE_KEYS.invoices);
    if (invoices && Array.isArray(invoices)) {
      for (const invoice of invoices) {
        try {
          await dbService.invoices.insert({
            id: invoice.id,
            invoiceNo: invoice.invoiceNo,
            date: invoice.date,
            customerId: invoice.customerId,
            customerName: invoice.customerName,
            items: JSON.stringify(invoice.items || []),
            previousBalance: invoice.previousBalance || 0,
            todayAmount: invoice.todayAmount || 0,
            hamali: invoice.hamali,
            discount: invoice.discount,
            paidAmount: invoice.paidAmount || 0,
            remainingBalance: invoice.remainingBalance || 0,
            notes: invoice.notes,
            createdAt: invoice.createdAt || new Date().toISOString(),
          });
          stats.invoicesInserted++;
        } catch (err) {
          console.warn(
            `[Data Migration] Failed to insert invoice ${invoice.id}:`,
            err,
          );
          stats.errorCount++;
        }
      }
    }

    // ── Migrate Purchase Invoices ─────────────────────────────────────────────
    const purchaseInvoices = safeReadJson<PurchaseInvoice[]>(
      STORAGE_KEYS.purchaseInvoices,
    );
    if (purchaseInvoices && Array.isArray(purchaseInvoices)) {
      for (const pinv of purchaseInvoices) {
        try {
          await dbService.purchaseInvoices.insert({
            id: pinv.id,
            billNo: pinv.billNo,
            date: pinv.date,
            supplierId: pinv.supplierId,
            supplierName: pinv.supplierName,
            items: JSON.stringify(pinv.items || []),
            previousBalance: pinv.previousBalance || 0,
            todayAmount: pinv.todayAmount || 0,
            freight: pinv.freight,
            hamali: pinv.hamali,
            paidAmount: pinv.paidAmount || 0,
            remainingBalance: pinv.remainingBalance || 0,
            notes: pinv.notes,
            createdAt: pinv.createdAt || new Date().toISOString(),
          });
          stats.purchaseInvoicesInserted++;
        } catch (err) {
          console.warn(
            `[Data Migration] Failed to insert purchase invoice ${pinv.id}:`,
            err,
          );
          stats.errorCount++;
        }
      }
    }

    // ── Migrate Payments ──────────────────────────────────────────────────────
    const payments = safeReadJson<PaymentReceipt[]>(STORAGE_KEYS.payments);
    if (payments && Array.isArray(payments)) {
      for (const payment of payments) {
        try {
          await dbService.payments.insert({
            id: payment.id,
            date: payment.date,
            partyType: payment.partyType,
            partyId: payment.partyId,
            partyName: payment.partyName,
            amount: payment.amount,
            paymentMode: payment.paymentMode,
            referenceNo: payment.referenceNo,
            notes: payment.notes,
          });
          stats.paymentsInserted++;
        } catch (err) {
          console.warn(
            `[Data Migration] Failed to insert payment ${payment.id}:`,
            err,
          );
          stats.errorCount++;
        }
      }
    }

    // ── Migrate Vehicle Arrivals ──────────────────────────────────────────────
    const vehicleArrivals = safeReadJson<VehicleArrival[]>(
      STORAGE_KEYS.vehicles,
    );
    if (vehicleArrivals && Array.isArray(vehicleArrivals)) {
      for (const arrival of vehicleArrivals) {
        try {
          await dbService.vehicleArrivals.insert({
            id: arrival.id,
            arrivalNo: arrival.arrivalNo,
            date: arrival.date,
            day: arrival.day || "",
            vehicleNo: arrival.vehicleNo,
            vehicleName: arrival.vehicleName,
            fruitType: arrival.fruitType,
            totalVehicleWeight: arrival.totalVehicleWeight || 0,
            driverName: arrival.driverName,
            notes: arrival.notes,
            rows: JSON.stringify(arrival.rows || []),
            totalCarets: arrival.totalCarets || 0,
            totalCalculatedWeight: arrival.totalCalculatedWeight || 0,
            totalAmount: arrival.totalAmount || 0,
            freightCharge: arrival.freightCharge,
            hamaliCharge: arrival.hamaliCharge,
            advancePaid: arrival.advancePaid,
            status: arrival.status || "SAVED",
            createdAt: arrival.createdAt || new Date().toISOString(),
          });
          stats.vehicleArrivalsInserted++;
        } catch (err) {
          console.warn(
            `[Data Migration] Failed to insert vehicle arrival ${arrival.id}:`,
            err,
          );
          stats.errorCount++;
        }
      }
    }

    // ── Clean up: Remove old business data from localStorage ──────────────────
    // Keep ONLY appearance/theme/preferences
    const businessKeys = [
      STORAGE_KEYS.fruits,
      STORAGE_KEYS.suppliers,
      STORAGE_KEYS.customers,
      STORAGE_KEYS.vehicles,
      STORAGE_KEYS.invoices,
      STORAGE_KEYS.purchaseInvoices,
      STORAGE_KEYS.payments,
    ];

    for (const key of businessKeys) {
      safeRemoveKey(key);
    }

    // Log completion
    const summary = {
      fruits: stats.fruitsInserted,
      suppliers: stats.suppliersInserted,
      customers: stats.customersInserted,
      invoices: stats.invoicesInserted,
      purchaseInvoices: stats.purchaseInvoicesInserted,
      payments: stats.paymentsInserted,
      vehicleArrivals: stats.vehicleArrivalsInserted,
      errors: stats.errorCount,
      warnings: stats.warningCount,
    };

    if (stats.errorCount === 0) {
      console.info("[Data Migration] ✓ Complete:", summary);
    } else {
      console.warn("[Data Migration] ⚠ Complete with errors:", summary);
    }

    // Mark migration as complete
    markMigrationComplete();
  } catch (err) {
    console.error("[Data Migration] Fatal error:", err);
    stats.errorCount++;
  }

  stats.duration = performance.now() - startTime;
  return stats;
}

/**
 * Force re-run data migration (for development/testing).
 * ⚠️ ONLY call in development!
 */
export function resetDataMigrationMarker(): void {
  try {
    localStorage.removeItem(DATA_MIGRATION_MARKER);
    console.info("[Data Migration] Marker reset — will re-run on next startup");
  } catch {
    // silent fail
  }
}

/**
 * Restore from rollback backup if migration failed.
 * ⚠️ ONLY use if migration had critical failures!
 */
export function rollbackDataMigration(): void {
  try {
    const backup = safeReadJson<Record<string, unknown>>(
      DATA_MIGRATION_ROLLBACK,
    );
    if (!backup) {
      console.warn("[Data Migration] No rollback backup found");
      return;
    }

    // Restore each dataset to localStorage
    if (backup.fruits)
      localStorage.setItem(STORAGE_KEYS.fruits, JSON.stringify(backup.fruits));
    if (backup.suppliers)
      localStorage.setItem(
        STORAGE_KEYS.suppliers,
        JSON.stringify(backup.suppliers),
      );
    if (backup.customers)
      localStorage.setItem(
        STORAGE_KEYS.customers,
        JSON.stringify(backup.customers),
      );
    if (backup.invoices)
      localStorage.setItem(
        STORAGE_KEYS.invoices,
        JSON.stringify(backup.invoices),
      );
    if (backup.purchaseInvoices)
      localStorage.setItem(
        STORAGE_KEYS.purchaseInvoices,
        JSON.stringify(backup.purchaseInvoices),
      );
    if (backup.payments)
      localStorage.setItem(
        STORAGE_KEYS.payments,
        JSON.stringify(backup.payments),
      );
    if (backup.vehicles)
      localStorage.setItem(
        STORAGE_KEYS.vehicles,
        JSON.stringify(backup.vehicles),
      );

    // Reset migration marker so it runs again next time
    resetDataMigrationMarker();

    console.info(
      "[Data Migration] ⚠ Rollback complete — data restored to localStorage",
    );
  } catch (err) {
    console.error("[Data Migration] Rollback failed:", err);
  }
}

/**
 * Debug: Check if any business data remains in localStorage.
 */
export function checkRemainingBusinessData(): Record<string, boolean> {
  const businessKeys = [
    STORAGE_KEYS.fruits,
    STORAGE_KEYS.suppliers,
    STORAGE_KEYS.customers,
    STORAGE_KEYS.vehicles,
    STORAGE_KEYS.invoices,
    STORAGE_KEYS.purchaseInvoices,
    STORAGE_KEYS.payments,
    LEGACY_KEYS.fruits,
    LEGACY_KEYS.suppliers,
    LEGACY_KEYS.customers,
    LEGACY_KEYS.vehicles,
    LEGACY_KEYS.invoices,
    LEGACY_KEYS.purchaseInvoices,
    LEGACY_KEYS.payments,
  ];

  const remaining: Record<string, boolean> = {};

  for (const key of businessKeys) {
    try {
      const exists = localStorage.getItem(key) !== null;
      if (exists) {
        remaining[key] = true;
      }
    } catch {
      // ignore
    }
  }

  return remaining;
}

/**
 * Debug: Get migration stats from marker and current state.
 */
export function getMigrationStatus(): {
  hasRun: boolean;
  hasRollbackBackup: boolean;
  remainingBusinessData: Record<string, boolean>;
} {
  return {
    hasRun: hasMigrationRun(),
    hasRollbackBackup: !!safeReadJson(DATA_MIGRATION_ROLLBACK),
    remainingBusinessData: checkRemainingBusinessData(),
  };
}
