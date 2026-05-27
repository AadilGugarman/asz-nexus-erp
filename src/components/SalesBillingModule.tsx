import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  ShoppingCart, Plus, Save, Search, Eye, Trash2,
  FileText, Calendar, Copy, ArrowUpDown
} from "lucide-react";

import { useApp } from "@/context/AppContext";
import { useDataTable } from "../hooks/useDataTable";
import { useAppTranslation } from "@/hooks";

import { CommandSelect, CommandOption } from "./ui/CommandSelect";
import { useToast } from "./ui/Toast";
import { useConfirmDialog } from "./ui/ConfirmDialog";
import { DataTable, Pagination } from "./ui/table";
import { ModuleEmptyState } from "./ui/DataStates";
import { InvoicePreviewModal } from "./InvoicePreviewModal";

import { Invoice, InvoiceItem } from "../types";
import { getNextUniqueInvoiceNumber } from "../utils/invoice-number";
import { fmtDate, sumCurrency, roundCurrency, getFruitPricingType, calcItemAmount } from "@/utils/format";

//        helpers
// formatDateWithDay is now fmtDateWithDay from utils/format

function makeBlankItem(
  fruits: { name: string; varieties: string[]; pricingType?: 'kg' | 'caret' }[],
): InvoiceItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    fruitCategory: "",
    fruit: "",
    lotVariety: "",
    caret: 0,
    weight: 0,
    rate: 0,
    amount: 0,
    pricingType: 'caret',
  };
}

//        shared style tokens
const card =
  "dark:bg-slate-900 bg-white rounded-2xl border dark:border-slate-800 border-slate-200/80 shadow-sm";
const hdr =
  "dark:bg-slate-950 bg-slate-50/80 border-b dark:border-slate-800 border-slate-200/80";
const inp =
  "dark:bg-slate-950 bg-white border dark:border-slate-700/80 border-slate-200 dark:text-white text-slate-900 rounded-lg outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10";
const muted = "dark:text-slate-400 text-slate-500";
const lbl = "dark:text-slate-400 text-slate-600";

const FRUIT_EMOJIS: Record<string, string> = {
  mango: '🥭', apple: '🍎', banana: '🍌', pomegranate: '🫐', grapes: '🍇',
  citrus: '🍊', watermelon: '🍉', orange: '🍊', lemon: '🍋', pineapple: '🍍',
  strawberry: '🍓', cherry: '🍒', peach: '🍑', pear: '🍐', kiwi: '🥝',
  coconut: '🥥', papaya: '🥭', guava: '🥝', fig: '🫐', plum: '🫐',
};

const getEmoji = (name: string): string => {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(FRUIT_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return '🍃';
};

export const SalesBillingModule: React.FC = () => {
  const {
    customers,
    fruits,
    invoices,
    saveInvoice,
    deleteInvoice,
    addFruit,
    addFruitVariety,
    settings,
    updateSettings,
    addCaretTransaction,
  } = useApp();
  const { t } = useAppTranslation("billing");
  const toast = useToast();
  const dialog = useConfirmDialog();

  const [activeSubTab, setActiveSubTab] = useState<"NEW_INVOICE" | "LIST">(
    "NEW_INVOICE",
  );
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  //        form state
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [declaredWeight, setDeclaredWeight] = useState<number>(0);
  const [freightInput, setFreightInput] = useState<number>(0);
  const [caretInput, setCaretInput] = useState<number>(0); // caret given to customer
  const [items, setItems] = useState<InvoiceItem[]>(() => [
    makeBlankItem(fruits),
  ]);

  const dateRef = useRef<HTMLInputElement>(null);

  const customerOptions: CommandOption[] = useMemo(() => {
    return customers.map(c => ({
      id: c.id,
      label: c.name,
      subtitle: c.phone ? `${c.phone} • ${c.city}` : c.city,
      emoji: '👤'
    }));
  }, [customers]);

  const fruitOptions: CommandOption[] = useMemo(() => {
    return fruits.map(f => ({
      id: f.id,
      label: f.name,
      subtitle: `${f.varieties.length} varieties`,
      emoji: getEmoji(f.name)
    }));
  }, [fruits]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [selectedCustomerId, customers],
  );

  // auto invoice number
  useEffect(() => {
    if (!settings.invoice.autoInvoiceNo) {
      if (!invoiceNo.trim()) {
        const p = getNextUniqueInvoiceNumber(
          settings.invoice,
          invoices,
          date,
          settings.invoice.salesNextNo || 1001,
        );
        setInvoiceNo(p.invoiceNo);
      }
      return;
    }
    const next = getNextUniqueInvoiceNumber(
      settings.invoice,
      invoices,
      date,
      settings.invoice.salesNextNo || 1001,
    );
    setInvoiceNo(next.invoiceNo);
  }, [settings.invoice, invoices, date]);

  //        calculations
  const itemsSubtotal = sumCurrency(items.map(it => parseFloat(String(it.amount)) || 0));
  const freight = roundCurrency(parseFloat(String(freightInput)) || 0);
  const todayAmount = roundCurrency(itemsSubtotal + freight);
  const previousBalance = selectedCustomer?.previousBalance ?? 0;
  const remainingBalance = roundCurrency(previousBalance + todayAmount);
  const totalCarets = items.reduce(
    (s, it) => s + (parseFloat(String(it.caret)) || 0),
    0,
  );
  const totalWeight = sumCurrency(items.map(it => parseFloat(String(it.weight)) || 0));

  //        item helpers
  const handleItemChange = (
    index: number,
    field: keyof InvoiceItem,
    value: any,
  ) => {
    const updated = [...items];
    const item = { ...updated[index] };
    if (field === "fruitCategory") {
      item.fruitCategory = value;
      item.fruit = value;
      const fObj = fruits.find((f) => f.name === value);
      item.lotVariety = fObj?.varieties[0] || "Standard";
      // Update pricing type when fruit changes
      item.pricingType = getFruitPricingType(value, fObj?.pricingType);
      // Recalculate amount with new pricing type
      const w = parseFloat(String(item.weight)) || 0;
      const c = parseFloat(String(item.caret)) || 0;
      const r = parseFloat(String(item.rate)) || 0;
      item.amount = calcItemAmount(item.pricingType, w, c, r);
    } else if (field === "caret" || field === "weight" || field === "rate") {
      (item as any)[field] = value;
      const pricingType = item.pricingType ?? getFruitPricingType(item.fruitCategory || item.fruit || '');
      const w = field === "weight" ? parseFloat(value) || 0 : parseFloat(String(item.weight)) || 0;
      const c = field === "caret" ? parseFloat(value) || 0 : parseFloat(String(item.caret)) || 0;
      const r = field === "rate" ? parseFloat(value) || 0 : parseFloat(String(item.rate)) || 0;
      item.amount = calcItemAmount(pricingType, w, c, r);
    } else {
      (item as any)[field] = value;
    }
    updated[index] = item;
    setItems(updated);
  };

  const addItemRow = () => setItems((prev) => [...prev, makeBlankItem(fruits)]);
  const duplicateItemRow = (i: number) => {
    const s = items[i];
    if (!s) return;
    const d: InvoiceItem = {
      ...s,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const u = [...items];
    u.splice(i + 1, 0, d);
    setItems(u);
  };
  const removeItemRow = (i: number) => {
    if (items.length > 1) setItems(items.filter((_, idx) => idx !== i));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    row: number,
    col: number,
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = document.querySelector(
        `[data-inv-cell="${row}-${col + 1}"]`,
      ) as HTMLElement;
      if (next) {
        next.focus();
        return;
      }
      const nextRow = document.querySelector(
        `[data-inv-cell="${row + 1}-0"]`,
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
              `[data-inv-cell="${row + 1}-0"]`,
            ) as HTMLElement
          )?.focus(),
        50,
      );
    } else if (e.key === "ArrowUp") {
      (
        document.querySelector(
          `[data-inv-cell="${row - 1}-${col}"]`,
        ) as HTMLElement
      )?.focus();
    } else if (e.key === "ArrowDown") {
      const t = document.querySelector(
        `[data-inv-cell="${row + 1}-${col}"]`,
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
    const next = getNextUniqueInvoiceNumber(
      settings.invoice,
      invoices,
      date,
      settings.invoice.salesNextNo || 1001,
    );
    setInvoiceNo(next.invoiceNo);
    setSelectedCustomerId("");
    setItems([makeBlankItem(fruits)]);
    setVehicleNo("");
    setDeclaredWeight(0);
    setFreightInput(0);
    setCaretInput(0);
    setNotes("");
  };

  const handleSaveInvoice = () => {
    if (!selectedCustomer) {
      toast.error("No Customer", "Please select a customer.");
      return;
    }
    if (itemsSubtotal <= 0) {
      toast.warning("Empty Invoice", "Add at least one item with a value.");
      return;
    }

    let resolvedNo = invoiceNo.trim();
    let nextSeed = settings.invoice.salesNextNo || 1001;

    if (settings.invoice.autoInvoiceNo) {
      const next = getNextUniqueInvoiceNumber(
        settings.invoice,
        invoices,
        date,
        nextSeed,
      );
      resolvedNo = next.invoiceNo;
      nextSeed = next.nextSeed;
    } else {
      if (!resolvedNo) {
        toast.error("Missing Invoice No", "Enter an invoice number.");
        return;
      }
      if (invoices.some((i) => i.invoiceNo === resolvedNo)) {
        toast.error("Duplicate Invoice No", "This number already exists.");
        return;
      }
      nextSeed = nextSeed + 1;
    }

    const inv: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNo: resolvedNo,
      date,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      vehicleNo: vehicleNo || undefined,
      declaredWeight: declaredWeight || undefined,
      previousBalance,
      todayAmount,
      freight: freight || undefined,
      paidAmount: 0,
      remainingBalance,
      notes: notes || undefined,
      items,
      createdAt: new Date().toISOString(),
    };
    saveInvoice(inv);
    updateSettings({ invoice: { ...settings.invoice, salesNextNo: nextSeed } });

    // Auto-create GIVEN caret transaction if carets were given
    const totalCaretsGiven = caretInput > 0
      ? caretInput
      : items.reduce((s, it) => s + (Number(it.caret) || 0), 0);
    if (totalCaretsGiven > 0 && selectedCustomer) {
      const fruitNames = [...new Set(items.map(it => it.fruitCategory || it.fruit).filter(Boolean))].join(', ');
      addCaretTransaction({
        date,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        type: 'GIVEN',
        fruitName: fruitNames || 'Mixed',
        caretQty: totalCaretsGiven,
        note: `Auto from Invoice ${resolvedNo}`,
        billId: inv.id,
        billNo: resolvedNo,
      });
    }

    toast.success(
      "Invoice Saved",
      `${resolvedNo} - Rs.${todayAmount.toLocaleString("en-IN")} for ${selectedCustomer.name}`,
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
      invoices.filter(
        (inv) =>
          inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (inv.vehicleNo || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          inv.items.some((it) =>
            it.fruit.toLowerCase().includes(searchTerm.toLowerCase()),
          ),
      ),
    [invoices, searchTerm],
  );

  const table = useDataTable<
    Invoice,
    "date" | "invoiceNo" | "customerName" | "todayAmount" | "remainingBalance"
  >({
    data: filteredInvoices,
    initialSortBy: "date",
    initialSortDir: "desc",
    initialPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
    sortComparators: {
      date: (a, b) => a.date.localeCompare(b.date),
      invoiceNo: (a, b) => a.invoiceNo.localeCompare(b.invoiceNo),
      customerName: (a, b) => a.customerName.localeCompare(b.customerName),
      todayAmount: (a, b) => a.todayAmount - b.todayAmount,
      remainingBalance: (a, b) => a.remainingBalance - b.remainingBalance,
    },
    resetPageOn: [activeSubTab],
  });

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
    selectedCustomerId,
    notes,
    invoiceNo,
    date,
    freightInput,
  ]);

  //        render
  return (
    <div className="flex-1 flex flex-col gap-5 font-sans min-h-0">
      {/*        PAGE HEADER        */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${card} p-4 shrink-0`}
      >
        <div>
          <h1 className="text-xl font-black dark:text-white text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShoppingCart className="w-6 h-6 text-indigo-500" />
            <span>SALES BILLING</span>
          </h1>
          <p className={`text-xs ${muted} mt-0.5`}>
            Create customer invoices with vehicle & freight details
          </p>
        </div>
        <div className="flex items-center gap-1.5 dark:bg-slate-950 bg-slate-100 p-1 rounded-xl border dark:border-slate-800 border-slate-200/80">
          {[
            {
              id: "NEW_INVOICE",
              label: "New Invoice",
              icon: <Plus className="w-4 h-4" />,
            },
            {
              id: "LIST",
              label: `Invoices (${invoices.length})`,
              icon: <FileText className="w-4 h-4" />,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                activeSubTab === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
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
          NEW INVOICE FORM
                                                                                                                                                    */}
      {activeSubTab === "NEW_INVOICE" && (
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/*        COMPACT FORM HEADER        */}
          <div className={`${card} overflow-hidden shrink-0`}>
            {/* Row 1: Invoice No    Date    Customer    Vehicle No    Freight */}
            <div className="grid grid-cols-[auto_1fr_1.5fr_1fr_1fr_1fr] gap-0 divide-x dark:divide-slate-800 divide-slate-100">
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5 min-w-[150px]">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${lbl}`}
                >
                  Invoice No
                </span>
                {settings.invoice.autoInvoiceNo ? (
                  <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">
                    {invoiceNo}
                  </span>
                ) : (
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value.toUpperCase())}
                    className={`${inp} px-2 py-1 text-xs font-mono font-bold w-full`}
                    placeholder="INV-001..."
                  />
                )}
              </div>
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${lbl}`}
                >
                  Date
                </span>
                <div className="relative">
                  <input
                    ref={dateRef}
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={`${inp} px-2 py-1 text-xs font-mono font-bold w-full pr-20`}
                  />
                  {date && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold uppercase border border-slate-200 dark:border-slate-700 pointer-events-none leading-tight">
                      {new Date(`${date}T00:00:00`).toLocaleDateString(
                        "en-IN",
                        { weekday: "long" },
                      )}
                    </span>
                  )}
                </div>
              </div>
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5">
                <CommandSelect
                  id="sales-customer"
                  variant="violet"
                  label="Customer / Buyer"
                  value={selectedCustomerId}
                  onChange={(val) => {
                    const m = customers.find((c) => c.id === val || c.name === val);
                    if (m) setSelectedCustomerId(m.id);
                  }}
                  options={customerOptions}
                  placeholder="Select customer"
                  creatable={false}
                />
              </div>
              {/* Vehicle No */}
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${lbl}`}
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
              {/* Freight / Bhaada */}
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider ${lbl}`}
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
                    className={`${inp} pl-5 pr-2 py-1 text-xs font-mono font-bold dark:text-indigo-400 text-indigo-600 w-full`}
                  />
                </div>
              </div>
              {/* Caret Given */}
              <div className="px-4 py-3 flex flex-col justify-center gap-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${lbl}`}>
                  Caret Given 📦
                </span>
                <input
                  type="number"
                  value={caretInput === 0 ? "" : caretInput}
                  placeholder="Auto from items"
                  onChange={(e) => setCaretInput(parseInt(e.target.value) || 0)}
                  className={`${inp} px-2 py-1 text-xs font-mono font-bold dark:text-amber-400 text-amber-600 w-full`}
                />
              </div>
            </div>
          </div>

          {/*        ITEMS TABLE        */}
          <div className={`${card} overflow-hidden flex-1 flex flex-col min-h-0`}>
            <div
              className={`px-5 py-3.5 ${hdr} flex items-center justify-between shrink-0`}
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider dark:text-slate-200 text-slate-800">
                  Invoice Items
                </span>
                <span
                  className={`text-[10px] font-mono font-bold dark:bg-slate-800 bg-slate-100 ${muted} px-2 py-0.5 rounded-full border dark:border-slate-700 border-slate-200`}
                >
                  {items.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={addItemRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Row</span>
                </button>
              </div>
            </div>

            {/* overflow-x-auto with min-w-0 prevents the wrapper from expanding the parent card */}
            <div className="flex-1 overflow-auto custom-scrollbar min-w-0">
              {/* table-fixed locks column widths so tfoot content never causes reflow */}
              <table className="erp-table w-full text-left text-xs sm:text-sm table-fixed">
                <colgroup>
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '8%' }} />
                </colgroup>
                <thead>
                  <tr
                    className={`${hdr} dark:text-slate-400 text-slate-600 text-[11px] font-bold uppercase tracking-wider select-none sticky top-0 z-10`}
                  >
                    <th className="py-3 px-4 col-text">Fruit Category</th>
                    <th className="py-3 px-3 col-text">
                      Variety (Vakkal)
                    </th>
                    <th className="py-3 px-3 col-num">Carets / Crt</th>
                    <th className="py-3 px-3 col-num">Weight (KG)</th>
                    <th className="py-3 px-3 col-num">Rate</th>
                    <th className="py-3 px-4 col-num font-black text-indigo-600 dark:text-indigo-400">
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
                    const pricingType = it.pricingType ?? getFruitPricingType(it.fruitCategory || it.fruit || '', fruitObj?.pricingType);
                    const isByKg = pricingType === 'kg';
                    return (
                      <tr
                        key={it.id}
                        className="dark:hover:bg-slate-800/30 hover:bg-slate-50/80 font-sans group transition-colors"
                      >
                        {/* Fruit Category */}
                        <td className="p-1.5 px-3 col-text" data-inv-cell={`${idx}-0`}>
                          <CommandSelect
                            variant="violet"
                            value={it.fruitCategory}
                            onChange={(val) => {
                              const f = fruits.find(f => f.id === val || f.name === val);
                              handleItemChange(idx, "fruitCategory", f?.name || val);
                            }}
                            options={fruitOptions}
                            placeholder="Select fruit"
                            creatable={true}
                            onAdd={(nf) => addFruit(nf)}
                          />
                        </td>
                        {/* Variety */}
                        <td className="p-1.5 col-text" data-inv-cell={`${idx}-1`}>
                          <CommandSelect
                            variant="violet"
                            value={it.lotVariety}
                            onChange={(val) => handleItemChange(idx, "lotVariety", val)}
                            options={varieties.map(v => ({ id: v, label: v, emoji: '📦' }))}
                            placeholder="Select variety"
                            creatable={true}
                            onAdd={(nv) => {
                              if (fruitObj) addFruitVariety(fruitObj.id, nv);
                            }}
                          />
                        </td>
                        {/* Carets — primary qty for non-mango, secondary for mango */}
                        <td className="p-1.5 col-num">
                          <div className="relative">
                            <input
                              type="number"
                              data-inv-cell={`${idx}-2`}
                              value={it.caret === 0 ? "" : it.caret}
                              placeholder="0"
                              onChange={(e) =>
                                handleItemChange(idx, "caret", e.target.value)
                              }
                              onKeyDown={(e) => handleKeyDown(e, idx, 2)}
                              className={`w-full ${inp} p-2 text-right text-xs font-mono font-semibold ${it.fruitCategory && !isByKg ? 'ring-2 ring-amber-400/50 border-amber-400/70' : ''}`}
                            />
                            {!isByKg && (
                              <span className="absolute -top-2 right-1 text-[8px] font-black text-indigo-500 uppercase tracking-wider bg-white dark:bg-slate-950 px-1">Caret</span>
                            )}
                          </div>
                        </td>
                        {/* Weight — primary qty for mango, secondary for others */}
                        <td className="p-1.5 col-num">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              data-inv-cell={`${idx}-3`}
                              value={it.weight === 0 ? "" : it.weight}
                              placeholder="0.0"
                              onChange={(e) =>
                                handleItemChange(idx, "weight", e.target.value)
                              }
                              onKeyDown={(e) => handleKeyDown(e, idx, 3)}
                              className={`w-full ${inp} p-2 text-right text-xs font-mono font-semibold ${it.fruitCategory && isByKg ? 'ring-2 ring-amber-400/50 border-amber-400/70' : ''}`}
                            />
                            {isByKg && (
                              <span className="absolute -top-2 right-1 text-[8px] font-black text-indigo-500 uppercase tracking-wider bg-white dark:bg-slate-950 px-1">KG</span>
                            )}
                          </div>
                        </td>
                        {/* Rate — label changes based on pricing type */}
                        <td className="p-1.5 col-num">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.5"
                              data-inv-cell={`${idx}-4`}
                              value={it.rate === 0 ? "" : it.rate}
                              placeholder="0.00"
                              onChange={(e) =>
                                handleItemChange(idx, "rate", e.target.value)
                              }
                              onKeyDown={(e) => handleKeyDown(e, idx, 4)}
                              className={`w-full ${inp} p-2 text-right text-xs font-mono font-bold dark:text-indigo-300 text-indigo-600`}
                            />
                            <span className="absolute -top-2 right-1 text-[8px] font-black text-indigo-500 uppercase tracking-wider bg-white dark:bg-slate-950 px-1">
                              {isByKg ? '₹/KG' : '₹/Crt'}
                            </span>
                          </div>
                        </td>
                        {/* Amount */}
                        <td className="p-2 px-4 col-num font-black font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 text-sm">
                          ₹ {it.amount.toLocaleString("en-IN")}
                        </td>
                        {/* Actions */}
                        <td className="p-1.5 col-actions">
                          <div className="flex items-center justify-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => duplicateItemRow(idx)}
                              title="Duplicate"
                              className={`p-1.5 ${muted} hover:text-indigo-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors`}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              disabled={items.length <= 1}
                              title="Remove"
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
                <tfoot className="sticky bottom-0 z-10">
                  <tr
                    className={`${hdr} font-bold text-xs uppercase tracking-wider dark:text-slate-300 text-slate-800 font-sans border-t-2 dark:border-slate-700 border-slate-200`}
                  >
                    <td
                      colSpan={2}
                      className={`py-3.5 px-4 col-text text-right ${muted}`}
                    >
                      Subtotal
                    </td>
                    <td className="py-3.5 px-3 col-num font-mono text-indigo-600 dark:text-indigo-400">
                      {totalCarets} CRT
                    </td>
                    <td className="py-3.5 px-3 col-num font-mono text-indigo-600 dark:text-indigo-400">
                      {totalWeight.toFixed(1)} KG
                    </td>
                    <td
                      className={`py-3.5 px-3 col-num text-right ${muted} text-[10px]`}
                    >
                      {(() => {
                        // Show avg rate label based on mix of pricing types
                        const hasKg = items.some(it => (it.pricingType ?? getFruitPricingType(it.fruitCategory || it.fruit || '')) === 'kg');
                        const hasCaret = items.some(it => (it.pricingType ?? getFruitPricingType(it.fruitCategory || it.fruit || '')) === 'caret');
                        if (hasKg && !hasCaret) return `₹ ${totalWeight > 0 ? (itemsSubtotal / totalWeight).toFixed(1) : '0'}/KG`;
                        if (hasCaret && !hasKg) return `₹ ${totalCarets > 0 ? (itemsSubtotal / totalCarets).toFixed(1) : '0'}/Crt`;
                        return `Mixed Pricing`;
                      })()}
                    </td>
                    <td className="py-3.5 px-4 col-num font-mono text-indigo-600 dark:text-indigo-400 font-black text-base bg-indigo-500/10 border-l border-indigo-500/20">
                      ₹ {itemsSubtotal.toLocaleString("en-IN")}
                    </td>
                    <td
                      className={`py-3.5 px-3 col-actions ${muted} text-[10px] font-normal`}
                    >
                      {/* Keyboard hints removed as requested */}
                    </td>
                  </tr>
                  {freight > 0 && (
                    <tr
                      className={`dark:bg-slate-900/50 bg-slate-50/60 font-bold text-xs border-t dark:border-slate-800 border-slate-100`}
                    >
                      {/* Use individual cells matching the colgroup widths — never colSpan with dynamic text */}
                      <td className={`py-2.5 px-4 col-text ${muted} overflow-hidden`} />
                      <td className={`py-2.5 px-3 col-text text-right ${muted} overflow-hidden whitespace-nowrap`}>
                        Lorry Freight (Bhaada)
                      </td>
                      <td className={`py-2.5 px-3 col-num overflow-hidden`} />
                      <td className={`py-2.5 px-3 col-num overflow-hidden`} />
                      <td className={`py-2.5 px-3 col-num text-right ${muted} overflow-hidden whitespace-nowrap`}>
                        ₹ {freight.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 px-4 col-num font-mono text-indigo-600 dark:text-indigo-400 font-black text-base overflow-hidden">
                        ₹ {todayAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="col-actions" />
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>

            {/* Summary Strip: Previous | Today | Receivable */}
            <div className="grid grid-cols-3 gap-0 divide-x dark:divide-slate-800 divide-slate-100 border-t dark:border-slate-800 border-slate-100 shrink-0">
              <div className="px-5 py-3 flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${muted}`}
                >
                  Previous Balance
                </span>
                <span className="text-sm font-black font-mono dark:text-slate-200 text-slate-900">
                  ₹ {previousBalance.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="px-5 py-3 flex items-center justify-between dark:bg-indigo-950/20 bg-indigo-50/40">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  + Today's Bill
                </span>
                <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400">
                  ₹ {todayAmount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="px-5 py-3 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                  = Total Receivable
                </span>
                <span className="text-base font-black font-mono text-white">
                  ₹ {remainingBalance.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/*        FOOTER: notes + save        */}
            <div
              className={`p-5 ${hdr} border-t flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0`}
            >
              <div className="flex items-center gap-3 w-full sm:w-1/2">
                <span
                  className={`text-[11px] ${lbl} font-bold uppercase tracking-wider whitespace-nowrap`}
                >
                  Notes
                </span>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Invoice notes / remarks"
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
                  className="px-7 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-500/20 cursor-pointer transition-all flex items-center gap-2"
                >
                  <Save className="w-5 h-5 stroke-[2.5]" />
                  <span>Save Invoice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*                                                                                                                                           
          INVOICE LIST
                                                                                                                                                    */}
      {activeSubTab === "LIST" && (
        <div className={`flex-1 flex flex-col gap-5 min-h-0 ${card} p-5`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b dark:border-slate-800 border-slate-100 pb-4 shrink-0">
            <h2 className="text-sm font-bold dark:text-white text-slate-900 flex items-center gap-2">
              <span>Sales Invoices</span>
              <span
                className={`text-[10px] font-mono font-bold dark:bg-slate-800 bg-slate-100 ${muted} px-2 py-0.5 rounded border dark:border-slate-700 border-slate-200`}
              >
                {table.totalRecords}
              </span>
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className={`w-4 h-4 ${muted} absolute left-3 top-3`} />
              <input
                ref={listSearchRef}
                type="text"
                placeholder="Search invoices, customer, vehicle (/)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full ${inp} pl-9 pr-4 py-2.5 text-xs`}
              />
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
                label="invoices"
              />
            }
          >
            <table className="erp-table w-full text-left text-xs sm:text-sm">
              <thead>
                <tr
                  className={`${hdr} dark:text-slate-400 text-slate-600 text-[11px] font-bold uppercase tracking-wider sticky top-0 z-10`}
                >
                  <th className="py-3.5 px-4 col-text">
                    <button
                      type="button"
                      onClick={() => table.toggleSort("invoiceNo")}
                      className="inline-flex items-center gap-1"
                    >
                      Invoice / Date <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3.5 px-3 col-text">
                    <button
                      type="button"
                      onClick={() => table.toggleSort("customerName")}
                      className="inline-flex items-center gap-1"
                    >
                      Customer <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3.5 px-3 col-text">Vehicle</th>
                  <th className="py-3.5 px-3 col-num">Carets</th>
                  <th className="py-3.5 px-3 col-num">Weight</th>
                  <th className="py-3.5 px-3 col-num font-black text-indigo-600 dark:text-indigo-400">
                    <button
                      type="button"
                      onClick={() => table.toggleSort("todayAmount")}
                      className="inline-flex items-center gap-1 ml-auto"
                    >
                      Total <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3.5 px-3 col-num font-black dark:text-slate-200 text-slate-900">
                    <button
                      type="button"
                      onClick={() => table.toggleSort("remainingBalance")}
                      className="inline-flex items-center gap-1 ml-auto"
                    >
                      Balance <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3.5 px-4 col-actions w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                {table.totalRecords === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-0">
                      <ModuleEmptyState
                        title="No invoices yet"
                        subtitle="Create your first sales invoice above."
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
                    return (                      <tr
                        key={inv.id}
                        className="dark:hover:bg-slate-800/30 hover:bg-slate-50/80 transition-colors font-sans group"
                      >
                        <td className="py-3.5 px-4 col-text font-mono">
                          <span className="font-bold dark:text-slate-200 text-slate-900 block text-sm">
                            {inv.invoiceNo}
                          </span>
                          <span className={`text-[10px] ${muted} font-medium`}>
                            {fmtDate(inv.date)}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 col-text">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                              {inv.customerName.charAt(0)}
                            </div>
                            <span className="font-semibold text-[var(--text-primary)]">
                              {inv.customerName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 col-text">
                          <span className="font-mono text-xs font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {inv.vehicleNo || "DIRECT"}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 col-num font-mono font-bold text-slate-600 dark:text-slate-400">
                          {carets} <span className="text-[9px] font-sans">CRT</span>
                        </td>
                        <td className="py-3.5 px-3 col-num font-mono font-bold text-slate-600 dark:text-slate-400">
                          {weight.toFixed(1)}{" "}
                          <span className="text-[9px] font-sans">KG</span>
                        </td>
                        <td className="py-3.5 px-3 col-num font-mono font-black text-indigo-600 dark:text-indigo-400 text-base">
                          ₹ {inv.todayAmount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-3 col-num font-mono font-black dark:text-slate-200 text-slate-900 text-sm">
                          ₹ {inv.remainingBalance.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 col-actions">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => setPreviewInvoice(inv)}
                              className={`p-2 ${muted} hover:text-indigo-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors`}
                              title="View Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                dialog.confirm({
                                  title: "Delete Invoice?",
                                  message: `Are you sure you want to delete ${inv.invoiceNo}? This will also adjust the customer balance and inventory.`,
                                  confirmLabel: "Delete Invoice",
                                  confirmVariant: "danger",
                                  onConfirm: () => {
                                    deleteInvoice(inv.id);
                                    toast.success(
                                      "Invoice Deleted",
                                      "The invoice record and associated stock have been removed.",
                                    );
                                  },
                                });
                              }}
                              className={`p-2 ${muted} hover:text-rose-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors`}
                              title="Delete Invoice"
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

      <InvoicePreviewModal
        invoice={previewInvoice}
        onClose={() => setPreviewInvoice(null)}
      />
    </div>
  );
};
