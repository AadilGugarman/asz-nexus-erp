import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Fruit, Supplier, Customer, VehicleArrival, Invoice, PurchaseInvoice, InventoryItem, StockMovement, SupplierLedgerEntry, CustomerLedgerEntry, PaymentReceipt, ThemeMode, AppSettings, CompanyProfile } from '../types';
import { INITIAL_FRUITS, INITIAL_SUPPLIERS, INITIAL_CUSTOMERS, INITIAL_VEHICLE_ARRIVALS, INITIAL_INVOICES } from '../mockData';
import { useAppearanceStore } from '@/store/appearance.store';
import { useSettingsStore } from '@/store/settings.store';

interface AppContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  fruits: Fruit[];
  suppliers: Supplier[];
  customers: Customer[];
  vehicles: VehicleArrival[];
  invoices: Invoice[];
  purchaseInvoices: PurchaseInvoice[];
  payments: PaymentReceipt[];
  inventory: InventoryItem[];
  stockMovements: StockMovement[];
  getSupplierLedger: (supplierId: string) => SupplierLedgerEntry[];
  getCustomerLedger: (customerId: string) => CustomerLedgerEntry[];
  saveVehicleArrival: (arrival: VehicleArrival) => void;
  deleteVehicleArrival: (id: string) => void;
  saveInvoice: (invoice: Invoice) => void;
  deleteInvoice: (id: string) => void;
  savePurchaseInvoice: (invoice: PurchaseInvoice) => void;
  deletePurchaseInvoice: (id: string) => void;
  addPayment: (payment: PaymentReceipt) => void;
  deletePayment: (id: string) => void;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (supplier: Supplier) => void;
  deleteSupplier: (id: string) => void;
  addCustomer: (customer: Omit<Customer, 'id'>) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
  addFruitVariety: (fruitId: string, varietyName: string) => void;
  addFruit: (fruitName: string) => void;
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  resetAllData: () => void;
  importData: (json: string) => boolean;
  activeFY: string;
  setActiveFY: (fy: string) => void;
  fyOptions: string[];
  getExportData: () => string;
  companies: CompanyProfile[];
  activeCompanyId: string;
  addCompany: (profile: CompanyProfile) => void;
  updateCompany: (profile: CompanyProfile) => void;
  deleteCompany: (id: string) => void;
  switchCompany: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useAppearanceStore((s) => s.resolvedTheme) as ThemeMode;
  const toggleTheme = useAppearanceStore((s) => s.toggleTheme);

  const [fruits, setFruits] = useState<Fruit[]>(() => {
    const saved = localStorage.getItem('apex_fruits');
    return saved ? JSON.parse(saved) : INITIAL_FRUITS;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('apex_suppliers');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('apex_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [vehicles, setVehicles] = useState<VehicleArrival[]>(() => {
    const saved = localStorage.getItem('apex_vehicles');
    return saved ? JSON.parse(saved) : INITIAL_VEHICLE_ARRIVALS;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem('apex_invoices');
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });

  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>(() => {
    const saved = localStorage.getItem('apex_purchase_invoices');
    if (saved) return JSON.parse(saved);
    // Mock initial purchase invoice
    return [
      {
        id: 'pinv-1',
        billNo: 'PUR-2026-001',
        date: '2026-05-13',
        supplierId: 's2',
        supplierName: 'Suresh Patel Orchards (Navsari)',
        previousBalance: 120000,
        todayAmount: 52000,
        freight: 1500,
        hamali: 500,
        paidAmount: 20000,
        remainingBalance: 152000, // 120000 + 52000 - 20000
        notes: 'Direct orchard delivery bill',
        createdAt: '2026-05-13T09:00:00.000Z',
        items: [
          { id: 'pi1', fruit: 'Mango', variety: 'Kesar', caret: 40, weight: 800, rate: 65, amount: 52000 }
        ]
      }
    ];
  });

  const [payments, setPayments] = useState<PaymentReceipt[]>(() => {
    const saved = localStorage.getItem('apex_payments');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'p1', date: '2026-05-13', partyType: 'SUPPLIER', partyId: 's1', partyName: 'Ramesh Agro Traders (Valsad)', amount: 40000, paymentMode: 'BANK_TRANSFER', referenceNo: 'NEFT-8839201', notes: 'Advance payment for season' },
      { id: 'p2', date: '2026-05-14', partyType: 'CUSTOMER', partyId: 'c1', partyName: 'Metro Fresh Supermarkets', amount: 50000, paymentMode: 'CHEQUE', referenceNo: 'CHQ-009123', notes: 'Invoice payment clearance' },
      { id: 'p3', date: '2026-05-15', partyType: 'CUSTOMER', partyId: 'c3', partyName: 'APMC Wholesaler - Omkar Traders', amount: 150000, paymentMode: 'UPI', referenceNo: 'UPI-61352219', notes: 'Immediate settlement' }
    ];
  });

  useEffect(() => { localStorage.setItem('apex_fruits', JSON.stringify(fruits)); }, [fruits]);
  useEffect(() => { localStorage.setItem('apex_suppliers', JSON.stringify(suppliers)); }, [suppliers]);
  useEffect(() => { localStorage.setItem('apex_customers', JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem('apex_vehicles', JSON.stringify(vehicles)); }, [vehicles]);
  useEffect(() => { localStorage.setItem('apex_invoices', JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem('apex_purchase_invoices', JSON.stringify(purchaseInvoices)); }, [purchaseInvoices]);
  useEffect(() => { localStorage.setItem('apex_payments', JSON.stringify(payments)); }, [payments]);

  // ── Settings & Companies — delegated to useSettingsStore (SQLite-backed) ────
  const settings        = useSettingsStore((s) => s.settings);
  const updateSettings  = useSettingsStore((s) => s.updateSettings);
  const companies       = useSettingsStore((s) => s.companies);
  const activeCompanyId = useSettingsStore((s) => s.activeCompanyId);
  const addCompany      = useSettingsStore((s) => s.addCompany);
  const updateCompany   = useSettingsStore((s) => s.updateCompany);
  const deleteCompany   = useSettingsStore((s) => s.deleteCompany);
  const switchCompany   = useSettingsStore((s) => s.switchCompany);

  // Auto-calculated Inventory & Stock Movements
  const { inventory, stockMovements } = useMemo(() => {
    const itemsMap = new Map<string, InventoryItem>();
    const movements: StockMovement[] = [];

    // Process Vehicle Arrivals (Stock IN)
    vehicles.filter(v => v.status === 'SAVED').forEach(v => {
      v.rows.forEach(r => {
        const key = `${v.fruitType}_${r.variety}`;
        const current = itemsMap.get(key) || { key, fruit: v.fruitType, variety: r.variety, totalWeight: 0, totalCarets: 0 };
        current.totalWeight += Number(r.weight) || 0;
        current.totalCarets += Number(r.caret) || 0;
        itemsMap.set(key, current);

        movements.push({
          id: `arr-${v.id}-${r.id}`,
          date: v.date,
          fruit: v.fruitType,
          variety: r.variety,
          type: 'ARRIVAL',
          reference: `Veh Inward: ${v.vehicleNo} (${r.supplierName})`,
          weightChange: Number(r.weight) || 0,
          caretChange: Number(r.caret) || 0,
          resultingWeight: current.totalWeight,
          resultingCarets: current.totalCarets
        });
      });
    });

    // Process Purchase Invoices (Stock IN)
    purchaseInvoices.forEach(inv => {
      inv.items.forEach(item => {
        const key = `${item.fruit}_${item.variety}`;
        const current = itemsMap.get(key) || { key, fruit: item.fruit, variety: item.variety, totalWeight: 0, totalCarets: 0 };
        current.totalWeight += Number(item.weight) || 0;
        current.totalCarets += Number(item.caret) || 0;
        itemsMap.set(key, current);

        movements.push({
          id: `pinv-${inv.id}-${item.id}`,
          date: inv.date,
          fruit: item.fruit,
          variety: item.variety,
          type: 'PURCHASE_BILL',
          reference: `Pur Bill: ${inv.billNo} (${inv.supplierName})`,
          weightChange: Number(item.weight) || 0,
          caretChange: Number(item.caret) || 0,
          resultingWeight: current.totalWeight,
          resultingCarets: current.totalCarets
        });
      });
    });

    // Process Sales Invoices (Stock OUT)
    invoices.forEach(inv => {
      inv.items.forEach(item => {
        const key = `${item.fruit}_${item.lotVariety}`;
        const current = itemsMap.get(key) || { key, fruit: item.fruit, variety: item.lotVariety, totalWeight: 0, totalCarets: 0 };
        current.totalWeight -= Number(item.weight) || 0;
        current.totalCarets -= Number(item.caret) || 0;
        itemsMap.set(key, current);

        movements.push({
          id: `sale-${inv.id}-${item.id}`,
          date: inv.date,
          fruit: item.fruit,
          variety: item.lotVariety,
          type: 'SALE',
          reference: `Inv: ${inv.invoiceNo} (${inv.customerName})`,
          weightChange: -(Number(item.weight) || 0),
          caretChange: -(Number(item.caret) || 0),
          resultingWeight: current.totalWeight,
          resultingCarets: current.totalCarets
        });
      });
    });

    movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { inventory: Array.from(itemsMap.values()), stockMovements: movements };
  }, [vehicles, purchaseInvoices, invoices]);

  // Supplier Ledger Calculation
  const getSupplierLedger = (supplierId: string): SupplierLedgerEntry[] => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return [];

    const entries: SupplierLedgerEntry[] = [];
    let runningBalance = supplier.previousBalance;

    entries.push({
      id: 'opening',
      supplierId,
      date: '2026-05-01',
      type: 'OPENING',
      amount: supplier.previousBalance,
      note: 'Opening Balance',
      runningBalance
    });

    const purchaseEntries: SupplierLedgerEntry[] = [];
    vehicles.filter(v => v.status === 'SAVED').forEach(v => {
      v.rows.filter(r => r.supplierId === supplierId).forEach(r => {
        purchaseEntries.push({
          id: `p-${v.id}-${r.id}`,
          supplierId,
          date: v.date,
          type: 'PURCHASE_VEHICLE',
          referenceId: v.id,
          referenceNo: v.vehicleNo,
          variety: `${v.fruitType} - ${r.variety}`,
          weightKg: r.weight,
          rate: r.rate,
          amount: r.amount,
          note: r.note || `Inward Load ${v.arrivalNo}`,
          runningBalance: 0
        });
      });
    });

    purchaseInvoices.filter(i => i.supplierId === supplierId).forEach(inv => {
      purchaseEntries.push({
        id: `pinv-${inv.id}`,
        supplierId,
        date: inv.date,
        type: 'PURCHASE_BILL',
        referenceId: inv.id,
        referenceNo: inv.billNo,
        variety: `Purchase Bill (${inv.items.length} items)`,
        amount: inv.todayAmount,
        note: inv.notes,
        runningBalance: 0
      });

      if (inv.paidAmount > 0) {
        purchaseEntries.push({
          id: `pinv-pay-${inv.id}`,
          supplierId,
          date: inv.date,
          type: 'PAYMENT',
          referenceId: inv.id,
          referenceNo: inv.billNo,
          amount: -inv.paidAmount,
          note: `Immediate cash/bank payment on Purchase Bill ${inv.billNo}`,
          runningBalance: 0
        });
      }
    });

    const paymentEntries: SupplierLedgerEntry[] = [];
    payments.filter(p => p.partyType === 'SUPPLIER' && p.partyId === supplierId).forEach(p => {
      paymentEntries.push({
        id: `pay-${p.id}`,
        supplierId,
        date: p.date,
        type: 'PAYMENT',
        amount: -p.amount,
        note: `Paid via ${p.paymentMode} ${p.referenceNo ? `(${p.referenceNo})` : ''} - ${p.notes || ''}`,
        runningBalance: 0
      });
    });

    const combined = [...purchaseEntries, ...paymentEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    combined.forEach(entry => {
      runningBalance += entry.amount;
      entry.runningBalance = runningBalance;
      entries.push(entry);
    });

    return entries.reverse();
  };

  const getCustomerLedger = (customerId: string): CustomerLedgerEntry[] => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return [];

    const entries: CustomerLedgerEntry[] = [];
    let runningBalance = customer.previousBalance;

    entries.push({
      id: 'opening',
      customerId,
      date: '2026-05-01',
      type: 'OPENING',
      amount: customer.previousBalance,
      note: 'Opening Balance',
      runningBalance
    });

    const invEntries: CustomerLedgerEntry[] = [];
    invoices.filter(i => i.customerId === customerId).forEach(inv => {
      invEntries.push({
        id: `inv-${inv.id}`,
        customerId,
        date: inv.date,
        type: 'INVOICE',
        referenceId: inv.id,
        referenceNo: inv.invoiceNo,
        amount: inv.todayAmount,
        note: `Invoice total for ${inv.items.length} items. ${inv.notes || ''}`,
        runningBalance: 0
      });

      if (inv.paidAmount > 0) {
        invEntries.push({
          id: `inv-pay-${inv.id}`,
          customerId,
          date: inv.date,
          type: 'PAYMENT',
          referenceId: inv.id,
          referenceNo: inv.invoiceNo,
          amount: -inv.paidAmount,
          note: `Immediate payment received on Invoice ${inv.invoiceNo}`,
          runningBalance: 0
        });
      }
    });

    const paymentEntries: CustomerLedgerEntry[] = [];
    payments.filter(p => p.partyType === 'CUSTOMER' && p.partyId === customerId).forEach(p => {
      paymentEntries.push({
        id: `pay-${p.id}`,
        customerId,
        date: p.date,
        type: 'PAYMENT',
        amount: -p.amount,
        note: `Received via ${p.paymentMode} ${p.referenceNo ? `(${p.referenceNo})` : ''} - ${p.notes || ''}`,
        runningBalance: 0
      });
    });

    const combined = [...invEntries, ...paymentEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    combined.forEach(entry => {
      runningBalance += entry.amount;
      entry.runningBalance = runningBalance;
      entries.push(entry);
    });

    return entries.reverse();
  };

  const saveVehicleArrival = (newArrival: VehicleArrival) => {
    setVehicles(prev => {
      const exists = prev.findIndex(v => v.id === newArrival.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = newArrival;
        return updated;
      }
      return [newArrival, ...prev];
    });
  };

  const deleteVehicleArrival = (id: string) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
  };

  const saveInvoice = (newInvoice: Invoice) => {
    setInvoices(prev => {
      const exists = prev.findIndex(i => i.id === newInvoice.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = newInvoice;
        return updated;
      }
      return [newInvoice, ...prev];
    });
  };

  const deleteInvoice = (id: string) => {
    setInvoices(prev => prev.filter(i => i.id !== id));
  };

  const savePurchaseInvoice = (newInvoice: PurchaseInvoice) => {
    setPurchaseInvoices(prev => {
      const exists = prev.findIndex(i => i.id === newInvoice.id);
      if (exists >= 0) {
        const updated = [...prev];
        updated[exists] = newInvoice;
        return updated;
      }
      return [newInvoice, ...prev];
    });
  };

  const deletePurchaseInvoice = (id: string) => {
    setPurchaseInvoices(prev => prev.filter(i => i.id !== id));
  };

  const addPayment = (payment: PaymentReceipt) => {
    setPayments(prev => [payment, ...prev]);
  };

  const deletePayment = (id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const addSupplier = (supplier: Omit<Supplier, 'id'>) => {
    const newId = `s-${Date.now()}`;
    setSuppliers(prev => [...prev, { id: newId, ...supplier }]);
  };
  const updateSupplier = (supplier: Supplier) => {
    setSuppliers(prev => prev.map(s => s.id === supplier.id ? supplier : s));
  };
  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
  };

  const addCustomer = (customer: Omit<Customer, 'id'>) => {
    const newId = `c-${Date.now()}`;
    setCustomers(prev => [...prev, { id: newId, ...customer }]);
  };
  const updateCustomer = (customer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
  };
  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const addFruitVariety = (fruitId: string, varietyName: string) => {
    setFruits(prev => prev.map(f => {
      if (f.id === fruitId && !f.varieties.includes(varietyName)) {
        return { ...f, varieties: [...f.varieties, varietyName] };
      }
      return f;
    }));
  };

  const addFruit = (fruitName: string) => {
    const trimmed = fruitName.trim();
    if (!trimmed) return;
    setFruits(prev => {
      if (prev.some(f => f.name.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, { id: `f-${Date.now()}`, name: trimmed, varieties: ['Standard', 'Premium'] }];
    });
  };

  // ── App Settings ────────────────────────────
  const resetAllData = () => {
    const keys = ['apex_fruits','apex_suppliers','apex_customers','apex_vehicles','apex_invoices','apex_purchase_invoices','apex_payments','apex_settings','apex_companies','apex_active_company','apex_appearance','apex_theme','apex_fontsize','apex_compact','apex_accent','apex_lang','apex_lowstock','apex_anims'];
    keys.forEach(k => localStorage.removeItem(k));
    setFruits(INITIAL_FRUITS);
    setSuppliers(INITIAL_SUPPLIERS);
    setCustomers(INITIAL_CUSTOMERS);
    setVehicles(INITIAL_VEHICLE_ARRIVALS);
    setInvoices(INITIAL_INVOICES);
    setPurchaseInvoices([]);
    setPayments([]);
  };

  const getExportData = (): string => {
    return JSON.stringify({ version: '4.0', timestamp: new Date().toISOString(), settings, fruits, suppliers, customers, vehicles, invoices, purchaseInvoices, payments }, null, 2);
  };

  const importData = (json: string): boolean => {
    try {
      const data = JSON.parse(json);
      if (data.fruits) setFruits(data.fruits);
      if (data.suppliers) setSuppliers(data.suppliers);
      if (data.customers) setCustomers(data.customers);
      if (data.vehicles) setVehicles(data.vehicles);
      if (data.invoices) setInvoices(data.invoices);
      if (data.purchaseInvoices) setPurchaseInvoices(data.purchaseInvoices);
      if (data.payments) setPayments(data.payments);
      if (data.settings) {
        updateSettings(data.settings);
      }
      return true;
    } catch { return false; }
  };

  // ── Financial Year ──────────────────────────
  const fyStartMD = settings.financial.financialYearStart || '04-01'; // MM-DD
  const fyOptions = useMemo(() => {
    const years: string[] = [];
    const now = new Date();
    const [sm] = fyStartMD.split('-').map(Number);
    const curYear = now.getFullYear();
    const base = now.getMonth() + 1 >= sm ? curYear : curYear - 1;
    for (let y = base; y >= base - 4; y--) {
      years.push(`${y}-${String(y + 1).slice(-2)}`);
    }
    return years;
  }, [fyStartMD]);

  const [activeFY, setActiveFY] = useState<string>(() => {
    const saved = localStorage.getItem('apex_active_fy');
    return saved || fyOptions[0] || '';
  });

  useEffect(() => { localStorage.setItem('apex_active_fy', activeFY); }, [activeFY]);

  return (
    <AppContext.Provider value={{
      theme,
      toggleTheme,
      fruits,
      suppliers,
      customers,
      vehicles,
      invoices,
      purchaseInvoices,
      payments,
      inventory,
      stockMovements,
      getSupplierLedger,
      getCustomerLedger,
      saveVehicleArrival,
      deleteVehicleArrival,
      saveInvoice,
      deleteInvoice,
      savePurchaseInvoice,
      deletePurchaseInvoice,
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
      switchCompany
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
