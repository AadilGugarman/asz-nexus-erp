import React, { createContext, useState, useEffect, useMemo } from "react";
import {
  Fruit,
  Supplier,
  Customer,
  Invoice,
  PurchaseInvoice,
  InventoryItem,
  StockMovement,
  SupplierLedgerEntry,
  CustomerLedgerEntry,
  PaymentReceipt,
  ThemeMode,
  AppSettings,
  CompanyProfile,
  CaretTransaction,
} from "../types";
import { STORAGE_KEYS } from "@/config";
import { roundCurrency } from "@/utils/format";
import { useAppearanceStore } from "@/store/appearance.store";
import { useSettingsStore } from "@/store/settings.store";
import {
  useSuppliers,
  useCustomers,
  useFruits,
  useInvoices,
  usePurchaseInvoices,
  usePayments,
  useCaretTransactions,
} from "@/hooks/useDbHydration";
import { dbService } from "@/db/services";

interface AppContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  fruits: Fruit[];
  suppliers: Supplier[];
  customers: Customer[];
  invoices: Invoice[];
  purchaseInvoices: PurchaseInvoice[];
  payments: PaymentReceipt[];
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  getSupplierLedger: (supplierId: string) => SupplierLedgerEntry[];
  getCustomerLedger: (customerId: string) => CustomerLedgerEntry[];
  saveInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: string) => void;
  savePurchaseInvoice: (invoice: PurchaseInvoice) => void;
  deletePurchaseInvoice: (id: string) => void;
  savePayment: (payment: PaymentReceipt) => void;
  addPayment: (payment: PaymentReceipt) => void;
  deletePayment: (id: string) => void;
  addSupplier: (supplier: Omit<Supplier, "id">) => string;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (id: string) => void;
  addCustomer: (customer: Omit<Customer, "id">) => string;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
  addFruitVariety: (fruitId: string, varietyName: string) => void;
  addFruit: (fruitName: string) => string;
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  resetAllData: () => void;
  importData: (json: string) => boolean;
  activeFY: string;
  setActiveFY: (fy: string) => void;
  fyOptions: string[];
  getExportData: () => string;
  companies: CompanyProfile[];
  activeCompanyId: string | null;
  addCompany: (profile: CompanyProfile) => void;
  updateCompany: (profile: CompanyProfile) => void;
  deleteCompany: (id: string) => void;
  switchCompany: (id: string) => void;
  // ── Caret Transactions ──────────────────────────────────────────────────────
  caretTransactions: CaretTransaction[];
  addCaretTransaction: (tx: Omit<CaretTransaction, "id" | "createdAt">) => void;
  updateCaretTransaction: (tx: CaretTransaction) => void;
  deleteCaretTransaction: (id: string) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);
export type { AppContextType };

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const theme = useAppearanceStore((s) => s.resolvedTheme) as ThemeMode;
  const toggleTheme = useAppearanceStore((s) => s.toggleTheme);

  const { data: dbFruits } = useFruits();
  const { data: dbSuppliers } = useSuppliers();
  const { data: dbCustomers } = useCustomers();
  const { data: dbInvoices } = useInvoices();
  const { data: dbPurchaseInvoices } = usePurchaseInvoices();
  const { data: dbPayments } = usePayments();
  const { data: dbCaretTransactions } = useCaretTransactions();

  // Local mirrors for optimistic UI updates — seeded from DB, updated on writes
  const [fruits, setFruits] = useState<Fruit[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>(
    [],
  );
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [caretTxList, setCaretTxList] = useState<CaretTransaction[]>([]);

  // Sync local state when DB data loads or refreshes
  useEffect(() => {
    if (dbFruits) setFruits(dbFruits);
  }, [dbFruits]);
  useEffect(() => {
    if (dbSuppliers) setSuppliers(dbSuppliers);
  }, [dbSuppliers]);
  useEffect(() => {
    if (dbCustomers) setCustomers(dbCustomers);
  }, [dbCustomers]);
  useEffect(() => {
    if (dbInvoices) setInvoices(dbInvoices);
  }, [dbInvoices]);
  useEffect(() => {
    if (dbPurchaseInvoices) setPurchaseInvoices(dbPurchaseInvoices);
  }, [dbPurchaseInvoices]);
  useEffect(() => {
    if (dbPayments) setPayments(dbPayments);
  }, [dbPayments]);
  useEffect(() => {
    if (dbCaretTransactions) setCaretTxList(dbCaretTransactions);
  }, [dbCaretTransactions]);

  const safeDbWrite = async (
    label: string,
    action: () => Promise<unknown>,
    onRollback?: () => void,
  ) => {
    if (!dbService.isReady) {
      console.warn(
        `[AppContext] DB service not ready for (${label}); attempting init...`,
      );
      try {
        const initialized = await dbService.init();
        if (!initialized) {
          console.warn(
            `[AppContext] DB service initialization failed for (${label})`,
          );
          if (onRollback) onRollback();
          return;
        }
      } catch (err) {
        console.error(
          `[AppContext] DB service init failed for (${label}):`,
          err,
        );
        if (onRollback) onRollback();
        return;
      }
    }

    // Guard: never write to DB without a valid company context
    if (!activeCompanyId) {
      console.warn(
        `[AppContext] Blocked DB write (${label}): no active company`,
      );
      if (onRollback) onRollback();
      return;
    }

    try {
      await action();
    } catch (err) {
      console.error(`[AppContext] DB write failed (${label}):`, err);
      // Roll back optimistic UI state if a rollback function was provided
      if (onRollback) {
        console.warn(
          `[AppContext] Rolling back optimistic state for (${label})`,
        );
        onRollback();
      }
    }
  };

  // ── Settings & Companies — delegated to useSettingsStore (SQLite-backed) ────
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const companies = useSettingsStore((s) => s.companies);
  const activeCompanyId = useSettingsStore((s) => s.activeCompanyId);
  const activeFY = useSettingsStore((s) => s.activeFY);
  const setActiveFY = useSettingsStore((s) => s.setActiveFY);
  const addCompany = useSettingsStore((s) => s.addCompany);
  const updateCompany = useSettingsStore((s) => s.updateCompany);
  const deleteCompany = useSettingsStore((s) => s.deleteCompany);
  const switchCompany = useSettingsStore((s) => s.switchCompany);

  // Convenience: current company id as a non-null string for DB writes
  const cid = activeCompanyId ?? "default";

  // Derive the financial year start date from activeFY + company's financialYearStart.
  // Used for ledger opening balance entries — respects the selected FY, not just current year.
  const fyStartDate = useMemo(() => {
    const fyStart = settings?.financial?.financialYearStart ?? "04-01";
    const [monthStr] = fyStart.split("-");
    const month = parseInt(monthStr, 10);

    // If activeFY is set (e.g. "2024-25"), use its start year directly
    if (activeFY) {
      const [startYearStr] = activeFY.split("-");
      const startYear = parseInt(startYearStr, 10);
      if (!isNaN(startYear)) {
        return `${startYear}-${String(month).padStart(2, "0")}-01`;
      }
    }

    // Fallback: derive from current date
    const now = new Date();
    const currentYear = now.getFullYear();
    const baseYear =
      now.getMonth() + 1 >= month ? currentYear : currentYear - 1;
    return `${baseYear}-${String(month).padStart(2, "0")}-01`;
  }, [settings?.financial?.financialYearStart, activeFY]);

  // Auto-calculated Inventory & Stock Movements
  const { inventory, stockMovements } = useMemo(() => {
    const itemsMap = new Map<string, InventoryItem>();
    const movements: StockMovement[] = [];

    // Process Purchase Invoices (Stock IN)
    purchaseInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const key = `${item.fruit}_${item.variety}`;
        const current = itemsMap.get(key) || {
          key,
          fruit: item.fruit,
          variety: item.variety,
          totalWeight: 0,
          totalCarets: 0,
        };
        current.totalWeight += Number(item.weight) || 0;
        current.totalCarets += Number(item.caret) || 0;
        itemsMap.set(key, current);

        movements.push({
          id: `pinv-${inv.id}-${item.id}`,
          date: inv.date,
          fruit: item.fruit,
          variety: item.variety,
          type: "PURCHASE_BILL",
          reference: `Pur Bill: ${inv.billNo} (${inv.supplierName})`,
          weightChange: Number(item.weight) || 0,
          caretChange: Number(item.caret) || 0,
          resultingWeight: current.totalWeight,
          resultingCarets: current.totalCarets,
        });
      });
    });

    // Process Sales Invoices (Stock OUT)
    invoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const key = `${item.fruit}_${item.lotVariety}`;
        const current = itemsMap.get(key) || {
          key,
          fruit: item.fruit,
          variety: item.lotVariety,
          totalWeight: 0,
          totalCarets: 0,
        };
        current.totalWeight -= Number(item.weight) || 0;
        current.totalCarets -= Number(item.caret) || 0;
        itemsMap.set(key, current);

        movements.push({
          id: `sale-${inv.id}-${item.id}`,
          date: inv.date,
          fruit: item.fruit,
          variety: item.lotVariety,
          type: "SALE",
          reference: `Inv: ${inv.invoiceNo} (${inv.customerName})`,
          weightChange: -(Number(item.weight) || 0),
          caretChange: -(Number(item.caret) || 0),
          resultingWeight: current.totalWeight,
          resultingCarets: current.totalCarets,
        });
      });
    });

    movements.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return {
      inventory: Array.from(itemsMap.values()),
      stockMovements: movements,
    };
  }, [purchaseInvoices, invoices]);

  // Supplier Ledger Calculation
  const getSupplierLedger = (supplierId: string): SupplierLedgerEntry[] => {
    const supplier = suppliers.find((s) => s.id === supplierId);
    if (!supplier) return [];

    const entries: SupplierLedgerEntry[] = [];
    let runningBalance = supplier.previousBalance;

    entries.push({
      id: "opening",
      supplierId,
      date: fyStartDate,
      type: "OPENING",
      amount: supplier.previousBalance,
      note: "Opening Balance",
      runningBalance,
    });

    const purchaseEntries: SupplierLedgerEntry[] = [];
    purchaseInvoices
      .filter((i) => i.supplierId === supplierId)
      .forEach((inv) => {
        purchaseEntries.push({
          id: `pinv-${inv.id}`,
          supplierId,
          date: inv.date,
          type: "PURCHASE_BILL",
          referenceId: inv.id,
          referenceNo: inv.billNo,
          variety: `Purchase Bill (${inv.items.length} items)`,
          amount: inv.todayAmount,
          note: inv.notes,
          runningBalance: 0,
        });

        if (inv.paidAmount > 0) {
          purchaseEntries.push({
            id: `pinv-pay-${inv.id}`,
            supplierId,
            date: inv.date,
            type: "PAYMENT",
            referenceId: inv.id,
            referenceNo: inv.billNo,
            amount: -inv.paidAmount,
            note: `Immediate cash/bank payment on Purchase Bill ${inv.billNo}`,
            runningBalance: 0,
          });
        }
      });

    const paymentEntries: SupplierLedgerEntry[] = [];
    payments
      .filter((p) => p.partyType === "SUPPLIER" && p.partyId === supplierId)
      .forEach((p) => {
        paymentEntries.push({
          id: `pay-${p.id}`,
          supplierId,
          date: p.date,
          type: "PAYMENT",
          amount: -p.amount,
          note: `Paid via ${p.paymentMode} ${p.referenceNo ? `(${p.referenceNo})` : ""} - ${p.notes || ""}`,
          runningBalance: 0,
        });
      });

    const combined = [...purchaseEntries, ...paymentEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    combined.forEach((entry) => {
      runningBalance = roundCurrency(runningBalance + entry.amount);
      entry.runningBalance = runningBalance;
      entries.push(entry);
    });

    return entries.reverse();
  };

  const getCustomerLedger = (customerId: string): CustomerLedgerEntry[] => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return [];

    const entries: CustomerLedgerEntry[] = [];
    let runningBalance = customer.previousBalance;

    entries.push({
      id: "opening",
      customerId,
      date: fyStartDate,
      type: "OPENING",
      amount: customer.previousBalance,
      note: "Opening Balance",
      runningBalance,
    });

    const invEntries: CustomerLedgerEntry[] = [];
    invoices
      .filter((i) => i.customerId === customerId)
      .forEach((inv) => {
        invEntries.push({
          id: `inv-${inv.id}`,
          customerId,
          date: inv.date,
          type: "INVOICE",
          referenceId: inv.id,
          referenceNo: inv.invoiceNo,
          amount: inv.todayAmount,
          note: `Invoice total for ${inv.items.length} items. ${inv.notes || ""}`,
          runningBalance: 0,
        });

        if (inv.paidAmount > 0) {
          invEntries.push({
            id: `inv-pay-${inv.id}`,
            customerId,
            date: inv.date,
            type: "PAYMENT",
            referenceId: inv.id,
            referenceNo: inv.invoiceNo,
            amount: -inv.paidAmount,
            note: `Immediate payment received on Invoice ${inv.invoiceNo}`,
            runningBalance: 0,
          });
        }
      });

    const paymentEntries: CustomerLedgerEntry[] = [];
    payments
      .filter((p) => p.partyType === "CUSTOMER" && p.partyId === customerId)
      .forEach((p) => {
        paymentEntries.push({
          id: `pay-${p.id}`,
          customerId,
          date: p.date,
          type: "PAYMENT",
          amount: -p.amount,
          note: `Received via ${p.paymentMode} ${p.referenceNo ? `(${p.referenceNo})` : ""} - ${p.notes || ""}`,
          runningBalance: 0,
        });
      });

    const combined = [...invEntries, ...paymentEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    combined.forEach((entry) => {
      runningBalance = roundCurrency(runningBalance + entry.amount);
      entry.runningBalance = runningBalance;
      entries.push(entry);
    });

    return entries.reverse();
  };

  // ── Sales ───────────────────────────────────

  const saveInvoice = (newInvoice: Invoice) => {
    const isUpdate = invoices.some((i) => i.id === newInvoice.id);
    setInvoices((prev) => {
      const exists = prev.findIndex((i) => i.id === newInvoice.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = newInvoice;
        return updated;
      }
      return [newInvoice, ...prev];
    });

    void safeDbWrite("invoice.save", async () => {
      const fyId = await dbService.financialYears.ensureFinancialYear(
        cid,
        activeFY,
        settings?.company?.name,
      );
      await dbService.accountGroups.ensureDefaultGroups(cid);
      const payload = {
        id: newInvoice.id,
        companyId: cid,
        financialYearId: fyId,
        type: "SALE" as const,
        invoiceNumber: newInvoice.invoiceNo,
        date: new Date(newInvoice.date),
        ledgerId: newInvoice.customerId,
        vehicleNo: newInvoice.vehicleNo,
        declaredWeight: newInvoice.declaredWeight,
        subTotal: newInvoice.todayAmount || 0,
        grandTotal: newInvoice.todayAmount || 0,
        hamali: newInvoice.hamali ?? 0,
        freight: newInvoice.freight ?? 0,
        discountTotal: newInvoice.discount ?? 0,
        paidAmount: newInvoice.paidAmount || 0,
        notes: newInvoice.notes,
        status: "FINAL" as const,
        // flat app columns
        invoiceNo: newInvoice.invoiceNo,
        customerId: newInvoice.customerId,
        customerName: newInvoice.customerName,
        itemsJson: JSON.stringify(newInvoice.items || []),
        previousBalance: newInvoice.previousBalance || 0,
        todayAmount: newInvoice.todayAmount || 0,
        remainingBalance: newInvoice.remainingBalance || 0,
        discount: newInvoice.discount ?? 0,
      };
      if (isUpdate) {
        await dbService.invoices.update(newInvoice.id, payload);
      } else {
        await dbService.invoices.insert(payload);
      }
    });
  };

  const deleteInvoice = (id: string) => {
    const previous = invoices.find((i) => i.id === id);
    setInvoices((prev) => prev.filter((i) => i.id !== id));
    void safeDbWrite(
      "invoice.delete",
      async () => {
        await dbService.invoices.delete(id);
      },
      () => {
        if (previous) setInvoices((prev) => [previous, ...prev]);
      },
    );
  };

  const savePurchaseInvoice = (newInvoice: PurchaseInvoice) => {
    const isUpdate = purchaseInvoices.some((i) => i.id === newInvoice.id);
    setPurchaseInvoices((prev) => {
      const exists = prev.findIndex((i) => i.id === newInvoice.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = newInvoice;
        return updated;
      }
      return [newInvoice, ...prev];
    });

    void safeDbWrite("purchaseInvoice.save", async () => {
      const fyId = await dbService.financialYears.ensureFinancialYear(
        cid,
        activeFY,
        settings?.company?.name,
      );
      await dbService.accountGroups.ensureDefaultGroups(cid);
      const payload = {
        id: newInvoice.id,
        companyId: cid,
        financialYearId: fyId,
        type: "PURCHASE" as const,
        invoiceNumber: newInvoice.billNo,
        date: new Date(newInvoice.date),
        ledgerId: newInvoice.supplierId,
        vehicleNo: newInvoice.vehicleNo,
        declaredWeight: newInvoice.declaredWeight,
        subTotal: newInvoice.todayAmount || 0,
        grandTotal: newInvoice.todayAmount || 0,
        hamali: newInvoice.hamali ?? 0,
        freight: newInvoice.freight ?? 0,
        paidAmount: newInvoice.paidAmount || 0,
        notes: newInvoice.notes,
        status: "FINAL" as const,
        // flat app columns
        billNo: newInvoice.billNo,
        supplierId: newInvoice.supplierId,
        supplierName: newInvoice.supplierName,
        itemsJson: JSON.stringify(newInvoice.items || []),
        previousBalance: newInvoice.previousBalance || 0,
        todayAmount: newInvoice.todayAmount || 0,
        remainingBalance: newInvoice.remainingBalance || 0,
      };
      if (isUpdate) {
        await dbService.purchaseInvoices.update(newInvoice.id, payload);
      } else {
        await dbService.purchaseInvoices.insert(payload);
      }
    });
  };

  const deletePurchaseInvoice = (id: string) => {
    const previous = purchaseInvoices.find((i) => i.id === id);
    setPurchaseInvoices((prev) => prev.filter((i) => i.id !== id));
    void safeDbWrite(
      "purchaseInvoice.delete",
      async () => {
        await dbService.purchaseInvoices.delete(id);
      },
      () => {
        if (previous) setPurchaseInvoices((prev) => [previous, ...prev]);
      },
    );
  };

  const savePayment = (newPayment: PaymentReceipt) => {
    const isUpdate = payments.some((p) => p.id === newPayment.id);
    setPayments((prev) => {
      const exists = prev.findIndex((p) => p.id === newPayment.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = newPayment;
        return updated;
      }
      return [newPayment, ...prev];
    });

    void safeDbWrite("payment.save", async () => {
      const fyId = await dbService.financialYears.ensureFinancialYear(
        cid,
        activeFY,
        settings?.company?.name,
      );
      await dbService.accountGroups.ensureDefaultGroups(cid);
      const cashLedgerId = await dbService.payments.ensureCashLedger(cid);
      const voucherNo = `PMT-${newPayment.id}`;
      const payload = {
        id: newPayment.id,
        companyId: cid,
        financialYearId: fyId,
        type:
          newPayment.partyType === "SUPPLIER"
            ? ("PAYMENT" as const)
            : ("RECEIPT" as const),
        voucherNumber: voucherNo,
        date: new Date(newPayment.date),
        ledgerId: newPayment.partyId,
        offsetLedgerId: cashLedgerId,
        amount: newPayment.amount,
        paymentMode: newPayment.paymentMode,
        referenceNo: newPayment.referenceNo,
        narration: newPayment.notes,
        // flat app columns
        partyType: newPayment.partyType,
        partyId: newPayment.partyId,
        partyName: newPayment.partyName,
        paymentNotes: newPayment.notes,
      };
      if (isUpdate) {
        await dbService.payments.update(newPayment.id, payload);
      } else {
        await dbService.payments.insert(payload);
      }
    });
  };

  const addPayment = (payment: PaymentReceipt) => {
    savePayment(payment);
  };

  const deletePayment = (id: string) => {
    const previous = payments.find((p) => p.id === id);
    setPayments((prev) => prev.filter((p) => p.id !== id));
    void safeDbWrite(
      "payment.delete",
      async () => {
        await dbService.payments.delete(id);
      },
      () => {
        if (previous) setPayments((prev) => [previous, ...prev]);
      },
    );
  };

  const addSupplier = (supplier: Omit<Supplier, "id">) => {
    const newId = `s-${Date.now()}`;
    const newSupplier: Supplier = { id: newId, ...supplier };
    setSuppliers((prev) => [...prev, newSupplier]);

    void safeDbWrite(
      "supplier.insert",
      async () => {
        await dbService.accountGroups.ensureDefaultGroups(cid);
        await dbService.suppliers.insert({
          id: newSupplier.id,
          name: newSupplier.name,
          code: newSupplier.code || "",
          phone: newSupplier.phone || "",
          email: newSupplier.email || "",
          gstin: newSupplier.gstin || "",
          city: newSupplier.city || "",
          state: newSupplier.state || "",
          billingAddress: newSupplier.billingAddress || "",
          shippingAddress: newSupplier.shippingAddress || "",
          openingBalance: newSupplier.previousBalance || 0,
          openingBalanceType: "Cr",
          type: "SUPPLIER",
          groupId: `${cid}__sundry-creditors`,
          creditLimit: newSupplier.creditLimit || 0,
          notes: newSupplier.notes || "",
          companyId: cid,
        });
      },
      () => setSuppliers((prev) => prev.filter((s) => s.id !== newId)),
    );
    return newId;
  };

  const updateSupplier = (supplier: Supplier) => {
    const previous = suppliers.find((s) => s.id === supplier.id);
    setSuppliers((prev) =>
      prev.map((s) => (s.id === supplier.id ? supplier : s)),
    );
    void safeDbWrite(
      "supplier.update",
      async () => {
        await dbService.suppliers.update(supplier.id, {
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
          creditLimit: supplier.creditLimit || 0,
          notes: supplier.notes || "",
        });
      },
      () => {
        if (previous)
          setSuppliers((prev) =>
            prev.map((s) => (s.id === supplier.id ? previous : s)),
          );
      },
    );
  };

  const deleteSupplier = (id: string) => {
    const previous = suppliers.find((s) => s.id === id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    void safeDbWrite(
      "supplier.delete",
      async () => {
        await dbService.suppliers.delete(id);
      },
      () => {
        if (previous) setSuppliers((prev) => [...prev, previous]);
      },
    );
  };

  const addCustomer = (customer: Omit<Customer, "id">) => {
    const newId = `c-${Date.now()}`;
    const newCustomer: Customer = { id: newId, ...customer };
    setCustomers((prev) => [...prev, newCustomer]);

    void safeDbWrite(
      "customer.insert",
      async () => {
        await dbService.accountGroups.ensureDefaultGroups(cid);
        await dbService.customers.insert({
          id: newCustomer.id,
          name: newCustomer.name,
          phone: newCustomer.phone || "",
          email: newCustomer.email || "",
          gstin: newCustomer.gstin || "",
          city: newCustomer.city || "",
          state: newCustomer.state || "",
          billingAddress: newCustomer.billingAddress || "",
          shippingAddress: newCustomer.shippingAddress || "",
          openingBalance: newCustomer.previousBalance || 0,
          openingBalanceType: "Dr",
          type: "CUSTOMER",
          groupId: `${cid}__sundry-debtors`,
          creditLimit: newCustomer.creditLimit || 0,
          notes: newCustomer.notes || "",
          companyId: cid,
        });
      },
      () => setCustomers((prev) => prev.filter((c) => c.id !== newId)),
    );
    return newId;
  };

  const updateCustomer = (customer: Customer) => {
    const previous = customers.find((c) => c.id === customer.id);
    setCustomers((prev) =>
      prev.map((c) => (c.id === customer.id ? customer : c)),
    );
    void safeDbWrite(
      "customer.update",
      async () => {
        await dbService.customers.update(customer.id, {
          name: customer.name,
          phone: customer.phone || "",
          email: customer.email || "",
          gstin: customer.gstin || "",
          city: customer.city || "",
          state: customer.state || "",
          billingAddress: customer.billingAddress || "",
          shippingAddress: customer.shippingAddress || "",
          openingBalance: customer.previousBalance || 0,
          creditLimit: customer.creditLimit || 0,
          notes: customer.notes || "",
        });
      },
      () => {
        if (previous)
          setCustomers((prev) =>
            prev.map((c) => (c.id === customer.id ? previous : c)),
          );
      },
    );
  };

  const deleteCustomer = (id: string) => {
    const previous = customers.find((c) => c.id === id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    void safeDbWrite(
      "customer.delete",
      async () => {
        await dbService.customers.delete(id);
      },
      () => {
        if (previous) setCustomers((prev) => [...prev, previous]);
      },
    );
  };

  // ── Caret Transactions ────────────────────────────────────────────────────
  const addCaretTransaction = (
    tx: Omit<CaretTransaction, "id" | "createdAt">,
  ) => {
    const newId = `crt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newTx: CaretTransaction = {
      ...tx,
      id: newId,
      createdAt: new Date().toISOString(),
    };
    setCaretTxList((prev) => [newTx, ...prev]);

    void safeDbWrite(
      "caretTransaction.insert",
      async () => {
        const fyId = await dbService.financialYears.ensureFinancialYear(
          cid,
          activeFY,
          settings?.company?.name,
        );
        await dbService.caretTransactions.insert({
          id: newTx.id,
          companyId: cid,
          financialYearId: fyId,
          ledgerId: newTx.customerId,
          type:
            newTx.type === "RETURN"
              ? ("RETURNED" as const)
              : ("GIVEN" as const),
          quantity: newTx.caretQty,
          date: new Date(newTx.date),
          fruitName: newTx.fruitName || "",
          // flat app columns
          customerIdFlat: newTx.customerId,
          customerName: newTx.customerName,
          caretQty: newTx.caretQty,
          note: newTx.note,
          billId: newTx.billId,
          billNo: newTx.billNo,
        });
      },
      () => setCaretTxList((prev) => prev.filter((t) => t.id !== newTx.id)),
    );
  };

  const updateCaretTransaction = (tx: CaretTransaction) => {
    const previous = caretTxList.find((t) => t.id === tx.id);
    setCaretTxList((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));

    void safeDbWrite(
      "caretTransaction.update",
      async () => {
        await dbService.caretTransactions.update(tx.id, {
          date: new Date(tx.date),
          type:
            tx.type === "RETURN" ? ("RETURNED" as const) : ("GIVEN" as const),
          quantity: tx.caretQty,
          ledgerId: tx.customerId,
          fruitName: tx.fruitName,
          // flat app columns
          customerIdFlat: tx.customerId,
          customerName: tx.customerName,
          caretQty: tx.caretQty,
          note: tx.note,
          billId: tx.billId,
          billNo: tx.billNo,
        });
      },
      () => {
        if (previous)
          setCaretTxList((prev) =>
            prev.map((t) => (t.id === tx.id ? previous : t)),
          );
      },
    );
  };

  const deleteCaretTransaction = (id: string) => {
    const previous = caretTxList.find((t) => t.id === id);
    setCaretTxList((prev) => prev.filter((t) => t.id !== id));
    void safeDbWrite(
      "caretTransaction.delete",
      async () => {
        await dbService.caretTransactions.delete(id);
      },
      () => {
        if (previous) setCaretTxList((prev) => [previous, ...prev]);
      },
    );
  };

  const addFruitVariety = (fruitId: string, varietyName: string) => {
    setFruits((prev) => {
      return prev.map((f) => {
        if (f.id === fruitId && !f.varieties.includes(varietyName)) {
          const updatedVarieties = [...f.varieties, varietyName];
          void safeDbWrite("fruit.updateVarieties", async () => {
            await dbService.fruits.update(fruitId, {
              varieties: JSON.stringify(updatedVarieties),
            });
          });
          return { ...f, varieties: updatedVarieties };
        }
        return f;
      });
    });
  };

  const addFruit = (fruitName: string) => {
    const trimmed = fruitName.trim();
    if (!trimmed) return "";
    const existing = fruits.find(
      (f) => f.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing.id;

    const newId = `f-${Date.now()}`;
    const newFruit: Fruit = {
      id: newId,
      name: trimmed,
      varieties: ["Standard", "Premium"],
    };

    setFruits((prev) => [...prev, newFruit]);
    void safeDbWrite(
      "fruit.insert",
      async () => {
        await dbService.fruits.insert({
          id: newFruit.id,
          name: newFruit.name,
          varieties: JSON.stringify(newFruit.varieties),
          companyId: cid,
        });
      },
      () => setFruits((prev) => prev.filter((f) => f.id !== newId)),
    );
    return newId;
  };

  // ── App Settings ────────────────────────────
  const resetAllData = () => {
    // Uses the Rust company-scoped reset — single IMMEDIATE SQLite transaction,
    // atomic, only touches rows where company_id = cid.
    void safeDbWrite("resetAllData", async () => {
      const { ipc } = await import("@/ipc");
      await ipc.db.resetCompanyData(cid);

      // Also clear the settings keys from SQLite for this company
      await Promise.all([
        dbService.settings.delete(STORAGE_KEYS.settings),
        dbService.settings.delete(STORAGE_KEYS.companies),
        dbService.settings.delete(STORAGE_KEYS.activeCompany),
        dbService.settings.delete(STORAGE_KEYS.activeFY),
      ]);
    });

    // Clear the startup cache from localStorage (config keys only — no business data)
    const configKeys = [
      STORAGE_KEYS.settings,
      STORAGE_KEYS.companies,
      STORAGE_KEYS.activeCompany,
      STORAGE_KEYS.activeFY,
    ];
    configKeys.forEach((k) => localStorage.removeItem(k));

    // Reset in-memory state immediately (optimistic)
    setFruits([]);
    setSuppliers([]);
    setCustomers([]);
    setInvoices([]);
    setPurchaseInvoices([]);
    setPayments([]);
    setCaretTxList([]);
  };

  const getExportData = (): string => {
    return JSON.stringify(
      {
        version: "4.0",
        timestamp: new Date().toISOString(),
        settings,
        fruits,
        suppliers,
        customers,
        invoices,
        purchaseInvoices,
        payments,
      },
      null,
      2,
    );
  };

  const importData = (json: string): boolean => {
    try {
      const data = JSON.parse(json);

      // Update in-memory state immediately
      if (data.fruits) setFruits(data.fruits);
      if (data.suppliers) setSuppliers(data.suppliers);
      if (data.customers) setCustomers(data.customers);
      if (data.invoices) setInvoices(data.invoices);
      if (data.purchaseInvoices) setPurchaseInvoices(data.purchaseInvoices);
      if (data.payments) setPayments(data.payments);
      if (data.settings) {
        updateSettings(data.settings);
      }

      // Persist imported data to SQLite (fire-and-forget, same pattern as all writes)
      void safeDbWrite("importData", async () => {
        const importCid = cid;

        if (data.fruits?.length) {
          await Promise.all(
            (data.fruits as Fruit[]).map((f) =>
              dbService.fruits
                .insert({
                  id: f.id,
                  name: f.name,
                  varieties: JSON.stringify(f.varieties || []),
                  companyId: importCid,
                })
                .catch(() =>
                  dbService.fruits.update(f.id, {
                    name: f.name,
                    varieties: JSON.stringify(f.varieties || []),
                  }),
                ),
            ),
          );
        }

        if (data.suppliers?.length) {
          await dbService.accountGroups.ensureDefaultGroups(importCid);
          await Promise.all(
            (data.suppliers as Supplier[]).map((s) =>
              dbService.suppliers
                .insert({
                  id: s.id,
                  name: s.name,
                  code: s.code || "",
                  phone: s.phone || "",
                  city: s.city || "",
                  openingBalance: s.previousBalance || 0,
                  openingBalanceType: "Cr",
                  type: "SUPPLIER",
                  groupId: `${importCid}__sundry-creditors`,
                  companyId: importCid,
                })
                .catch(() =>
                  dbService.suppliers.update(s.id, {
                    name: s.name,
                    code: s.code || "",
                    phone: s.phone || "",
                    city: s.city || "",
                    openingBalance: s.previousBalance || 0,
                  }),
                ),
            ),
          );
        }

        if (data.customers?.length) {
          await dbService.accountGroups.ensureDefaultGroups(importCid);
          await Promise.all(
            (data.customers as Customer[]).map((c) =>
              dbService.customers
                .insert({
                  id: c.id,
                  name: c.name,
                  phone: c.phone || "",
                  city: c.city || "",
                  openingBalance: c.previousBalance || 0,
                  openingBalanceType: "Dr",
                  type: "CUSTOMER",
                  groupId: `${importCid}__sundry-debtors`,
                  companyId: importCid,
                })
                .catch(() =>
                  dbService.customers.update(c.id, {
                    name: c.name,
                    phone: c.phone || "",
                    city: c.city || "",
                    openingBalance: c.previousBalance || 0,
                  }),
                ),
            ),
          );
        }

        if (data.invoices?.length) {
          const fyId = await dbService.financialYears.ensureFinancialYear(
            importCid,
            activeFY,
            settings?.company?.name,
          );
          await Promise.all(
            (data.invoices as Invoice[]).map((inv) =>
              dbService.invoices
                .insert({
                  id: inv.id,
                  companyId: importCid,
                  financialYearId: fyId,
                  type: "SALE" as const,
                  invoiceNumber: inv.invoiceNo,
                  date: new Date(inv.date),
                  ledgerId: inv.customerId,
                  subTotal: inv.todayAmount || 0,
                  grandTotal: inv.todayAmount || 0,
                  hamali: inv.hamali ?? 0,
                  freight: inv.freight ?? 0,
                  discountTotal: inv.discount ?? 0,
                  paidAmount: inv.paidAmount || 0,
                  notes: inv.notes,
                  status: "FINAL" as const,
                  // flat columns
                  invoiceNo: inv.invoiceNo,
                  customerId: inv.customerId,
                  customerName: inv.customerName,
                  itemsJson: JSON.stringify(inv.items || []),
                  previousBalance: inv.previousBalance || 0,
                  todayAmount: inv.todayAmount || 0,
                  remainingBalance: inv.remainingBalance || 0,
                  discount: inv.discount ?? 0,
                })
                .catch(() => {
                  /* skip duplicates */
                }),
            ),
          );
        }

        if (data.purchaseInvoices?.length) {
          const fyId = await dbService.financialYears.ensureFinancialYear(
            importCid,
            activeFY,
            settings?.company?.name,
          );
          await Promise.all(
            (data.purchaseInvoices as PurchaseInvoice[]).map((inv) =>
              dbService.purchaseInvoices
                .insert({
                  id: inv.id,
                  companyId: importCid,
                  financialYearId: fyId,
                  type: "PURCHASE" as const,
                  invoiceNumber: inv.billNo,
                  date: new Date(inv.date),
                  ledgerId: inv.supplierId,
                  subTotal: inv.todayAmount || 0,
                  grandTotal: inv.todayAmount || 0,
                  hamali: inv.hamali ?? 0,
                  freight: inv.freight ?? 0,
                  paidAmount: inv.paidAmount || 0,
                  notes: inv.notes,
                  status: "FINAL" as const,
                  // flat columns
                  billNo: inv.billNo,
                  supplierId: inv.supplierId,
                  supplierName: inv.supplierName,
                  itemsJson: JSON.stringify(inv.items || []),
                  previousBalance: inv.previousBalance || 0,
                  todayAmount: inv.todayAmount || 0,
                  remainingBalance: inv.remainingBalance || 0,
                })
                .catch(() => {
                  /* skip duplicates */
                }),
            ),
          );
        }

        if (data.payments?.length) {
          const fyId = await dbService.financialYears.ensureFinancialYear(
            importCid,
            activeFY,
            settings?.company?.name,
          );
          await dbService.accountGroups.ensureDefaultGroups(importCid);
          const cashLedgerId =
            await dbService.payments.ensureCashLedger(importCid);
          await Promise.all(
            (data.payments as PaymentReceipt[]).map((p) =>
              dbService.payments
                .insert({
                  id: p.id,
                  companyId: importCid,
                  financialYearId: fyId,
                  type:
                    p.partyType === "SUPPLIER"
                      ? ("PAYMENT" as const)
                      : ("RECEIPT" as const),
                  voucherNumber: `PMT-${p.id}`,
                  date: new Date(p.date),
                  ledgerId: p.partyId,
                  offsetLedgerId: cashLedgerId,
                  amount: p.amount,
                  paymentMode: p.paymentMode,
                  referenceNo: p.referenceNo,
                  narration: p.notes,
                  // flat columns
                  partyType: p.partyType,
                  partyId: p.partyId,
                  partyName: p.partyName,
                  paymentNotes: p.notes,
                })
                .catch(() => {
                  /* skip duplicates */
                }),
            ),
          );
        }
      });

      return true;
    } catch {
      return false;
    }
  };

  // ── Financial Year ──────────────────────────
  // fyOptions is derived from the ACTIVE COMPANY's financialYearStart, not global settings.
  // This ensures switching companies also updates the available FY options.
  const fyStartMD = useMemo(() => {
    const activeCompany = companies.find((c) => c.id === activeCompanyId);
    return (
      activeCompany?.financial?.financialYearStart ??
      settings?.financial?.financialYearStart ??
      "04-01"
    ); // MM-DD
  }, [companies, activeCompanyId, settings?.financial?.financialYearStart]);

  const fyOptions = useMemo(() => {
    const years: string[] = [];
    const now = new Date();
    const [sm] = fyStartMD.split("-").map(Number);
    const curYear = now.getFullYear();
    const base = now.getMonth() + 1 >= sm ? curYear : curYear - 1;
    for (let y = base; y >= base - 4; y--) {
      years.push(`${y}-${String(y + 1).slice(-2)}`);
    }
    return years;
  }, [fyStartMD]);

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        fruits,
        suppliers,
        customers,
        invoices,
        purchaseInvoices,
        payments,
        inventory,
        stockMovements,
        getSupplierLedger,
        getCustomerLedger,
        saveInvoice,
        deleteInvoice,
        savePurchaseInvoice,
        deletePurchaseInvoice,
        savePayment,
        addPayment,
        deletePayment,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addFruitVariety,
        addFruit,
        settings,
        updateSettings,
        resetAllData,
        importData,
        getExportData,
        activeFY,
        setActiveFY,
        fyOptions,
        companies,
        activeCompanyId,
        addCompany,
        updateCompany,
        deleteCompany,
        switchCompany,
        caretTransactions: caretTxList,
        addCaretTransaction,
        updateCaretTransaction,
        deleteCaretTransaction,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
