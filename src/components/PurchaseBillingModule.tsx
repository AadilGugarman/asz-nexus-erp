import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  ShoppingBag,
  Plus,
  Save,
  Search,
  Eye,
  Trash2,
  Edit2,
  FileText,
  Copy,
  ArrowUpDown,
  Calculator,
} from "lucide-react";

import { useApp } from "@/context/useApp";
import { useDataTable } from "../hooks/useDataTable";
import { useAppTranslation } from "@/hooks";

import { CommandSelect, CommandOption } from "./ui/CommandSelect";
import { DatePicker } from "./ui/DatePicker";
import { useToast } from "./ui/Toast";
import { useConfirmDialog } from "./ui/ConfirmDialog";
import { QuickAddPartyModal } from "./ui/QuickAddPartyModal";
import { ModuleEmptyState, TableSkeleton } from "./ui/DataStates";
import { DataTable, Pagination } from "./ui/table";
import { PurchasePreviewModal } from "./PurchasePreviewModal";

import { PurchaseInvoice, PurchaseInvoiceItem } from "../types";
import {
  fmtDate,
  sumCurrency,
  roundCurrency,
  getFruitPricingType,
  calcItemAmount,
} from "@/utils/format";
import { getNextUniquePurchaseNumber } from "../utils/invoice-number";

//        helpers
// formatDateWithDay is now fmtDateWithDay from utils/format

function makeBlankItem(
  fruits: { name: string; varieties: string[]; pricingType?: "kg" | "caret" }[],
): PurchaseInvoiceItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    fruitCategory: "",
    fruit: "",
    variety: "",
    caret: 0,
    weight: 0,
    rate: 0,
    amount: 0,
    rowNote: "",
    pricingType: "caret",
  };
}

//        shared style tokens
const card =
  "dark:bg-slate-900 bg-white rounded-2xl border dark:border-slate-800 border-slate-200/80 shadow-sm";
const hdr =
  "dark:bg-slate-950 bg-slate-50/80 border-b dark:border-slate-800 border-slate-200/80";
const inp =
  "dark:bg-slate-950 bg-white border dark:border-slate-700/80 border-slate-200 dark:text-white text-slate-900 rounded-lg outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10";
const muted = "dark:text-slate-400 text-slate-500";
const label = "dark:text-slate-400 text-slate-600";

const FRUIT_EMOJIS: Record<string, string> = {
  mango: "🥭",
  apple: "🍎",
  banana: "🍌",
  pomegranate: "🫐",
  grapes: "🍇",
  citrus: "🍊",
  watermelon: "🍉",
  orange: "🍊",
  lemon: "🍋",
  pineapple: "🍍",
  strawberry: "🍓",
  cherry: "🍒",
  peach: "🍑",
  pear: "🍐",
  kiwi: "🥝",
  coconut: "🥥",
  papaya: "🥭",
  guava: "🥝",
  fig: "🫐",
  plum: "🫐",
};

const getEmoji = (name: string): string => {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(FRUIT_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return "🍃";
};

export const PurchaseBillingModule: React.FC = () => {
  const {
    suppliers,
    fruits,
    purchaseInvoices,
    savePurchaseInvoice,
    deletePurchaseInvoice,
    addFruit,
    addFruitVariety,
    addSupplier,
    settings,
    updateSettings,
    activeFY,
    companies,
    activeCompanyId,
  } = useApp();
  const { t } = useAppTranslation("billing");
  const toast = useToast();
  const dialog = useConfirmDialog();

  // Derive FY start month from active company
  const fyStartMonth = useMemo(() => {
    const activeCompany = companies.find((c) => c.id === activeCompanyId);
    const fyStartMD =
      activeCompany?.financial?.financialYearStart ??
      settings?.financial?.financialYearStart ??
      "04-01";
    return parseInt(fyStartMD.split("-")[0], 10) || 4;
  }, [companies, activeCompanyId, settings?.financial?.financialYearStart]);

  // FY date range for list filtering
  const { fyStartDate, fyEndDate } = useMemo(() => {
    const [startYearStr] = (activeFY ?? "").split("-");
    const startYear = parseInt(startYearStr, 10) || new Date().getFullYear();
    const endMonth = fyStartMonth === 1 ? 12 : fyStartMonth - 1;
    const endYear = fyStartMonth === 1 ? startYear : startYear + 1;
    const lastDay = new Date(endYear, endMonth, 0).getDate();
    const p = (n: number) => String(n).padStart(2, "0");
    return {
      fyStartDate: `${startYear}-${p(fyStartMonth)}-01`,
      fyEndDate: `${endYear}-${p(endMonth)}-${lastDay}`,
    };
  }, [activeFY, fyStartMonth]);

  const [activeSubTab, setActiveSubTab] = useState<"NEW_INVOICE" | "LIST">(
    "NEW_INVOICE",
  );
  const [previewInvoice, setPreviewInvoice] = useState<PurchaseInvoice | null>(
    null,
  );
  const [isListLoading, setIsListLoading] = useState(false);
  const [showCharges, setShowCharges] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddName, setQuickAddName] = useState("");

  //        form state
  const [billNo, setBillNo] = useState(() => {
    const next = getNextUniquePurchaseNumber(
      settings.invoice,
      purchaseInvoices,
      new Date().toISOString().split("T")[0],
      settings.invoice.purchaseNextNo || 101,
    );
    return next.invoiceNo;
  });

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [declaredWeight, setDeclaredWeight] = useState<number>(0);
  const [freightInput, setFreightInput] = useState<number>(0);
  const [hamaliInput, setHamaliInput] = useState<number>(0);
  const [items, setItems] = useState<PurchaseInvoiceItem[]>(() => [
    makeBlankItem(fruits),
  ]);

  const supplierOptions: CommandOption[] = useMemo(() => {
    return suppliers.map((s) => ({
      id: s.id,
      label: s.name,
      subtitle: s.phone ? `${s.phone} • ${s.city}` : s.city,
      emoji: "🏢",
    }));
  }, [suppliers]);

  const fruitOptions: CommandOption[] = useMemo(() => {
    return fruits.map((f) => ({
      id: f.id,
      label: f.name,
      subtitle: `${f.varieties.length} varieties`,
      emoji: getEmoji(f.name),
    }));
  }, [fruits]);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierId),
    [selectedSupplierId, suppliers],
  );

  // Auto-update bill number when date or purchaseInvoices change
  useEffect(() => {
    const next = getNextUniquePurchaseNumber(
      settings.invoice,
      purchaseInvoices,
      date,
      settings.invoice.purchaseNextNo || 101,
      activeFY,
      fyStartMonth,
    );
    setBillNo(next.invoiceNo);
  }, [
    date,
    purchaseInvoices.length,
    settings.invoice.purchaseNextNo,
    activeFY,
    fyStartMonth,
  ]);

  //        calculations
  const itemsSubtotal = sumCurrency(
    items.map((it) => parseFloat(String(it.amount)) || 0),
  );
  const freight = roundCurrency(parseFloat(String(freightInput)) || 0);
  const hamali = roundCurrency(parseFloat(String(hamaliInput)) || 0);
  const todayAmount = roundCurrency(itemsSubtotal + freight + hamali);
  const previousBalance = selectedSupplier?.previousBalance ?? 0;
  const remainingBalance = roundCurrency(previousBalance + todayAmount);
  const totalCarets = items.reduce(
    (s, it) => s + (parseFloat(String(it.caret)) || 0),
    0,
  );
  const totalWeight = sumCurrency(
    items.map((it) => parseFloat(String(it.weight)) || 0),
  );

  //        item helpers
  const handleItemChange = (
    index: number,
    field: keyof PurchaseInvoiceItem,
    value: any,
  ) => {
    const updated = [...items];
    const item = { ...updated[index] };
    if (field === "fruitCategory") {
      item.fruitCategory = value;
      item.fruit = value;
      const fObj = fruits.find((f) => f.name === value);
      item.variety = fObj?.varieties[0] || "Standard";
      // Update pricing type when fruit changes
      item.pricingType = getFruitPricingType(value, fObj?.pricingType);
      // Recalculate amount with new pricing type
      const w = parseFloat(String(item.weight)) || 0;
      const c = parseFloat(String(item.caret)) || 0;
      const r = parseFloat(String(item.rate)) || 0;
      item.amount = calcItemAmount(item.pricingType, w, c, r);
    } else if (field === "caret" || field === "weight" || field === "rate") {
      (item as any)[field] = value;
      const pricingType =
        item.pricingType ??
        getFruitPricingType(item.fruitCategory || item.fruit || "");
      const w =
        field === "weight"
          ? parseFloat(value) || 0
          : parseFloat(String(item.weight)) || 0;
      const c =
        field === "caret"
          ? parseFloat(value) || 0
          : parseFloat(String(item.caret)) || 0;
      const r =
        field === "rate"
          ? parseFloat(value) || 0
          : parseFloat(String(item.rate)) || 0;
      item.amount = calcItemAmount(pricingType, w, c, r);
    } else {
      (item as any)[field] = value;
    }
    updated[index] = item;
    setItems(updated);
  };

  const addItemRow = () => setItems((prev) => [...prev, makeBlankItem(fruits)]);

  const duplicateItemRow = (i: number) => {
    const src = items[i];
    if (!src) return;
    const dup: PurchaseInvoiceItem = {
      ...src,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const u = [...items];
    u.splice(i + 1, 0, dup);
    setItems(u);
  };

  const removeItemRow = (i: number) => {
    if (items.length > 1) setItems(items.filter((_, idx) => idx !== i));
  };

  //        keyboard nav
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    row: number | string,
    col: number,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (typeof row === "string" && row.startsWith("header")) {
        // Navigation within header
        const headerOrder = [
          "header-billno",
          "header-date",
          "header-supplier",
          "header-vehicle",
          "header-weight",
        ];
        const currentIndex = headerOrder.indexOf(row);
        if (currentIndex !== -1 && currentIndex < headerOrder.length - 1) {
          focusCellByName(headerOrder[currentIndex + 1]);
        } else {
          // Go to first row of table
          focusCell(0, 0);
        }
      } else if (typeof row === "number") {
        // If we are in the first column (Fruit) and it's empty, move to save
        if (col === 0 && !items[row].fruitCategory) {
          const saveBtn = document.querySelector(
            '[data-pinv-cell="save-button"]',
          ) as HTMLElement;
          saveBtn?.focus();
          return;
        }
        focusCell(row, col + 1);
      }
    } else if (e.key === "ArrowUp" && typeof row === "number") {
      focusCell(row - 1, col);
    } else if (e.key === "ArrowDown" && typeof row === "number") {
      focusCell(row + 1, col);
    } else if (e.altKey && e.key.toLowerCase() === "a") {
      e.preventDefault();
      addItemRow();
    } else if (e.altKey && e.key.toLowerCase() === "d") {
      e.preventDefault();
      duplicateItemRow(row as number);
    }
  };

  const focusCellByName = (name: string) => {
    const el = document.querySelector(
      `[data-pinv-cell="${name}"]`,
    ) as HTMLElement;
    if (el) {
      el.focus();
      return true;
    }
    return false;
  };

  const focusCell = (row: number, col: number) => {
    const next = document.querySelector(
      `[data-pinv-cell="${row}-${col}"]`,
    ) as HTMLElement;
    if (next) {
      next.focus();
      return true;
    }
    // If it's the last column of the row and we try to go next, add row
    if (col > 4) {
      addItemRow();
      setTimeout(() => focusCell(row + 1, 0), 50);
      return true;
    }
    return false;
  };

  //        reset / save
  const handleResetForm = () => {
    setEditingInvoiceId(null);
    const next = getNextUniquePurchaseNumber(
      settings.invoice,
      purchaseInvoices,
      date,
      settings.invoice.purchaseNextNo || 101,
      activeFY,
      fyStartMonth,
    );
    setBillNo(next.invoiceNo);
    setSelectedSupplierId("");
    setItems([makeBlankItem(fruits)]);
    setVehicleNo("");
    setDeclaredWeight(0);
    setFreightInput(0);
    setHamaliInput(0);
    setNotes("");
  };

  const handleEditInvoice = (inv: PurchaseInvoice) => {
    setEditingInvoiceId(inv.id);
    setBillNo(inv.billNo);
    setDate(inv.date);
    setSelectedSupplierId(inv.supplierId);
    setNotes(inv.notes || "");
    setVehicleNo(inv.vehicleNo || "");
    setDeclaredWeight(inv.declaredWeight || 0);
    setFreightInput(inv.freight || 0);
    setHamaliInput(inv.hamali || 0);
    setItems(inv.items.length > 0 ? inv.items : [makeBlankItem(fruits)]);
    setActiveSubTab("NEW_INVOICE");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveInvoice = () => {
    if (!selectedSupplier) {
      toast.error("No Supplier", "Please select a supplier.");
      return;
    }
    if (itemsSubtotal <= 0) {
      toast.warning("Empty Bill", "Add at least one item with a value.");
      return;
    }

    let resolvedNo = billNo.trim();
    let nextSeed = settings.invoice.purchaseNextNo || 101;

    if (!resolvedNo) {
      toast.error("Missing Bill No", "Enter a bill number.");
      return;
    }

    // Duplicate check
    if (
      !editingInvoiceId &&
      purchaseInvoices.some((i) => i.billNo === resolvedNo)
    ) {
      // Auto-resolve by bumping the seed
      const next = getNextUniquePurchaseNumber(
        settings.invoice,
        purchaseInvoices,
        date,
        nextSeed,
        activeFY,
        fyStartMonth,
      );
      resolvedNo = next.invoiceNo;
      nextSeed = next.nextSeed;
    } else if (!editingInvoiceId) {
      nextSeed = nextSeed + 1;
    }

    const inv: PurchaseInvoice = {
      id: editingInvoiceId || `pinv-${Date.now()}`,
      billNo: resolvedNo,
      date,
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      vehicleNo: vehicleNo || undefined,
      declaredWeight: declaredWeight || undefined,
      previousBalance,
      todayAmount,
      freight: freight || undefined,
      hamali: hamali || undefined,
      paidAmount: 0,
      remainingBalance,
      notes: notes || undefined,
      items,
      createdAt: editingInvoiceId
        ? purchaseInvoices.find((i) => i.id === editingInvoiceId)?.createdAt ||
          new Date().toISOString()
        : new Date().toISOString(),
    };
    savePurchaseInvoice(inv);

    if (!editingInvoiceId) {
      updateSettings({
        ...settings,
        invoice: { ...settings.invoice, purchaseNextNo: nextSeed },
      });
    }

    toast.success(
      editingInvoiceId ? "Bill Updated" : "Bill Saved",
      `${resolvedNo} - Rs.${todayAmount.toLocaleString("en-IN")} for ${selectedSupplier.name}`,
    );
    setTimeout(() => {
      setActiveSubTab("LIST");
      handleResetForm();
    }, 600);
  };

  //        list state
  const [searchTerm, setSearchTerm] = useState("");
  const listSearchRef = useRef<HTMLInputElement>(null);

  const filteredInvoices = useMemo(
    () =>
      purchaseInvoices
        .filter((inv) => inv.date >= fyStartDate && inv.date <= fyEndDate)
        .filter(
          (inv) =>
            inv.billNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (inv.vehicleNo || "")
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            inv.items.some((it) =>
              it.fruit.toLowerCase().includes(searchTerm.toLowerCase()),
            ),
        ),
    [purchaseInvoices, searchTerm, fyStartDate, fyEndDate],
  );

  const table = useDataTable<
    PurchaseInvoice,
    "date" | "billNo" | "todayAmount" | "remainingBalance"
  >({
    data: filteredInvoices,
    initialSortBy: "date",
    initialSortDir: "desc",
    initialPageSize: 15,
    pageSizeOptions: [10, 15, 30, 50],
    sortComparators: {
      date: (a, b) => a.date.localeCompare(b.date),
      billNo: (a, b) => a.billNo.localeCompare(b.billNo),
      todayAmount: (a, b) => a.todayAmount - b.todayAmount,
      remainingBalance: (a, b) => a.remainingBalance - b.remainingBalance,
    },
    resetPageOn: [activeSubTab],
  });

  useEffect(() => {
    if (activeSubTab !== "LIST") return;
    setIsListLoading(true);
    const id = window.setTimeout(() => setIsListLoading(false), 180);
    return () => window.clearTimeout(id);
  }, [activeSubTab, searchTerm, table.sortBy, table.sortDir]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && activeSubTab === "LIST") {
        e.preventDefault();
        listSearchRef.current?.focus();
      }
      if (e.ctrlKey && e.key === "Enter" && activeSubTab === "NEW_INVOICE") {
        e.preventDefault();
        handleSaveInvoice();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    activeSubTab,
    items,
    selectedSupplierId,
    notes,
    billNo,
    date,
    freightInput,
    hamaliInput,
  ]);

  //        render
  return (
    <div className="flex-1 flex flex-col space-y-5 font-sans min-h-0">
      {/*        PAGE HEADER        */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${card} p-4`}
      >
        <div>
          <h1 className="text-xl font-bold dark:text-white text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-emerald-500" />
            <span>PURCHASE BILLING</span>
          </h1>
          <p className={`text-xs ${muted} mt-0.5`}>
            Record supplier purchase bills with vehicle & freight details
          </p>
        </div>
        <div className="flex items-center gap-1.5 dark:bg-slate-950 bg-slate-100 p-1 rounded-xl border dark:border-slate-800 border-slate-200/80">
          {[
            {
              id: "NEW_INVOICE",
              label: "New Bill",
              icon: <Plus className="w-4 h-4" />,
            },
            {
              id: "LIST",
              label: `Bills (${purchaseInvoices.length})`,
              icon: <FileText className="w-4 h-4" />,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                activeSubTab === tab.id
                  ? "bg-[linear-gradient(135deg,#00C896,#00AEEF)] text-white shadow-[0_6px_16px_rgba(0,174,239,0.3)]"
                  : `${muted} dark:hover:text-white hover:text-slate-900`
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/*                                                                                                                                           
          NEW BILL FORM
                                                                                                                                                    */}
      {activeSubTab === "NEW_INVOICE" && (
        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          {/* Lorry Deductions Toggle */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setShowCharges(!showCharges)}
              className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 cursor-pointer font-bold"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>
                {showCharges
                  ? "Hide Lorry Deductions"
                  : "Add Lorry Deductions (Bhaada/Hamali)"}
              </span>
            </button>
          </div>

          {/*        COMPACT FORM HEADER        */}
          <div className={`${card} overflow-hidden`}>
            {/* Row 1: Bill No    Date    Supplier    Vehicle No    Declared Wt */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-0 divide-y sm:divide-y-0 sm:divide-x dark:divide-slate-800 divide-slate-100">
              {/* Bill No */}
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5 min-w-[150px]">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${label}`}
                >
                  Bill No
                </span>
                <input
                  type="text"
                  value={billNo}
                  data-pinv-cell="header-billno"
                  onKeyDown={(e) => handleKeyDown(e, "header-billno", 0)}
                  onChange={(e) => setBillNo(e.target.value.toUpperCase())}
                  className={`${inp} px-2 py-1 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 w-full`}
                  placeholder="PUR-2026-001"
                />
              </div>
              {/* Date */}
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5">
                <DatePicker
                  label="Date"
                  value={date}
                  onChange={(val) => setDate(val)}
                  variant="emerald"
                  inputProps={{
                    "data-pinv-cell": "header-date",
                    onKeyDown: (e) => handleKeyDown(e as any, "header-date", 0),
                  }}
                />
              </div>
              {/* Supplier */}
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${label}`}
                  >
                    Supplier / Orchard
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAddName("");
                      setShowQuickAdd(true);
                    }}
                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>New</span>
                  </button>
                </div>
                <CommandSelect
                  id="purchase-supplier"
                  value={selectedSupplier?.id || ""}
                  inputAttributes={{
                    "data-pinv-cell": "header-supplier",
                    onKeyDown: (e) =>
                      handleKeyDown(e as any, "header-supplier", 0),
                  }}
                  onChange={(val) => {
                    const m = suppliers.find(
                      (s) => s.id === val || s.name === val,
                    );
                    if (m) {
                      setSelectedSupplierId(m.id);
                      // Auto focus next field on selection
                      setTimeout(() => focusCellByName("header-vehicle"), 10);
                    }
                  }}
                  options={supplierOptions}
                  placeholder="Select supplier"
                  creatable={true}
                  onAdd={(name) => {
                    setQuickAddName(name);
                    setShowQuickAdd(true);
                  }}
                />
              </div>
              {/* Quick Add Modal */}
              <QuickAddPartyModal
                isOpen={showQuickAdd}
                onClose={() => setShowQuickAdd(false)}
                type="SUPPLIER"
                initialName={quickAddName}
                onAdd={(p) => {
                  const id = addSupplier({
                    name: p.name,
                    phone: p.phone,
                    city: p.city,
                    previousBalance: p.previousBalance,
                    code: "",
                    email: "",
                    gstin: "",
                    state: "",
                    billingAddress: "",
                    shippingAddress: "",
                    creditLimit: 0,
                    notes: "",
                  });
                  setSelectedSupplierId(id);
                  toast.success("Supplier Added", `${p.name} created.`);
                  setTimeout(() => focusCellByName("header-vehicle"), 50);
                }}
              />
              {/* Vehicle No */}
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${label}`}
                >
                  Vehicle No
                </span>
                <input
                  type="text"
                  value={vehicleNo}
                  data-pinv-cell="header-vehicle"
                  onKeyDown={(e) => handleKeyDown(e, "header-vehicle", 0)}
                  onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                  placeholder="GJ01AB1234"
                  className={`${inp} px-2 py-1 text-xs font-mono font-bold uppercase w-full`}
                />
              </div>
              {/* Declared Wt */}
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${label}`}
                >
                  Declared Wt (KG)
                </span>
                <input
                  type="number"
                  value={declaredWeight === 0 ? "" : declaredWeight}
                  data-pinv-cell="header-weight"
                  onKeyDown={(e) => handleKeyDown(e, "header-weight", 0)}
                  placeholder="0"
                  onChange={(e) =>
                    setDeclaredWeight(parseFloat(e.target.value) || 0)
                  }
                  className={`${inp} px-2 py-1 text-xs font-mono font-bold w-full`}
                />
              </div>
            </div>
          </div>

          {/* Advanced Lorry Deductions Panel — inline inside the form card to avoid layout shift */}
          {showCharges && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x dark:divide-slate-800 divide-slate-100 dark:bg-slate-950/40 bg-slate-50/60 border dark:border-slate-800 border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${label}`}
                >
                  Lorry Freight (Bhaada ₹)
                </span>
                <div className="relative">
                  <span
                    className={`absolute left-2 top-1.5 text-[11px] ${muted} font-mono`}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    value={freightInput === 0 ? "" : freightInput}
                    placeholder="0"
                    onChange={(e) =>
                      setFreightInput(parseFloat(e.target.value) || 0)
                    }
                    className={`${inp} w-full pl-5 pr-2 py-1 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400`}
                  />
                </div>
              </div>
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${label}`}
                >
                  Unloading (Hamali ₹)
                </span>
                <div className="relative">
                  <span
                    className={`absolute left-2 top-1.5 text-[11px] ${muted} font-mono`}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    value={hamaliInput === 0 ? "" : hamaliInput}
                    placeholder="0"
                    onChange={(e) =>
                      setHamaliInput(parseFloat(e.target.value) || 0)
                    }
                    className={`${inp} w-full pl-5 pr-2 py-1 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400`}
                  />
                </div>
              </div>
            </div>
          )}

          {/*        ITEMS TABLE        */}
          <div
            className={`${card} overflow-hidden flex-1 flex flex-col min-h-0`}
          >
            <div
              className={`px-5 py-3.5 ${hdr} flex items-center justify-between`}
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider dark:text-slate-200 text-slate-800">
                  Purchased Items
                </span>
                <span
                  className={`text-[10px] font-mono font-bold dark:bg-slate-800 bg-slate-100 ${muted} px-2 py-0.5 rounded-full border dark:border-slate-700 border-slate-200`}
                >
                  {items.length} rows
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addItemRow}
                  className="flex items-center gap-2 px-4 py-2 bg-[linear-gradient(135deg,#00C896,#00AEEF)] text-white shadow-[0_6px_16px_rgba(0,174,239,0.3)] rounded-xl text-xs font-bold cursor-pointer transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Row</span>
                </button>
              </div>
            </div>

            {/* overflow-x-auto with min-w-0 prevents the wrapper from expanding the parent card */}
            <div className="flex-1 overflow-auto min-w-0 relative">
              {/* table-fixed locks column widths so tfoot content never causes reflow */}
              <table className="erp-table w-full text-left text-xs sm:text-sm table-fixed">
                <colgroup>
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "8%" }} />
                </colgroup>
                <thead>
                  <tr
                    className={`${hdr} dark:text-slate-400 text-slate-600 text-[11px] font-bold uppercase tracking-wider select-none sticky top-0 z-10 shadow-sm`}
                  >
                    <th className="py-3 px-4 col-text">Fruit Category</th>
                    <th className="py-3 px-3 col-text">Variety (Vakkal)</th>
                    <th className="py-3 px-3 col-num">Carets / Crt</th>
                    <th className="py-3 px-3 col-num">Weight (KG)</th>
                    <th className="py-3 px-3 col-num">Rate</th>
                    <th className="py-3 px-4 col-num font-black text-emerald-500">
                      Amount
                    </th>
                    <th className="py-3 px-3 col-actions">Act.</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100 font-mono">
                  {items.map((it, idx) => {
                    const fruitObj =
                      fruits.find((f) => f.name === it.fruitCategory) ||
                      fruits[0];
                    const varieties = fruitObj?.varieties || ["Standard"];
                    const pricingType =
                      it.pricingType ??
                      getFruitPricingType(
                        it.fruitCategory || it.fruit || "",
                        fruitObj?.pricingType,
                      );
                    const isByKg = pricingType === "kg";
                    return (
                      <tr
                        key={it.id}
                        className="dark:hover:bg-slate-800/30 hover:bg-slate-50/80 font-sans group transition-colors"
                      >
                        {/* Fruit Category */}
                        <td className="p-1.5 px-3 col-text">
                          <CommandSelect
                            variant="emerald"
                            value={it.fruitCategory}
                            inputAttributes={{
                              "data-pinv-cell": `${idx}-0`,
                            }}
                            onChange={(val) => {
                              const f = fruits.find(
                                (f) => f.id === val || f.name === val,
                              );
                              handleItemChange(
                                idx,
                                "fruitCategory",
                                f?.name || val,
                              );
                              setTimeout(() => focusCell(idx, 1), 10);
                            }}
                            options={fruitOptions}
                            placeholder="Select fruit"
                            creatable={true}
                            onAdd={(nf) => {
                              addFruit(nf);
                              handleItemChange(idx, "fruitCategory", nf);
                              setTimeout(() => focusCell(idx, 1), 10);
                            }}
                          />
                        </td>
                        {/* Variety */}
                        <td className="p-1.5 col-text">
                          <CommandSelect
                            variant="emerald"
                            value={it.variety}
                            inputAttributes={{
                              "data-pinv-cell": `${idx}-1`,
                            }}
                            onChange={(val) => {
                              handleItemChange(idx, "variety", val);
                              setTimeout(() => focusCell(idx, 2), 10);
                            }}
                            options={varieties.map((v) => ({
                              id: v,
                              label: v,
                              emoji: "📦",
                            }))}
                            placeholder="Select variety"
                            creatable={true}
                            onAdd={(nv) => {
                              if (fruitObj) addFruitVariety(fruitObj.id, nv);
                              setTimeout(() => focusCell(idx, 2), 10);
                            }}
                          />
                        </td>
                        {/* Carets — primary qty for non-mango, secondary for mango */}
                        <td className="p-1.5 col-num !overflow-visible">
                          <div className="relative !overflow-visible">
                            <input
                              type="number"
                              data-pinv-cell={`${idx}-2`}
                              value={it.caret === 0 ? "" : it.caret}
                              placeholder="0"
                              onChange={(e) =>
                                handleItemChange(idx, "caret", e.target.value)
                              }
                              onKeyDown={(e) => handleKeyDown(e, idx, 2)}
                              className={`w-full ${inp} p-2 text-right text-xs font-mono font-semibold ${it.fruitCategory && !isByKg ? "ring-2 ring-amber-400/50 border-amber-400/70" : ""}`}
                            />
                            {!isByKg && (
                              <span className="absolute -top-2 right-1 text-[8px] font-black text-emerald-600 uppercase tracking-wider bg-white dark:bg-slate-950 px-1 z-1">
                                Caret
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Weight — primary qty for mango, secondary for others */}
                        <td className="p-1.5 col-num !overflow-visible">
                          <div className="relative !overflow-visible">
                            <input
                              type="number"
                              step="0.1"
                              data-pinv-cell={`${idx}-3`}
                              value={it.weight === 0 ? "" : it.weight}
                              placeholder="0.0"
                              onChange={(e) =>
                                handleItemChange(idx, "weight", e.target.value)
                              }
                              onKeyDown={(e) => handleKeyDown(e, idx, 3)}
                              className={`w-full ${inp} p-2 text-right text-xs font-mono font-semibold ${it.fruitCategory && isByKg ? "ring-2 ring-amber-400/50 border-amber-400/70" : ""}`}
                            />
                            {isByKg && (
                              <span className="absolute -top-2 right-1 text-[8px] font-black text-emerald-600 uppercase tracking-wider bg-white dark:bg-slate-950 px-1 z-1">
                                KG
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Rate — label changes based on pricing type */}
                        <td className="p-1.5 col-num !overflow-visible">
                          <div className="relative !overflow-visible">
                            <input
                              type="number"
                              step="0.5"
                              data-pinv-cell={`${idx}-4`}
                              value={it.rate === 0 ? "" : it.rate}
                              placeholder="0.00"
                              onChange={(e) =>
                                handleItemChange(idx, "rate", e.target.value)
                              }
                              onKeyDown={(e) => handleKeyDown(e, idx, 4)}
                              className={`w-full ${inp} p-2 text-right text-xs font-mono font-bold dark:text-emerald-300 text-emerald-700`}
                            />
                            <span className="absolute -top-2 right-1 text-[8px] font-black text-emerald-600 uppercase tracking-wider bg-white dark:bg-slate-950 px-1 z-1">
                              {isByKg ? "₹/KG" : "₹/Crt"}
                            </span>
                          </div>
                        </td>
                        {/* Amount */}
                        <td className="p-2 px-4 col-num font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/8 text-sm">
                          ₹ {it.amount.toLocaleString("en-IN")}
                        </td>
                        {/* Actions */}
                        <td className="p-1.5 col-actions">
                          <div className="flex items-center justify-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => duplicateItemRow(idx)}
                              title="Duplicate row"
                              className={`p-1.5 ${muted} hover:text-emerald-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors`}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              disabled={items.length <= 1}
                              title="Remove row"
                              className={`p-1.5 ${muted} hover:text-red-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors disabled:opacity-30`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr
                    className={`${hdr} font-bold text-xs uppercase tracking-wider dark:text-slate-300 text-slate-800 font-sans border-t-2 dark:border-slate-700 border-slate-200`}
                  >
                    <td
                      colSpan={2}
                      className={`py-3.5 px-4 col-text text-right ${muted}`}
                    >
                      Subtotal
                    </td>
                    <td className="py-3.5 px-3 col-num font-mono text-emerald-600 dark:text-emerald-400">
                      {totalCarets} CRT
                    </td>
                    <td className="py-3.5 px-3 col-num font-mono text-emerald-600 dark:text-emerald-400">
                      {totalWeight.toFixed(1)} KG
                    </td>
                    <td
                      className={`py-3.5 px-3 col-num text-right ${muted} text-[10px]`}
                    >
                      {(() => {
                        const hasKg = items.some(
                          (it) =>
                            (it.pricingType ??
                              getFruitPricingType(
                                it.fruitCategory || it.fruit || "",
                              )) === "kg",
                        );
                        const hasCaret = items.some(
                          (it) =>
                            (it.pricingType ??
                              getFruitPricingType(
                                it.fruitCategory || it.fruit || "",
                              )) === "caret",
                        );
                        if (hasKg && !hasCaret)
                          return `₹ ${totalWeight > 0 ? (itemsSubtotal / totalWeight).toFixed(1) : "0"}/KG`;
                        if (hasCaret && !hasKg)
                          return `₹ ${totalCarets > 0 ? (itemsSubtotal / totalCarets).toFixed(1) : "0"}/Crt`;
                        return `Mixed Pricing`;
                      })()}
                    </td>
                    <td className="py-3.5 px-4 col-num font-mono text-emerald-600 dark:text-emerald-400 font-black text-base bg-emerald-500/8 border-l border-emerald-500/20">
                      ₹ {itemsSubtotal.toLocaleString("en-IN")}
                    </td>
                    <td
                      className={`py-3.5 px-3 col-actions ${muted} text-[10px] font-normal`}
                    >
                      {/* Note removed as requested */}
                    </td>
                  </tr>
                  {(freight > 0 || hamali > 0) && (
                    <tr
                      className={`dark:bg-slate-900/50 bg-slate-50/60 font-bold text-xs border-t dark:border-slate-800 border-slate-100`}
                    >
                      {/* Use individual cells matching the colgroup widths — never colSpan with dynamic text */}
                      <td
                        className={`py-2.5 px-4 col-text ${muted} overflow-hidden`}
                      />
                      <td
                        className={`py-2.5 px-3 col-text text-right ${muted} overflow-hidden whitespace-nowrap`}
                      >
                        {freight > 0 && hamali > 0
                          ? "Freight + Hamali"
                          : freight > 0
                            ? "Lorry Freight"
                            : "Hamali"}
                      </td>
                      <td
                        className={`py-2.5 px-3 col-num text-right ${muted} overflow-hidden whitespace-nowrap`}
                      >
                        {freight > 0
                          ? `₹ ${freight.toLocaleString("en-IN")}`
                          : ""}
                      </td>
                      <td
                        className={`py-2.5 px-3 col-num text-right ${muted} overflow-hidden whitespace-nowrap`}
                      >
                        {hamali > 0
                          ? `₹ ${hamali.toLocaleString("en-IN")}`
                          : ""}
                      </td>
                      <td
                        className={`py-2.5 px-3 col-num text-right ${muted} text-[10px] overflow-hidden`}
                      />
                      <td className="py-2.5 px-4 col-num font-mono text-emerald-600 dark:text-emerald-400 font-black text-base overflow-hidden">
                        ₹ {todayAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="col-actions" />
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>

            {/* Summary Strip: Previous | Today | Payable */}
            <div className="grid grid-cols-3 gap-0 divide-x dark:divide-slate-800 divide-slate-100 border-t dark:border-slate-800 border-slate-100">
              <div className="px-5 py-3 flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${muted}`}
                >
                  Previous Balance
                </span>
                <span className="text-sm font-bold font-mono dark:text-slate-200 text-slate-900">
                  ₹ {previousBalance.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="px-5 py-3 flex items-center justify-between dark:bg-emerald-950/20 bg-emerald-50/40">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  + Today's Bill
                </span>
                <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  ₹ {todayAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="px-5 py-3 flex items-center justify-between bg-linear-to-r from-emerald-600 to-teal-600">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                  = Total Payable
                </span>
                <span className="text-base font-bold font-mono text-white">
                  ₹ {remainingBalance.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/*        FOOTER: notes + save        */}
            <div
              className={`p-5 ${hdr} border-t flex flex-col sm:flex-row items-center justify-between gap-4`}
            >
              <div className="flex items-center gap-3 w-full sm:w-1/2">
                <span
                  className={`text-[11px] ${label} font-bold uppercase tracking-wider whitespace-nowrap`}
                >
                  Notes
                </span>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Bill notes / remarks"
                  className={`w-full ${inp} px-3.5 py-2.5 text-xs`}
                />
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-5 py-2.5 dark:bg-slate-800 bg-slate-100 dark:hover:bg-slate-700 hover:bg-slate-200 dark:text-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors border dark:border-slate-700 border-slate-200"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleSaveInvoice}
                  data-pinv-cell="save-button"
                  className="px-6 py-2.5 bg-[linear-gradient(135deg,#00C896,#00AEEF)] text-white shadow-[0_6px_16px_rgba(0,174,239,0.3)] rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  <span>Save Purchase Bill</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*                                                                                                                                           
          BILLS LIST
                                                                                                                                                    */}
      {activeSubTab === "LIST" && (
        <div className={`flex-1 flex flex-col ${card} p-5 space-y-5 min-h-0`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b dark:border-slate-800 border-slate-100 pb-4 shrink-0">
            <h2 className="text-sm font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span>Purchase Bills</span>
              <span
                className={`text-[10px] font-mono font-bold dark:bg-slate-800 bg-slate-100 ${muted} px-2 py-0.5 rounded border dark:border-slate-700 border-slate-200`}
              >
                {table.totalRecords}
              </span>
            </h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className={`w-4 h-4 ${muted} absolute left-3 top-3`} />
                <input
                  ref={listSearchRef}
                  type="text"
                  placeholder="Search bills, supplier, vehicle (/)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full ${inp} pl-9 pr-4 py-2.5 text-xs`}
                />
              </div>
            </div>
          </div>

          <DataTable
            className="flex-1 min-h-0"
            scrollClassName="flex-1"
            footer={
              <Pagination
                page={table.page}
                totalPages={table.totalPages}
                totalRecords={table.totalRecords}
                pageSize={table.pageSize}
                pageSizeOptions={table.pageSizeOptions}
                onPageChange={table.setPage}
                onPageSizeChange={table.setPageSize}
                label="bills"
              />
            }
          >
            <table className="erp-table w-full text-left text-xs sm:text-sm">
              <thead>
                <tr
                  className={`${hdr} dark:text-slate-400 text-slate-600 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10`}
                >
                  <th className="py-3.5 px-4 col-date col-text">
                    <button
                      type="button"
                      onClick={() => table.toggleSort("billNo")}
                      className="inline-flex items-center gap-1"
                    >
                      Bill / Date <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3.5 px-3 col-large col-text">
                    <button
                      type="button"
                      onClick={() => table.toggleSort("supplierName")}
                      className="inline-flex items-center gap-1"
                    >
                      Supplier <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3.5 px-3 col-type col-compact">
                    <button
                      type="button"
                      onClick={() => table.toggleSort("vehicleNo")}
                      className="inline-flex items-center gap-1"
                    >
                      Vehicle <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3.5 px-3 col-num col-small">
                    <button
                      type="button"
                      onClick={() => table.toggleSort("totalCarets")}
                      className="inline-flex items-center gap-1 ml-auto"
                    >
                      Carets <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3.5 px-3 col-num col-small">
                    <button
                      type="button"
                      onClick={() => table.toggleSort("totalWeight")}
                      className="inline-flex items-center gap-1 ml-auto"
                    >
                      Weight <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3.5 px-3 col-num col-amount font-black text-emerald-500">
                    <button
                      type="button"
                      onClick={() => table.toggleSort("todayAmount")}
                      className="inline-flex items-center gap-1 ml-auto"
                    >
                      Bill Total <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3.5 px-3 col-num col-amount font-black dark:text-slate-200 text-slate-900">
                    <button
                      type="button"
                      onClick={() => table.toggleSort("remainingBalance")}
                      className="inline-flex items-center gap-1 ml-auto"
                    >
                      Balance <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3.5 px-4 col-actions sticky right-0 top-0 bg-(--table-header-bg) z-11">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                {isListLoading ? (
                  <tr>
                    <td colSpan={8} className="p-0">
                      <TableSkeleton rows={6} cols={8} />
                    </td>
                  </tr>
                ) : table.totalRecords === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-0">
                      <ModuleEmptyState
                        title="No purchase bills yet"
                        subtitle="Create your first purchase bill above."
                      />
                    </td>
                  </tr>
                ) : (
                  table.pageRows.map((inv) => {
                    const carets = inv.items.reduce(
                      (s, it) => s + (Number(it.caret) || 0),
                      0,
                    );
                    const weight = inv.items.reduce(
                      (s, it) => s + (Number(it.weight) || 0),
                      0,
                    );
                    return (
                      <tr
                        key={inv.id}
                        className="dark:hover:bg-slate-800/30 hover:bg-slate-50/80 transition-colors font-sans group"
                      >
                        <td className="py-3.5 px-4 col-text font-mono">
                          <span className="font-bold dark:text-slate-200 text-slate-900 block text-sm">
                            {inv.billNo}
                          </span>
                          <span className={`text-[10px] ${muted} font-medium`}>
                            {fmtDate(inv.date)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 col-text">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-[10px] font-bold text-emerald-600">
                              {inv.supplierName.charAt(0)}
                            </div>
                            <span className="font-semibold text-(--text-primary)">
                              {inv.supplierName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 col-text">
                          <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {inv.vehicleNo || "DIRECT"}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 col-num font-mono font-bold text-slate-600 dark:text-slate-400">
                          {carets}{" "}
                          <span className="text-[9px] font-sans">CRT</span>
                        </td>
                        <td className="py-3.5 px-3 col-num font-mono font-bold text-slate-600 dark:text-slate-400">
                          {weight.toFixed(1)}{" "}
                          <span className="text-[9px] font-sans">KG</span>
                        </td>
                        <td className="py-3.5 px-3 col-num font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">
                          ₹ {inv.todayAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-3 col-num font-mono font-bold dark:text-slate-200 text-slate-900 text-sm">
                          ₹ {inv.remainingBalance.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 col-actions sticky right-0 bg-(--card-bg) z-2 border-l border-(--table-border)">
                          <div className="flex items-center justify-center gap-1 transition-all">
                            <button
                              onClick={() => setPreviewInvoice(inv)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg dark:text-slate-400 text-slate-500 hover:bg-emerald-500 hover:text-white transition-all duration-200 shadow-sm hover:shadow-emerald-500/20 cursor-pointer"
                              title="View Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditInvoice(inv)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg dark:text-slate-400 text-slate-500 hover:bg-amber-500 hover:text-white transition-all duration-200 shadow-sm hover:shadow-amber-500/20 cursor-pointer"
                              title="Edit Bill"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={async () => {
                                const ok = await dialog.confirm({
                                  title: "Delete Purchase Bill?",
                                  description: `Are you sure you want to delete ${inv.billNo}? This will also adjust the supplier balance and inventory.`,
                                  confirmText: "Delete Bill",
                                  variant: "destructive",
                                });
                                if (ok) {
                                  deletePurchaseInvoice(inv.id);
                                  toast.success(
                                    "Bill Deleted",
                                    "The purchase record and associated stock have been removed.",
                                  );
                                }
                              }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg dark:text-slate-400 text-slate-500 hover:bg-rose-500 hover:text-white transition-all duration-200 shadow-sm hover:shadow-rose-500/20 cursor-pointer"
                              title="Delete Bill"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </DataTable>
        </div>
      )}

      <PurchasePreviewModal
        invoice={previewInvoice}
        onClose={() => setPreviewInvoice(null)}
      />
    </div>
  );
};
