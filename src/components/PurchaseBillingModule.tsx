import React, { useEffect, useState, useMemo, useRef } from "react";
import { useApp } from "../context/AppContext";
import { PurchaseInvoice, PurchaseInvoiceItem } from "../types";
import { PurchasePreviewModal } from "./PurchasePreviewModal";
import {
  ShoppingBag,
  Plus,
  Save,
  Search,
  Eye,
  Trash2,
  FileText,
  Calendar,
  Copy,
  ArrowUpDown,
} from "lucide-react";
import { Combobox } from "./ui/Combobox";
import { useToast } from "./ui/Toast";
import { useConfirmDialog } from "./ui/ConfirmDialog";
import { ModuleEmptyState, TableSkeleton } from "./ui/DataStates";
import { useDataTable } from "../hooks/useDataTable";
import { DataTable, Pagination } from "./ui/table";
import { useAppearance, useAppTranslation } from "@/hooks";

import { fmtDate, fmtDateWithDay } from "@/utils/format";

//        helpers
// formatDateWithDay is now fmtDateWithDay from utils/format

function makeBlankItem(
  fruits: { name: string; varieties: string[] }[],
): PurchaseInvoiceItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    fruitCategory: fruits[0]?.name || "Mango",
    fruit: fruits[0]?.name || "Mango",
    variety: fruits[0]?.varieties[0] || "Standard",
    caret: 0,
    weight: 0,
    rate: 0,
    amount: 0,
    rowNote: "",
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

export const PurchaseBillingModule: React.FC = () => {
  const {
    suppliers,
    fruits,
    purchaseInvoices,
    savePurchaseInvoice,
    deletePurchaseInvoice,
    addFruit,
    addFruitVariety,
  } = useApp();
  const { t } = useAppTranslation("billing");
  const { density, setDensity } = useAppearance();
  const toast = useToast();
  const dialog = useConfirmDialog();

  const [activeSubTab, setActiveSubTab] = useState<"NEW_INVOICE" | "LIST">(
    "NEW_INVOICE",
  );
  const [previewInvoice, setPreviewInvoice] = useState<PurchaseInvoice | null>(
    null,
  );
  const [isListLoading, setIsListLoading] = useState(false);
  const [showCharges, setShowCharges] = useState(false); // unused, kept for compat

  //        form state
  const [billNo, setBillNo] = useState(
    `PUR-2026-${String(purchaseInvoices.length + 101).padStart(3, "0")}`,
  );
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedSupplierId, setSelectedSupplierId] = useState(
    suppliers[0]?.id || "",
  );
  const [notes, setNotes] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [declaredWeight, setDeclaredWeight] = useState<number>(0);
  const [freightInput, setFreightInput] = useState<number>(0);
  const [hamaliInput, setHamaliInput] = useState<number>(0);
  const [items, setItems] = useState<PurchaseInvoiceItem[]>(() => [
    makeBlankItem(fruits),
  ]);

  const dateRef = useRef<HTMLInputElement>(null);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0],
    [selectedSupplierId, suppliers],
  );

  //        calculations
  const itemsSubtotal = items.reduce(
    (s, it) => s + (parseFloat(String(it.amount)) || 0),
    0,
  );
  const freight = parseFloat(String(freightInput)) || 0;
  const hamali = parseFloat(String(hamaliInput)) || 0;
  const todayAmount = itemsSubtotal + freight + hamali;
  const previousBalance = selectedSupplier?.previousBalance ?? 0;
  const remainingBalance = previousBalance + todayAmount;
  const totalCarets = items.reduce(
    (s, it) => s + (parseFloat(String(it.caret)) || 0),
    0,
  );
  const totalWeight = items.reduce(
    (s, it) => s + (parseFloat(String(it.weight)) || 0),
    0,
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
    } else if (field === "caret" || field === "weight" || field === "rate") {
      (item as any)[field] = value;
      const w =
        field === "weight"
          ? parseFloat(value) || 0
          : parseFloat(String(item.weight)) || 0;
      const r =
        field === "rate"
          ? parseFloat(value) || 0
          : parseFloat(String(item.rate)) || 0;
      item.amount = Math.round(w * r);
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
    row: number,
    col: number,
  ) => {
    const COLS = 5; // fruitCategory, variety, caret, weight, rate
    if (e.key === "Enter") {
      e.preventDefault();
      const next = document.querySelector(
        `[data-pinv-cell="${row}-${col + 1}"]`,
      ) as HTMLElement;
      if (next) {
        next.focus();
        return;
      }
      const nextRow = document.querySelector(
        `[data-pinv-cell="${row + 1}-0"]`,
      ) as HTMLElement;
      if (nextRow) {
        nextRow.focus();
        return;
      }
      addItemRow();
      setTimeout(
        () =>
          (
            document.querySelector(
              `[data-pinv-cell="${row + 1}-0"]`,
            ) as HTMLElement
          )?.focus(),
        50,
      );
    } else if (e.key === "ArrowUp") {
      (
        document.querySelector(
          `[data-pinv-cell="${row - 1}-${col}"]`,
        ) as HTMLElement
      )?.focus();
    } else if (e.key === "ArrowDown") {
      const t = document.querySelector(
        `[data-pinv-cell="${row + 1}-${col}"]`,
      ) as HTMLElement;
      if (t) t.focus();
      else addItemRow();
    } else if (e.altKey && e.key.toLowerCase() === "a") {
      e.preventDefault();
      addItemRow();
    } else if (e.altKey && e.key.toLowerCase() === "d") {
      e.preventDefault();
      duplicateItemRow(row);
    }
  };

  //        reset / save
  const handleResetForm = () => {
    setBillNo(
      `PUR-2026-${String(purchaseInvoices.length + 101).padStart(3, "0")}`,
    );
    setItems([makeBlankItem(fruits)]);
    setVehicleNo("");
    setDeclaredWeight(0);
    setFreightInput(0);
    setHamaliInput(0);
    setNotes("");
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
    const inv: PurchaseInvoice = {
      id: `pinv-${Date.now()}`,
      billNo,
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
      createdAt: new Date().toISOString(),
    };
    savePurchaseInvoice(inv);
    toast.success(
      "Bill Saved",
      `${billNo} - Rs.${todayAmount.toLocaleString("en-IN")} for ${selectedSupplier.name}`,
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
      purchaseInvoices.filter(
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
    [purchaseInvoices, searchTerm],
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

  const isCompact = density === "compact";

  //        render
  return (
    <div className="space-y-5 font-sans">
      {/*        PAGE HEADER        */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${card} p-4`}
      >
        <div>
          <h1 className="text-xl font-black dark:text-white text-slate-900 tracking-tight flex items-center gap-2.5">
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeSubTab === tab.id
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
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
        <div className="space-y-4">
          {/*        COMPACT FORM HEADER        */}
          <div className={`${card} overflow-hidden`}>
            {/* Row 1: Bill No    Date    Supplier */}
            <div className="grid grid-cols-[auto_1fr_1fr] gap-0 divide-x dark:divide-slate-800 divide-slate-100">
              {/* Bill No */}
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5 min-w-[130px]">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${label}`}
                >
                  Bill No
                </span>
                <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                  {billNo}
                </span>
              </div>
              {/* Date */}
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${label}`}
                >
                  Date
                </span>
                <div className="flex items-center gap-2">
                  <input
                    ref={dateRef}
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`${inp} px-2 py-1 text-xs font-mono font-bold w-36`}
                  />
                  {date && (
                    <span className={`text-[11px] ${muted} hidden lg:block`}>
                      {fmtDateWithDay(date)}
                    </span>
                  )}
                </div>
              </div>
              {/* Supplier */}
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${label}`}
                >
                  Supplier / Orchard
                </span>
                <Combobox
                  value={selectedSupplier?.name || ""}
                  onChange={(val) => {
                    const m =
                      suppliers.find((s) => s.name === val) || suppliers[0];
                    if (m) setSelectedSupplierId(m.id);
                  }}
                  options={suppliers.map((s) => s.name)}
                  placeholder="Select supplier"
                  searchPlaceholder="Search supplier"
                  creatable={false}
                />
              </div>
            </div>

            {/* Row 2: Vehicle No    Declared Wt    Freight    Hamali    Notes */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-0 divide-x dark:divide-slate-800 divide-slate-100 border-t dark:border-slate-800 border-slate-100">
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${label}`}
                >
                  Vehicle No
                </span>
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                  placeholder="GJ01AB1234"
                  className={`${inp} px-2 py-1 text-xs font-mono font-bold uppercase w-full`}
                />
              </div>
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${label}`}
                >
                  Declared Wt (KG)
                </span>
                <input
                  type="number"
                  value={declaredWeight === 0 ? "" : declaredWeight}
                  placeholder="0"
                  onChange={(e) =>
                    setDeclaredWeight(parseFloat(e.target.value) || 0)
                  }
                  className={`${inp} px-2 py-1 text-xs font-mono font-bold w-full`}
                />
              </div>
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${label}`}
                >
                  Freight / Bhaada
                </span>
                <div className="relative">
                  <span
                    className={`absolute left-2 top-1.5 text-[11px] ${muted} font-mono`}
                  >
                    {" "}
                    ₹{" "}
                  </span>
                  <input
                    type="number"
                    value={freightInput === 0 ? "" : freightInput}
                    placeholder="0"
                    onChange={(e) =>
                      setFreightInput(parseFloat(e.target.value) || 0)
                    }
                    className={`${inp} pl-5 pr-2 py-1 text-xs font-mono font-bold dark:text-emerald-400 text-emerald-600 w-full`}
                  />
                </div>
              </div>
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${label}`}
                >
                  Hamali / Unloading
                </span>
                <div className="relative">
                  <span
                    className={`absolute left-2 top-1.5 text-[11px] ${muted} font-mono`}
                  >
                    {" "}
                    ₹{" "}
                  </span>
                  <input
                    type="number"
                    value={hamaliInput === 0 ? "" : hamaliInput}
                    placeholder="0"
                    onChange={(e) =>
                      setHamaliInput(parseFloat(e.target.value) || 0)
                    }
                    className={`${inp} pl-5 pr-2 py-1 text-xs font-mono font-bold dark:text-emerald-400 text-emerald-600 w-full`}
                  />
                </div>
              </div>
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${label}`}
                >
                  Notes
                </span>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Remarks"
                  className={`${inp} px-2 py-1 text-xs w-full`}
                />
              </div>
            </div>

            {/* Row 3: Balance strip */}
            <div className="grid grid-cols-3 gap-0 divide-x dark:divide-slate-800 divide-slate-100 border-t dark:border-slate-800 border-slate-100">
              <div className="px-4 py-2.5 flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${muted}`}
                >
                  Previous
                </span>
                <span className="text-sm font-black font-mono dark:text-slate-200 text-slate-900">
                  {" "}
                  ₹ {previousBalance.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="px-4 py-2.5 flex items-center justify-between dark:bg-emerald-950/20 bg-emerald-50/40">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  + Today
                </span>
                <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {" "}
                  ` {todayAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="px-4 py-2.5 flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                  = Payable
                </span>
                <span className="text-base font-black font-mono text-white">
                  {" "}
                  ` {remainingBalance.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/*        ITEMS TABLE        */}
          <div className={`${card} overflow-hidden`}>
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
              <button
                type="button"
                onClick={addItemRow}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="erp-table w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr
                    className={`${hdr} dark:text-slate-400 text-slate-600 text-[11px] font-bold uppercase tracking-wider select-none`}
                  >
                    <th className="py-3 px-4 min-w-[150px]">Fruit Category</th>
                    <th className="py-3 px-3 min-w-[150px]">
                      Variety (Vakkal)
                    </th>
                    <th className="py-3 px-3 w-24 text-right">Carets</th>
                    <th className="py-3 px-3 w-28 text-right">Weight (KG)</th>
                    <th className="py-3 px-3 w-28 text-right">Rate / KG</th>
                    <th className="py-3 px-4 w-36 text-right font-black text-emerald-500 min-w-[130px]">
                      Amount
                    </th>
                    <th className="py-3 px-3 min-w-[140px]">Notes</th>
                    <th className="py-3 px-3 w-16 text-center">Act.</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100 font-mono">
                  {items.map((it, idx) => {
                    const fruitObj =
                      fruits.find((f) => f.name === it.fruitCategory) ||
                      fruits[0];
                    const varieties = fruitObj?.varieties || ["Standard"];
                    return (
                      <tr
                        key={it.id}
                        className="dark:hover:bg-slate-800/30 hover:bg-slate-50/80 font-sans group transition-colors"
                      >
                        {/* Fruit Category */}
                        <td className="p-1.5 px-3" data-pinv-cell={`${idx}-0`}>
                          <Combobox
                            value={it.fruitCategory}
                            onChange={(val) =>
                              handleItemChange(idx, "fruitCategory", val)
                            }
                            options={fruits.map((f) => f.name)}
                            placeholder="Select fruit"
                            searchPlaceholder="Search or add fruit"
                            creatable={true}
                            onCreate={(nf) => addFruit(nf)}
                          />
                        </td>
                        {/* Variety */}
                        <td className="p-1.5" data-pinv-cell={`${idx}-1`}>
                          <Combobox
                            value={it.variety}
                            onChange={(val) =>
                              handleItemChange(idx, "variety", val)
                            }
                            options={varieties}
                            placeholder="Select variety"
                            searchPlaceholder="Search or add variety"
                            creatable={true}
                            onCreate={(nv) => {
                              if (fruitObj) addFruitVariety(fruitObj.id, nv);
                            }}
                          />
                        </td>
                        {/* Carets */}
                        <td className="p-1.5 text-right">
                          <input
                            type="number"
                            data-pinv-cell={`${idx}-2`}
                            value={it.caret === 0 ? "" : it.caret}
                            placeholder="0"
                            onChange={(e) =>
                              handleItemChange(idx, "caret", e.target.value)
                            }
                            onKeyDown={(e) => handleKeyDown(e, idx, 2)}
                            className={`w-full ${inp} p-2 text-right text-xs font-mono font-semibold`}
                          />
                        </td>
                        {/* Weight */}
                        <td className="p-1.5 text-right">
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
                            className={`w-full ${inp} p-2 text-right text-xs font-mono font-semibold`}
                          />
                        </td>
                        {/* Rate */}
                        <td className="p-1.5 text-right">
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
                        </td>
                        {/* Amount */}
                        <td className="p-2 px-4 text-right font-black font-mono text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/15 bg-emerald-50/40 text-sm">
                          ₹ {it.amount.toLocaleString("en-IN")}
                        </td>
                        {/* Row Note */}
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={it.rowNote || ""}
                            placeholder="Supplier note"
                            onChange={(e) =>
                              handleItemChange(idx, "rowNote", e.target.value)
                            }
                            className={`w-full ${inp} p-2 text-xs`}
                          />
                        </td>
                        {/* Actions */}
                        <td className="p-1.5 text-center">
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
                              className={`p-1.5 ${muted} hover:text-rose-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors disabled:opacity-30`}
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
                      className={`py-3.5 px-4 text-right ${muted}`}
                    >
                      Subtotal
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {totalCarets} CRT
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">
                      {totalWeight.toFixed(1)} KG
                    </td>
                    <td
                      className={`py-3.5 px-3 text-right ${muted} text-[10px]`}
                    >
                      Avg ₹{" "}
                      {(totalWeight > 0
                        ? itemsSubtotal / totalWeight
                        : 0
                      ).toFixed(1)}
                      /KG
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-black text-base">
                      ₹ {itemsSubtotal.toLocaleString("en-IN")}
                    </td>
                    <td
                      colSpan={2}
                      className={`py-3.5 px-3 ${muted} text-[10px] font-normal`}
                    >
                      <kbd className="dark:bg-slate-800 bg-slate-100 px-1 rounded font-mono">
                        Enter
                      </kbd>{" "}
                      next cell &nbsp;
                      <kbd className="dark:bg-slate-800 bg-slate-100 px-1 rounded font-mono">
                        Alt+A
                      </kbd>{" "}
                      add row
                    </td>
                  </tr>
                  {(freight > 0 || hamali > 0) && (
                    <tr
                      className={`dark:bg-slate-900/50 bg-slate-50/60 font-bold text-xs border-t dark:border-slate-800 border-slate-100`}
                    >
                      <td
                        colSpan={5}
                        className={`py-2.5 px-4 text-right ${muted}`}
                      >
                        {freight > 0
                          ? `Freight  ₹ ${freight.toLocaleString("en-IN")}`
                          : ""}
                        {freight > 0 && hamali > 0 ? " + " : ""}
                        {hamali > 0
                          ? `Hamali  ₹ ${hamali.toLocaleString("en-IN")}`
                          : ""}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-black text-base">
                        ₹ {todayAmount.toLocaleString("en-IN")}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  )}
                </tfoot>
              </table>
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
                  className="px-5 py-3 dark:bg-slate-800 bg-slate-100 dark:hover:bg-slate-700 hover:bg-slate-200 dark:text-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors border dark:border-slate-700 border-slate-200"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleSaveInvoice}
                  className="px-7 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-black shadow-lg shadow-emerald-500/20 cursor-pointer transition-all flex items-center gap-2"
                >
                  <Save className="w-5 h-5 stroke-[2.5]" />
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
        <div
          className={`${card} p-5 space-y-5 ${isCompact ? "table-compact" : ""}`}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b dark:border-slate-800 border-slate-100 pb-4">
            <h2 className="text-sm font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span>Purchase Bills</span>
              <span
                className={`text-[10px] font-mono font-bold dark:bg-slate-800 bg-slate-100 ${muted} px-2 py-0.5 rounded border dark:border-slate-700 border-slate-200`}
              >
                {table.totalRecords}
              </span>
            </h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() =>
                  setDensity(
                    density === "compact"
                      ? "comfortable"
                      : density === "comfortable"
                        ? "spacious"
                        : "compact",
                  )
                }
                className="erp-btn-secondary px-3 py-2 text-xs capitalize"
              >
                {density}
              </button>
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
                  className={`${hdr} dark:text-slate-400 text-slate-600 text-[11px] font-bold uppercase tracking-wider`}
                >
                  <th className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => table.toggleSort("billNo")}
                      className="inline-flex items-center gap-1"
                    >
                      Bill / Date <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3.5 px-3">Supplier</th>
                  <th className="py-3.5 px-3">Vehicle</th>
                  <th className="py-3.5 px-3 text-right">Carets</th>
                  <th className="py-3.5 px-3 text-right">Weight</th>
                  <th className="py-3.5 px-3 text-right font-black text-emerald-500">
                    <button
                      type="button"
                      onClick={() => table.toggleSort("todayAmount")}
                      className="inline-flex items-center gap-1 ml-auto"
                    >
                      Bill Total <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3.5 px-3 text-right font-black dark:text-slate-200 text-slate-900">
                    <button
                      type="button"
                      onClick={() => table.toggleSort("remainingBalance")}
                      className="inline-flex items-center gap-1 ml-auto"
                    >
                      Balance <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3.5 px-4 text-center sticky right-0 bg-[var(--table-header-bg)] z-[3]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                {isListLoading ? (
                  <tr>
                    <td colSpan={8} className="p-0">
                      <TableSkeleton rows={6} cols={8} compact={isCompact} />
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
                        <td className="py-3.5 px-4 font-mono">
                          <span className="font-bold dark:text-slate-200 text-slate-900 block text-sm">
                            {inv.billNo}
                          </span>
                          <span
                            className={`text-[11px] ${muted} flex items-center mt-0.5 font-sans`}
                          >
                            <Calendar className="w-3 h-3 mr-1 text-emerald-500" />
                            {fmtDateWithDay(inv.date)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-sans">
                          <span className="font-bold dark:text-white text-slate-900 block text-sm">
                            {inv.supplierName}
                          </span>
                          <span
                            className={`${muted} text-[11px] block truncate max-w-[180px]`}
                          >
                            {inv.items.length} item
                            {inv.items.length !== 1 ? "s" : ""} •{" "}
                            {inv.items
                              .map((i) => i.fruitCategory || i.fruit)
                              .join(", ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 font-sans">
                          {inv.vehicleNo ? (
                            <span className="font-mono font-bold dark:text-slate-300 text-slate-700 text-xs">
                              {inv.vehicleNo}
                            </span>
                          ) : (
                            <span className={`${muted} text-xs`}>—</span>
                          )}
                          {inv.declaredWeight ? (
                            <span className={`block text-[10px] ${muted}`}>
                              {inv.declaredWeight} KG declared
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-semibold dark:text-slate-300 text-slate-700">
                          {carets}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-semibold dark:text-slate-300 text-slate-700">
                          {weight.toFixed(1)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-black font-mono text-emerald-500 text-sm">
                          ₹ {inv.todayAmount.toLocaleString("en-IN")}
                          {inv.freight || inv.hamali ? (
                            <span
                              className={`block text-[10px] font-sans font-normal ${muted}`}
                            >
                              incl. charges
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3.5 px-3 text-right font-black font-mono dark:text-slate-100 text-slate-900 text-sm">
                          ₹ {inv.remainingBalance.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 text-center font-sans sticky right-0 bg-[var(--card-bg)] z-[2] border-l border-[var(--table-border)]">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setPreviewInvoice(inv)}
                              className="px-3 py-1.5 dark:bg-slate-800 bg-slate-100 hover:bg-emerald-600 dark:hover:bg-emerald-600 hover:text-white dark:text-slate-300 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-sm cursor-pointer border dark:border-slate-700 border-slate-200"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={async () => {
                                const ok = await dialog.confirm({
                                  variant: "destructive",
                                  title: `Delete ${inv.billNo}?`,
                                  description: `This will permanently delete the bill for ${inv.supplierName}.`,
                                  confirmText: "Delete",
                                });
                                if (ok) {
                                  deletePurchaseInvoice(inv.id);
                                  toast.info("Bill Deleted", inv.billNo);
                                }
                              }}
                              className={`p-2 ${muted} hover:text-rose-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors`}
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
