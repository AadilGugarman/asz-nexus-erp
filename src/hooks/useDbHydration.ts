/**
 * hooks/useDbHydration.ts
 * Hooks for loading business data from SQLite into React state.
 *
 * These hooks handle:
 *   - Initial load from DB (with optional company scoping)
 *   - Async hydration
 *   - Error handling
 *   - Fallback to localStorage in browser mode
 *
 * Usage:
 *   const { data: suppliers, isLoading, error } = useSuppliers();
 *   const { data: invoices } = useInvoices();
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
} from "@/types";

// ── Type-agnostic loader helper ────────────────────────────────────────────────

export interface UseDbState<T> {
  data: T[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function createDbLoader<TDb, TClient>(
  loader: (companyId?: string) => Promise<TDb[]>,
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
      // ── Browser Fallback ──────────────────────────────────────────────────
      if (!isTauri) {
        if (!storageKey) {
          setData([]);
          setIsLoading(false);
          return;
        }

        try {
          const saved = localStorage.getItem(storageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            const records = Array.isArray(parsed) ? parsed : [];
            setData(records);
          }
        } catch (e) {
          console.warn(
            `[useDbHydration] Browser fallback failed for ${name}:`,
            e,
          );
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // ── Tauri / SQLite ─────────────────────────────────────────────────────
      if (!isDbReady || !dbService.isReady) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const dbRecords = await loader(activeCompanyId ?? undefined);

        if (import.meta.env.DEV) {
          console.info(
            `[useDbHydration] ${name}: found ${dbRecords.length} records for company ${activeCompanyId}.`,
          );
        }

        const transformed = dbRecords.map(transformer);
        setData(transformed);
      } catch (err) {
        const e =
          err instanceof Error ? err : new Error(`Failed to load ${name}`);
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

      if (startupPhase === "idle" && !isDbReady) {
        return;
      }

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

async function loadSuppliers(companyId?: string) {
  return await dbService.suppliers.findAll(undefined, companyId);
}

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
  loadSuppliers,
  dbToSupplier,
  "suppliers",
  STORAGE_KEYS.suppliers,
);

// ── Customers ─────────────────────────────────────────────────────────────────

async function loadCustomers(companyId?: string) {
  return await dbService.customers.findAll(undefined, companyId);
}

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
  loadCustomers,
  dbToCustomer,
  "customers",
  STORAGE_KEYS.customers,
);

// ── Fruits ────────────────────────────────────────────────────────────────────

async function loadFruits(companyId?: string) {
  return await dbService.fruits.findAll(undefined, companyId);
}

function dbToFruit(db: any): Fruit {
  let varieties: string[] = [];
  try {
    const parsed = JSON.parse(db.varieties);
    varieties = Array.isArray(parsed) ? parsed : [];
  } catch {
    // ignore
  }

  return {
    id: db.id,
    name: db.name,
    varieties: varieties,
  };
}

export const useFruits = createDbLoader(
  loadFruits,
  dbToFruit,
  "fruits",
  STORAGE_KEYS.fruits,
);

// ── Invoices ──────────────────────────────────────────────────────────────────

async function loadInvoices(companyId?: string) {
  return await dbService.invoices.findAll(undefined, companyId);
}

function dbToInvoice(db: any): Invoice {
  let items: any[] = [];
  try {
    const parsed = JSON.parse(db.items);
    items = Array.isArray(parsed) ? parsed : [];
  } catch {
    // ignore
  }

  return {
    id: db.id,
    invoiceNo: db.invoiceNo,
    date: db.date,
    customerId: db.customerId,
    customerName: db.customerName,
    items: items,
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
  loadInvoices,
  dbToInvoice,
  "invoices",
  STORAGE_KEYS.invoices,
);

// ── Purchase Invoices ─────────────────────────────────────────────────────────

async function loadPurchaseInvoices(companyId?: string) {
  return await dbService.purchaseInvoices.findAll(undefined, companyId);
}

function dbToPurchaseInvoice(db: any): PurchaseInvoice {
  let items: any[] = [];
  try {
    const parsed = JSON.parse(db.items);
    items = Array.isArray(parsed) ? parsed : [];
  } catch {
    // ignore
  }

  return {
    id: db.id,
    billNo: db.billNo,
    date: db.date,
    supplierId: db.supplierId,
    supplierName: db.supplierName,
    items: items,
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
  loadPurchaseInvoices,
  dbToPurchaseInvoice,
  "purchaseInvoices",
  STORAGE_KEYS.purchaseInvoices,
);

// ── Payments ──────────────────────────────────────────────────────────────────

async function loadPayments(companyId?: string) {
  return await dbService.payments.findAll(undefined, companyId);
}

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
  loadPayments,
  dbToPayment,
  "payments",
  STORAGE_KEYS.payments,
);

// ── Vehicle Arrivals ──────────────────────────────────────────────────────────

async function loadVehicleArrivals(companyId?: string) {
  return await dbService.vehicleArrivals.findAll(undefined, companyId);
}

function dbToVehicleArrival(db: any): VehicleArrival {
  let rows: any[] = [];
  try {
    const parsed = JSON.parse(db.rows);
    rows = Array.isArray(parsed) ? parsed : [];
  } catch {
    // ignore
  }

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
    rows: rows,
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
  loadVehicleArrivals,
  dbToVehicleArrival,
  "vehicleArrivals",
  STORAGE_KEYS.vehicles,
);
