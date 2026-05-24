/**
 * hooks/useDbHydration.ts
 * Loads business data from SQLite into React state, scoped to the active company.
 *
 * Every loader passes activeCompanyId to findAll() so Company A never sees
 * Company B's records. Data re-fetches automatically when the active company
 * changes (e.g. user switches company).
 */

import { useEffect, useState, useCallback } from "react";
import { dbService } from "@/db/services";
import { useStartupStore } from "@/store/startup.store";
import { useSettingsStore } from "@/store/settings.store";
import { APP_CONFIG, STORAGE_KEYS } from "@/config";
import type {
  Supplier,
  Customer,
  Fruit,
  Invoice,
  PurchaseInvoice,
  PaymentReceipt,
  VehicleArrival,
  CaretTransaction,
} from "@/types";

// ── Type-agnostic loader helper ────────────────────────────────────────────────

export interface UseDbState<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function createDbLoader<TDb, TClient>(
  loader: (companyId: string | null) => Promise<TDb[]>,
  transformer: (db: TDb) => TClient,
  name: string,
  storageKey?: string,
): () => UseDbState<TClient> {
  return function useLoader(): UseDbState<TClient> {
    const [data, setData] = useState<TClient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const startupPhase = useStartupStore((s) => s.phase);
    const isDbReady = useStartupStore((s) => s.isDbReady);
    const activeCompanyId = useSettingsStore((s) => s.activeCompanyId);
    const isTauri = APP_CONFIG.isTauri;

    const load = useCallback(async () => {
      // ── Browser / localStorage fallback ──────────────────────────────────
      if (!isTauri) {
        if (!storageKey) {
          setData([]);
          setIsLoading(false);
          return;
        }
        try {
          // Scope the key by company so Company A never sees Company B's data.
          // Falls back to the unscoped key for backwards compatibility with
          // existing browser-mode seed data that predates company scoping.
          const scopedKey = activeCompanyId
            ? `${storageKey}__${activeCompanyId}`
            : storageKey;
          const saved =
            localStorage.getItem(scopedKey) ??
            localStorage.getItem(storageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            setData(Array.isArray(parsed) ? parsed : []);
          } else {
            setData([]);
          }
        } catch (e) {
          console.warn(`[useDbHydration] Browser fallback failed for ${name}:`, e);
          setData([]);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // ── Tauri / SQLite ─────────────────────────────────────────────────────
      if (!isDbReady || !dbService.isReady) return;

      setIsLoading(true);
      setError(null);

      try {
        // Pass activeCompanyId so the repository filters by company_id column
        const dbRecords = await loader(activeCompanyId);

        if (import.meta.env.DEV) {
          console.info(
            `[useDbHydration] ${name}: loaded ${dbRecords.length} records` +
            (activeCompanyId ? ` for company ${activeCompanyId}` : " (no company filter)"),
          );
        }

        setData(dbRecords.map(transformer));
      } catch (err) {
        const e = err instanceof Error ? err : new Error(`Failed to load ${name}`);
        setError(e);
        console.warn(`[useDbHydration] ${name} load failed:`, e);
      } finally {
        setIsLoading(false);
      }
    }, [isDbReady, isTauri, activeCompanyId]);

    useEffect(() => {
      if (!isTauri) {
        void load();
        return;
      }
      if (startupPhase === "idle" && !isDbReady) return;
      if (!isDbReady) {
        setData([]);
        setIsLoading(false);
        return;
      }
      void load();
    }, [startupPhase, isDbReady, isTauri, load]);

    return { data, isLoading, error, refetch: load };
  };
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

function dbToSupplier(db: any): Supplier {
  return {
    id: db.id,
    name: db.name,
    code: db.code || "",
    phone: db.phone || "",
    city: db.city || "",
    previousBalance: db.previousBalance || 0,
  };
}

export const useSuppliers = createDbLoader(
  (companyId) => dbService.suppliers.findAll(undefined, companyId ?? undefined),
  dbToSupplier,
  "suppliers",
  // Browser dev fallback only — never written in Tauri/production
  STORAGE_KEYS.suppliers,
);

// ── Customers ─────────────────────────────────────────────────────────────────

function dbToCustomer(db: any): Customer {
  return {
    id: db.id,
    name: db.name,
    phone: db.phone || "",
    city: db.city || "",
    previousBalance: db.previousBalance || 0,
  };
}

export const useCustomers = createDbLoader(
  (companyId) => dbService.customers.findAll(undefined, companyId ?? undefined),
  dbToCustomer,
  "customers",
  // Browser dev fallback only — never written in Tauri/production
  STORAGE_KEYS.customers,
);

// ── Fruits ────────────────────────────────────────────────────────────────────

function dbToFruit(db: any): Fruit {
  let varieties: string[] = [];
  try {
    const parsed = JSON.parse(db.varieties);
    varieties = Array.isArray(parsed) ? parsed : [];
  } catch { /* ignore */ }
  return { id: db.id, name: db.name, varieties };
}

export const useFruits = createDbLoader(
  (companyId) => dbService.fruits.findAll(undefined, companyId ?? undefined),
  dbToFruit,
  "fruits",
  // Browser dev fallback only — never written in Tauri/production
  STORAGE_KEYS.fruits,
);

// ── Invoices ──────────────────────────────────────────────────────────────────

function dbToInvoice(db: any): Invoice {
  let items: any[] = [];
  try {
    const parsed = JSON.parse(db.items);
    items = Array.isArray(parsed) ? parsed : [];
  } catch { /* ignore */ }
  return {
    id: db.id,
    invoiceNo: db.invoiceNo,
    date: db.date,
    customerId: db.customerId,
    customerName: db.customerName,
    items,
    previousBalance: db.previousBalance || 0,
    todayAmount: db.todayAmount || 0,
    hamali: db.hamali,
    discount: db.discount,
    paidAmount: db.paidAmount || 0,
    remainingBalance: db.remainingBalance || 0,
    notes: db.notes,
    createdAt: db.createdAt,
  };
}

export const useInvoices = createDbLoader(
  (companyId) => dbService.invoices.findAll(undefined, companyId ?? undefined),
  dbToInvoice,
  "invoices",
  // Browser dev fallback only — never written in Tauri/production
  STORAGE_KEYS.invoices,
);

// ── Purchase Invoices ─────────────────────────────────────────────────────────

function dbToPurchaseInvoice(db: any): PurchaseInvoice {
  let items: any[] = [];
  try {
    const parsed = JSON.parse(db.items);
    items = Array.isArray(parsed) ? parsed : [];
  } catch { /* ignore */ }
  return {
    id: db.id,
    billNo: db.billNo,
    date: db.date,
    supplierId: db.supplierId,
    supplierName: db.supplierName,
    items,
    previousBalance: db.previousBalance || 0,
    todayAmount: db.todayAmount || 0,
    freight: db.freight,
    hamali: db.hamali,
    paidAmount: db.paidAmount || 0,
    remainingBalance: db.remainingBalance || 0,
    notes: db.notes,
    createdAt: db.createdAt,
  };
}

export const usePurchaseInvoices = createDbLoader(
  (companyId) => dbService.purchaseInvoices.findAll(undefined, companyId ?? undefined),
  dbToPurchaseInvoice,
  "purchaseInvoices",
  // Browser dev fallback only — never written in Tauri/production
  STORAGE_KEYS.purchaseInvoices,
);

// ── Payments ──────────────────────────────────────────────────────────────────

function dbToPayment(db: any): PaymentReceipt {
  return {
    id: db.id,
    date: db.date,
    partyType: db.partyType,
    partyId: db.partyId,
    partyName: db.partyName,
    amount: db.amount,
    paymentMode: db.paymentMode,
    referenceNo: db.referenceNo,
    notes: db.notes,
  };
}

export const usePayments = createDbLoader(
  (companyId) => dbService.payments.findAll(undefined, companyId ?? undefined),
  dbToPayment,
  "payments",
  // Browser dev fallback only — never written in Tauri/production
  STORAGE_KEYS.payments,
);

// ── Vehicle Arrivals ──────────────────────────────────────────────────────────

function dbToVehicleArrival(db: any): VehicleArrival {
  let rows: any[] = [];
  try {
    const parsed = JSON.parse(db.rows);
    rows = Array.isArray(parsed) ? parsed : [];
  } catch { /* ignore */ }
  return {
    id: db.id,
    arrivalNo: db.arrivalNo,
    date: db.date,
    day: db.day || "",
    vehicleNo: db.vehicleNo,
    vehicleName: db.vehicleName,
    fruitType: db.fruitType,
    totalVehicleWeight: db.totalVehicleWeight || 0,
    driverName: db.driverName,
    notes: db.notes,
    rows,
    totalCarets: db.totalCarets || 0,
    totalCalculatedWeight: db.totalCalculatedWeight || 0,
    totalAmount: db.totalAmount || 0,
    freightCharge: db.freightCharge,
    hamaliCharge: db.hamaliCharge,
    advancePaid: db.advancePaid,
    status: db.status || "SAVED",
    createdAt: db.createdAt,
  };
}

export const useVehicleArrivals = createDbLoader(
  (companyId) => dbService.vehicleArrivals.findAll(undefined, companyId ?? undefined),
  dbToVehicleArrival,
  "vehicleArrivals",
  // Browser dev fallback only — never written in Tauri/production
  STORAGE_KEYS.vehicles,
);

// ── Caret Transactions ────────────────────────────────────────────────────────

function dbToCaretTransaction(db: any): CaretTransaction {
  return {
    id: db.id,
    date: db.date,
    customerId: db.customerId,
    customerName: db.customerName,
    type: db.type as 'GIVEN' | 'RETURN',
    fruitName: db.fruitName || '',
    caretQty: db.caretQty || 0,
    note: db.note,
    billId: db.billId,
    billNo: db.billNo,
    companyId: db.companyId,
    createdAt: db.createdAt,
  };
}

export const useCaretTransactions = createDbLoader(
  (companyId) => dbService.caretTransactions.findAll(undefined, companyId ?? undefined),
  dbToCaretTransaction,
  "caretTransactions",
);
