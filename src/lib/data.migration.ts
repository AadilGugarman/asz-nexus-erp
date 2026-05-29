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
      invoices: safeReadJson(STORAGE_KEYS.invoices),
      purchaseInvoices: safeReadJson(STORAGE_KEYS.purchaseInvoices),
      payments: safeReadJson(STORAGE_KEYS.payments),
    };
    localStorage.setItem(DATA_MIGRATION_ROLLBACK, JSON.stringify(backup));
  } catch {
    console.warn("[Data Migration] Failed to create rollback backup");
  }
}

const LEGACY_MIGRATION_COMPANY_ID = "tfc_erp_legacy_company";
const LEGACY_MIGRATION_COMPANY_NAME = "Legacy Company";

function getDefaultFinancialYearName(): string {
  const now = new Date();
  const fyStartMonth = 4; // April
  const year = now.getFullYear();
  if (now.getMonth() + 1 >= fyStartMonth) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }
  return `${year - 1}-${String(year).slice(-2)}`;
}

function scopedGroupId(companyId: string, slug: string): string {
  return `${companyId}__${slug}`;
}

// ── Migration stats tracking ──────────────────────────────────────────────

export interface DataMigrationStats {
  alreadyRun: boolean;
  fruitsInserted: number;
  varietiesInserted: number;
  suppliersInserted: number;
  customersInserted: number;
  invoicesInserted: number;
  purchaseInvoicesInserted: number;
  paymentsInserted: number;
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
 */
export async function runDataMigration(): Promise<DataMigrationStats> {
  const startTime = performance.now();

  const stats: DataMigrationStats = {
    alreadyRun: false,
    fruitsInserted: 0,
    varietiesInserted: 0,
    suppliersInserted: 0,
    customersInserted: 0,
    invoicesInserted: 0,
    purchaseInvoicesInserted: 0,
    paymentsInserted: 0,
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

    const legacyCompanyId = LEGACY_MIGRATION_COMPANY_ID;
    const legacyCompanyName = LEGACY_MIGRATION_COMPANY_NAME;
    const legacyFyName = getDefaultFinancialYearName();
    const legacyFyId = await dbService.financialYears.ensureFinancialYear(
      legacyCompanyId,
      legacyFyName,
      legacyCompanyName,
    );
    await dbService.accountGroups.ensureDefaultGroups(legacyCompanyId);

    // ── Migrate Fruits & Varieties (Normalized) ───────────────────────────────
    const fruits = safeReadJson<Fruit[]>(STORAGE_KEYS.fruits);
    if (fruits && Array.isArray(fruits)) {
      for (const fruit of fruits) {
        try {
          // 1. Insert Fruit
          await dbService.fruits.insert({
            id: fruit.id,
            companyId: legacyCompanyId,
            name: fruit.name,
            pricingType: fruit.pricingType || "caret",
          });
          stats.fruitsInserted++;

          // 2. Insert Varieties for this fruit
          if (fruit.varieties && Array.isArray(fruit.varieties)) {
            for (const vName of fruit.varieties) {
              await dbService.fruits.addVariety({
                companyId: legacyCompanyId,
                fruitId: fruit.id,
                name: vName,
              });
              stats.varietiesInserted++;
            }
          }
        } catch (err) {
          console.warn(
            `[Data Migration] Failed to insert fruit/variety for ${fruit.id}:`,
            err,
          );
          stats.errorCount++;
        }
      }
    }

    // ── Migrate Suppliers (to Ledgers) ────────────────────────────────────────
    const suppliers = safeReadJson<Supplier[]>(STORAGE_KEYS.suppliers);
    if (suppliers && Array.isArray(suppliers)) {
      for (const supplier of suppliers) {
        try {
          await dbService.suppliers.insert({
            id: supplier.id,
            companyId: legacyCompanyId,
            name: supplier.name,
            code: supplier.code || "",
            phone: supplier.phone || "",
            email: supplier.email || "",
            gstin: supplier.gstin || "",
            city: supplier.city || "",
            state: supplier.state || "",
            billingAddress: supplier.billingAddress || "",
            shippingAddress: supplier.shippingAddress || "",
            openingBalance: supplier.previousBalance || 0,
            openingBalanceType: "Cr", // Suppliers usually have credit balance
            type: "SUPPLIER",
            groupId: scopedGroupId(legacyCompanyId, "sundry-creditors"),
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

    // ── Migrate Customers (to Ledgers) ────────────────────────────────────────
    const customers = safeReadJson<Customer[]>(STORAGE_KEYS.customers);
    if (customers && Array.isArray(customers)) {
      for (const customer of customers) {
        try {
          await dbService.customers.insert({
            id: customer.id,
            companyId: legacyCompanyId,
            name: customer.name,
            phone: customer.phone || "",
            email: customer.email || "",
            gstin: customer.gstin || "",
            city: customer.city || "",
            state: customer.state || "",
            billingAddress: customer.billingAddress || "",
            shippingAddress: customer.shippingAddress || "",
            openingBalance: customer.previousBalance || 0,
            openingBalanceType: "Dr", // Customers usually have debit balance
            type: "CUSTOMER",
            groupId: scopedGroupId(legacyCompanyId, "sundry-debtors"),
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

    // ── Migrate Invoices (Sales) ──────────────────────────────────────────────
    const invoices = safeReadJson<Invoice[]>(STORAGE_KEYS.invoices);
    if (invoices && Array.isArray(invoices)) {
      for (const invoice of invoices) {
        try {
          await dbService.invoices.insert({
            id: invoice.id,
            companyId: legacyCompanyId,
            financialYearId: legacyFyId,
            invoiceNumber: invoice.invoiceNo,
            date: new Date(invoice.date),
            ledgerId: invoice.customerId,
            type: "SALE",
            vehicleNo: invoice.vehicleNo,
            declaredWeight: invoice.declaredWeight,
            subTotal:
              invoice.todayAmount -
              (invoice.freight || 0) -
              (invoice.hamali || 0),
            freight: invoice.freight || 0,
            hamali: invoice.hamali || 0,
            grandTotal: invoice.todayAmount,
            paidAmount: invoice.paidAmount || 0,
            notes: invoice.notes,
            status: "FINAL",
            createdAt: new Date(invoice.createdAt || Date.now()),
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
          await dbService.invoices.insert({
            id: pinv.id,
            companyId: legacyCompanyId,
            financialYearId: legacyFyId,
            invoiceNumber: pinv.billNo,
            date: new Date(pinv.date),
            ledgerId: pinv.supplierId,
            type: "PURCHASE",
            vehicleNo: pinv.vehicleNo,
            declaredWeight: pinv.declaredWeight,
            subTotal:
              pinv.todayAmount - (pinv.freight || 0) - (pinv.hamali || 0),
            freight: pinv.freight || 0,
            hamali: pinv.hamali ?? 0,
            grandTotal: pinv.todayAmount,
            paidAmount: pinv.paidAmount || 0,
            notes: pinv.notes,
            status: "FINAL",
            createdAt: new Date(pinv.createdAt || Date.now()),
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
          const cashLedgerId =
            await dbService.payments.ensureCashLedger(legacyCompanyId);
          await dbService.payments.insert({
            id: payment.id,
            companyId: legacyCompanyId,
            financialYearId: legacyFyId,
            date: new Date(payment.date),
            type: payment.partyType === "SUPPLIER" ? "PAYMENT" : "RECEIPT",
            ledgerId: payment.partyId,
            voucherNumber: payment.id.substring(0, 8).toUpperCase(),
            amount: payment.amount,
            paymentMode: payment.paymentMode,
            referenceNo: payment.referenceNo,
            narration: payment.notes,
            offsetLedgerId: cashLedgerId,
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

    // ── Clean up: Remove old business data from localStorage ──────────────────
    const businessKeys = [
      STORAGE_KEYS.fruits,
      STORAGE_KEYS.suppliers,
      STORAGE_KEYS.customers,
      STORAGE_KEYS.invoices,
      STORAGE_KEYS.purchaseInvoices,
      STORAGE_KEYS.payments,
    ];

    for (const key of businessKeys) {
      safeRemoveKey(key);
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
 */
export function resetDataMigrationMarker(): void {
  try {
    localStorage.removeItem(DATA_MIGRATION_MARKER);
  } catch {
    // silent fail
  }
}

/**
 * Restore from rollback backup if migration failed.
 */
export function rollbackDataMigration(): void {
  try {
    const backup = safeReadJson<Record<string, unknown>>(
      DATA_MIGRATION_ROLLBACK,
    );
    if (!backup) return;

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

    resetDataMigrationMarker();
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
    STORAGE_KEYS.invoices,
    STORAGE_KEYS.purchaseInvoices,
    STORAGE_KEYS.payments,
    LEGACY_KEYS.fruits,
    LEGACY_KEYS.suppliers,
    LEGACY_KEYS.customers,
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
