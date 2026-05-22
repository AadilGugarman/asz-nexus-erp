/**
 * hooks/useDbHydration.ts
 * Hooks for loading business data from SQLite into React state.
 *
 * These hooks handle:
 *   - Initial load from DB
 *   - Async hydration
 *   - Error handling
 *   - Fallback to empty state
 *
 * Usage:
 *   const { suppliers, isLoading, error } = useSuppliers();
 *   const { invoices } = useInvoices();
 */

import { useEffect, useState, useCallback } from "react";
import { dbService } from "@/db/services";
import { useStartupStore } from "@/store/startup.store";
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
  loader: () => Promise<TDb[]>,
  transformer: (db: TDb) => TClient,
  name: string,
): () => UseDbState<TClient> {
  return function useLoader(): UseDbState<TClient> {
    const [data, setData] = useState<TClient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const startupPhase = useStartupStore((s) => s.phase);
    const isDbReady = useStartupStore((s) => s.isDbReady);

    const load = useCallback(async () => {
      if (!dbService.isReady) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const dbRecords = await loader();
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
    }, [loader, transformer, name]);

    useEffect(() => {
      if (startupPhase === "idle" && !isDbReady) {
        return;
      }

      if (!isDbReady) {
        setData([]);
        setError(null);
        setIsLoading(false);
        return;
      }

      void load();
    }, [startupPhase, isDbReady, load]);

    return { data, isLoading, error, refetch: load };
  };
}

// ── Suppliers ─────────────────────────────────────────────────────────────────

async function loadSuppliers() {
  const dbSuppliers = await dbService.suppliers.findAll();
  return dbSuppliers || [];
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
);

// ── Customers ─────────────────────────────────────────────────────────────────

async function loadCustomers() {
  const dbCustomers = await dbService.customers.findAll();
  return dbCustomers || [];
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
);

// ── Fruits ────────────────────────────────────────────────────────────────────

async function loadFruits() {
  const dbFruits = await dbService.fruits.findAll();
  return dbFruits || [];
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

export const useFruits = createDbLoader(loadFruits, dbToFruit, "fruits");

// ── Invoices ──────────────────────────────────────────────────────────────────

async function loadInvoices() {
  const dbInvoices = await dbService.invoices.findAll();
  return dbInvoices || [];
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
);

// ── Purchase Invoices ─────────────────────────────────────────────────────────

async function loadPurchaseInvoices() {
  const dbInvoices = await dbService.purchaseInvoices.findAll();
  return dbInvoices || [];
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
);

// ── Payments ──────────────────────────────────────────────────────────────────

async function loadPayments() {
  const dbPayments = await dbService.payments.findAll();
  return dbPayments || [];
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
);

// ── Vehicle Arrivals ──────────────────────────────────────────────────────────

async function loadVehicleArrivals() {
  const dbArrivals = await dbService.vehicleArrivals.findAll();
  return dbArrivals || [];
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
);
