import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Users,
  UserCheck,
  Search,
  Plus,
  LayoutGrid,
  List,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  TrendingDown,
  X,
  Edit3,
  Trash2,
  Building2,
  IndianRupee,
  Printer,
  ArrowUpDown,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from "lucide-react";

import { useApp } from "@/context/useApp";
import { useDataTable } from "../hooks/useDataTable";

import { DataTable, Pagination } from "./ui/table";
import { useToast } from "./ui/Toast";
import { useConfirmDialog } from "./ui/ConfirmDialog";
import { StatementPreview } from "./ui/StatementPreview";
import { CommandSelect, CommandOption } from "./ui/CommandSelect";

import { PaymentReceipt } from "../types";
import { fmtDate, roundCurrency } from "@/utils/format";
import { equalsText, includesText, normalizeText } from "@/utils/string";

type PartyType = "CUSTOMER" | "SUPPLIER" | "BOTH";
type ViewMode = "GRID" | "LIST";
type FilterTab = "ALL" | "CUSTOMER" | "SUPPLIER" | "BOTH";
type SortKey = "name" | "city" | "balance" | "type" | "phone";

interface UnifiedParty {
  id: string;
  name: string;
  type: PartyType;
  phone: string;
  email: string;
  gstin: string;
  city: string;
  state: string;
  billingAddress: string;
  shippingAddress: string;
  balance: number;
  balanceType: "DEBIT" | "CREDIT";
  creditLimit: number;
  notes: string;
  code: string;
  createdAt: string;
}

const emptyParty = (): UnifiedParty => ({
  id: "",
  name: "",
  type: "CUSTOMER",
  phone: "",
  email: "",
  gstin: "",
  city: "",
  state: "",
  billingAddress: "",
  shippingAddress: "",
  balance: 0,
  balanceType: "DEBIT",
  creditLimit: 0,
  notes: "",
  code: "",
  createdAt: new Date().toISOString(),
});

// ── Helpers ─────────────────────────────────
const TypeBadge = ({ type }: { type: PartyType }) => {
  const c = {
    CUSTOMER:
      "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    SUPPLIER:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    BOTH: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  };
  return (
    <span
      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border font-mono ${c[type]}`}
    >
      {{ CUSTOMER: "Customer", SUPPLIER: "Supplier", BOTH: "Both" }[type]}
    </span>
  );
};
const Av = ({
  name = "",
  size = "w-10 h-10",
}: {
  name?: string;
  size?: string;
}) => {
  const normalized = (name || "").trim();
  const initials = normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => Array.from(w)[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const fallback = Array.from(normalized)
    .filter((ch) => /\p{L}|\p{N}/u.test(ch))
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const display = initials || fallback || "?";
  const fontSize = display.length <= 1 ? "text-sm" : "text-[10px]";
  return (
    <div
      className={`${size} rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold shrink-0 shadow-sm overflow-hidden`}
      style={{ lineHeight: 1, letterSpacing: "0.02em" }}
    >
      <span className={`${fontSize} font-bold`}>{display}</span>
    </div>
  );
};
const Bal = ({
  balance,
  className = "text-sm",
}: {
  balance: number;
  className?: string;
}) => (
  <div className="flex items-center space-x-1">
    {balance >= 0 ? (
      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
    ) : (
      <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
    )}
    <span
      className={`font-mono font-bold ${className} ${balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
    >
      ₹{Math.abs(balance).toLocaleString("en-IN")}
    </span>
  </div>
);
const Inp = ({
  label,
  value,
  onChange,
  placeholder = "",
  mono = false,
  type = "text",
  required = false,
  icon,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  type?: string;
  required?: boolean;
  icon?: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] ml-1">
      {label}
      {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
    </label>
    <div className="relative group">
      {icon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-all duration-300 z-10">
          {React.cloneElement(
            icon as React.ReactElement<{ size?: number; strokeWidth?: number }>,
            { size: 14, strokeWidth: 3 },
          )}
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-white dark:bg-slate-950 border-2 dark:border-slate-800 border-slate-200 dark:text-white text-slate-900 rounded-xl py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-sm transition-all duration-300 ${icon ? "pl-10 pr-3.5" : "px-3.5"} ${mono ? "font-mono font-bold uppercase" : "font-normal"}`}
      />
    </div>
  </div>
);

export const PartiesModule: React.FC = () => {
  const {
    suppliers,
    customers,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getSupplierLedger,
    getCustomerLedger,
    addPayment,
  } = useApp();
  const toast = useToast();
  const dialog = useConfirmDialog();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("LIST");
  const [showModal, setShowModal] = useState(false);
  const [editingParty, setEditingParty] = useState<UnifiedParty | null>(null);

  const [form, setForm] = useState<UnifiedParty>(emptyParty());
  const [detailParty, setDetailParty] = useState<UnifiedParty | null>(null);

  // Customer Module States (for detail view)
  const [showStatement, setShowStatement] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<"CUSTOMER" | "SUPPLIER">(
    "CUSTOMER",
  );
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<
    "CASH" | "BANK_TRANSFER" | "CHEQUE" | "UPI"
  >("UPI");
  const [payRefNo, setPayRefNo] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const paymentModeOptions: CommandOption[] = [
    { id: "UPI", label: "UPI Transfer", emoji: "📱" },
    { id: "BANK_TRANSFER", label: "Bank Transfer (NEFT/RTGS)", emoji: "🏦" },
    { id: "CHEQUE", label: "Cheque", emoji: "🎫" },
    { id: "CASH", label: "Cash", emoji: "💵" },
  ];

  const f = (field: keyof UnifiedParty, value: any) =>
    setForm((p) => ({ ...p, [field]: value }));
  const isEditMode = editingParty !== null;

  // ── Unified party list ──────────────────────
  const allParties: UnifiedParty[] = useMemo(() => {
    const list: UnifiedParty[] = [];
    customers.forEach((c) => {
      const isBoth = suppliers.some(
        (s) => normalizeText(s.name) === normalizeText(c.name),
      );
      list.push({
        id: c.id,
        name: c.name,
        type: isBoth ? "BOTH" : "CUSTOMER",
        phone: c.phone || "",
        email: c.email || "",
        gstin: c.gstin || "",
        city: c.city || "",
        state: c.state || "",
        billingAddress: c.billingAddress || "",
        shippingAddress: c.shippingAddress || "",
        balance: c.previousBalance,
        balanceType: c.previousBalance >= 0 ? "DEBIT" : "CREDIT",
        creditLimit: c.creditLimit || 0,
        notes: c.notes || "",
        code: "",
        createdAt: "",
      });
    });
    suppliers.forEach((s) => {
      if (!list.some((p) => normalizeText(p.name) === normalizeText(s.name))) {
        list.push({
          id: s.id,
          name: s.name,
          type: "SUPPLIER",
          phone: s.phone || "",
          email: s.email || "",
          gstin: s.gstin || "",
          city: s.city || "",
          state: s.state || "",
          billingAddress: s.billingAddress || "",
          shippingAddress: s.shippingAddress || "",
          balance: s.previousBalance,
          balanceType: s.previousBalance >= 0 ? "DEBIT" : "CREDIT",
          creditLimit: s.creditLimit || 0,
          notes: s.notes || "",
          code: s.code,
          createdAt: "",
        });
      }
    });
    return list;
  }, [customers, suppliers]);

  // Handle external party selection via URL params
  useEffect(() => {
    const partyId = searchParams.get("partyId");
    if (partyId) {
      const found = allParties.find((p) => p.id === partyId);
      if (found) {
        setDetailParty(found);
        // Clear param so it doesn't reopen on every render
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("partyId");
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, allParties, setSearchParams]);

  const filtered = useMemo(() => {
    let list = allParties;
    if (filterTab !== "ALL") list = list.filter((p) => p.type === filterTab);
    if (search.trim()) {
      list = list.filter(
        (p) =>
          includesText(p.name, search) ||
          includesText(p.phone, search) ||
          includesText(p.email, search) ||
          includesText(p.gstin, search) ||
          includesText(p.city, search),
      );
    }
    return list;
  }, [allParties, filterTab, search]);

  const partiesTable = useDataTable<UnifiedParty, SortKey>({
    data: filtered,
    initialSortBy: "name",
    initialSortDir: "asc",
    initialPageSize: 18,
    pageSizeOptions: [12, 18, 30, 50],
    sortComparators: {
      name: (a, b) => (a.name || "").localeCompare(b.name || ""),
      city: (a, b) => (a.city || "").localeCompare(b.city || ""),
      balance: (a, b) => b.balance - a.balance,
      type: (a, b) => (a.type || "").localeCompare(b.type || ""),
      phone: (a, b) => (a.phone || "").localeCompare(b.phone || ""),
    },
    resetPageOn: [filterTab, viewMode],
  });

  const counts = useMemo(
    () => ({
      ALL: allParties.length,
      CUSTOMER: allParties.filter((p) => p.type === "CUSTOMER").length,
      SUPPLIER: allParties.filter((p) => p.type === "SUPPLIER").length,
      BOTH: allParties.filter((p) => p.type === "BOTH").length,
    }),
    [allParties],
  );

  const sortOptions: CommandOption[] = [
    {
      id: "name",
      label: "Name",
      icon: <ArrowUpDown className="w-3.5 h-3.5" />,
    },
    {
      id: "city",
      label: "City",
      icon: <ArrowUpDown className="w-3.5 h-3.5" />,
    },
    {
      id: "balance",
      label: "Balance",
      icon: <ArrowUpDown className="w-3.5 h-3.5" />,
    },
  ];

  // ── Actions ─────────────────────────────────
  const openCreate = () => {
    setEditingParty(null);
    setForm(emptyParty());
    setShowModal(true);
  };
  const openEdit = (p: UnifiedParty) => {
    setEditingParty(p);
    setForm({ ...p });
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setEditingParty(null);
  };
  const formValid =
    form.name.trim().length >= 2 &&
    (!form.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email));

  const handleSave = () => {
    const trimmedName = form.name.trim();
    if (!formValid) {
      toast.error(
        "Validation Error",
        "Party name required (min 2 chars). Email must be valid.",
      );
      return;
    }

    // Duplicate name check — prevent two parties with the same name (case-insensitive)
    if (!isEditMode) {
      const nameLower = normalizeText(trimmedName);
      const isDuplicate = allParties.some(
        (p) => normalizeText(p.name) === nameLower,
      );
      if (isDuplicate) {
        toast.error(
          "Duplicate Party",
          `A party named "${form.name}" already exists. Use a unique name.`,
        );
        return;
      }
    }

    const bal =
      form.balanceType === "CREDIT"
        ? -Math.abs(form.balance)
        : Math.abs(form.balance);

    const commonFields = {
      name: trimmedName,
      phone: form.phone,
      email: form.email,
      gstin: form.gstin,
      city: form.city,
      state: form.state,
      billingAddress: form.billingAddress,
      shippingAddress: form.shippingAddress,
      previousBalance: bal,
      creditLimit: form.creditLimit,
      notes: form.notes,
    };

    if (isEditMode) {
      if (form.type === "SUPPLIER" || form.type === "BOTH") {
        const e = suppliers.find((s) => s.id === form.id);
        if (e)
          updateSupplier({ ...e, ...commonFields, code: form.code || e.code });
      }
      if (form.type === "CUSTOMER" || form.type === "BOTH") {
        const e = customers.find((c) => c.id === form.id);
        if (e) updateCustomer({ ...e, ...commonFields });
      }
      toast.success("Party Updated", `${form.name} saved.`);
    } else {
      if (form.type === "SUPPLIER" || form.type === "BOTH") {
        addSupplier({
          ...commonFields,
          code:
            form.code ||
            trimmedName
              .split(" ")
              .map((w) => w[0])
              .join("")
              .toUpperCase()
              .slice(0, 4) + "-01",
        });
      }
      if (form.type === "CUSTOMER" || form.type === "BOTH") {
        addCustomer(commonFields);
      }
      toast.success(
        "Party Created",
        `${form.name} registered as ${form.type.toLowerCase()}.`,
      );
    }
    closeModal();
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailParty || payAmount <= 0) {
      toast.error(
        "Invalid Amount",
        "Please enter a valid payment amount greater than zero.",
      );
      return;
    }

    const newPayment: PaymentReceipt = {
      id: `p-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      partyType: paymentType,
      partyId: detailParty.id,
      partyName: detailParty.name,
      amount: Number(payAmount),
      paymentMode: payMode,
      referenceNo: payRefNo,
      notes: payNotes,
    };

    addPayment(newPayment);
    const msg =
      paymentType === "SUPPLIER"
        ? `₹${Number(payAmount).toLocaleString("en-IN")} paid to ${detailParty.name}. Supplier balance updated.`
        : `₹${Number(payAmount).toLocaleString("en-IN")} received from ${detailParty.name}. Customer balance updated.`;

    toast.success(
      paymentType === "SUPPLIER" ? "Payment Recorded" : "Payment Received",
      msg,
    );
    setShowPaymentModal(false);
    setPayAmount(0);
    setPayRefNo("");
    setPayNotes("");
  };

  const handleDeleteParty = async (p: UnifiedParty) => {
    const ok = await dialog.confirm({
      variant: "destructive",
      title: `Remove ${p.name}?`,
      description:
        "This will permanently delete the party record and any associated ledger references. This action cannot be undone.",
      confirmText: "Delete Party",
    });
    if (ok) {
      if (p.type === "SUPPLIER" || p.type === "BOTH") deleteSupplier(p.id);
      if (p.type === "CUSTOMER" || p.type === "BOTH") deleteCustomer(p.id);
      toast.info("Party Deleted", `${p.name} removed.`);
      if (detailParty?.id === p.id) setDetailParty(null);
    }
  };

  // ── Ledger data for detail view ─────────────
  const supLedger = useMemo(() => {
    if (
      !detailParty ||
      (detailParty.type !== "SUPPLIER" && detailParty.type !== "BOTH")
    )
      return [];
    const sup = suppliers.find((s) => equalsText(s.name, detailParty.name));
    return sup ? getSupplierLedger(sup.id) : [];
  }, [detailParty, suppliers, getSupplierLedger]);

  const custLedger = useMemo(() => {
    if (
      !detailParty ||
      (detailParty.type !== "CUSTOMER" && detailParty.type !== "BOTH")
    )
      return [];
    const cust = customers.find((c) => equalsText(c.name, detailParty.name));
    return cust ? getCustomerLedger(cust.id) : [];
  }, [detailParty, customers, getCustomerLedger]);

  const supplierLedgerTable = useDataTable<
    (typeof supLedger)[number],
    "date" | "amount" | "runningBalance"
  >({
    data: supLedger,
    initialSortBy: "date",
    initialSortDir: "desc",
    initialPageSize: 50,
    pageSizeOptions: [20, 50, 100],
    sortComparators: {
      date: (a, b) => a.date.localeCompare(b.date),
      amount: (a, b) => a.amount - b.amount,
      runningBalance: (a, b) => a.runningBalance - b.runningBalance,
    },
    resetPageOn: [detailParty?.id || ""],
  });

  const customerLedgerTable = useDataTable<
    (typeof custLedger)[number],
    "date" | "amount" | "runningBalance"
  >({
    data: custLedger,
    initialSortBy: "date",
    initialSortDir: "desc",
    initialPageSize: 50,
    pageSizeOptions: [20, 50, 100],
    sortComparators: {
      date: (a, b) => a.date.localeCompare(b.date),
      amount: (a, b) => a.amount - b.amount,
      runningBalance: (a, b) => a.runningBalance - b.runningBalance,
    },
    resetPageOn: [detailParty?.id || ""],
  });

  // ═══════════════════════════════════════════
  // PARTY DETAIL PAGE VIEW
  // ═══════════════════════════════════════════
  if (detailParty) {
    const p = detailParty;
    const totalDebit = roundCurrency(
      [...supLedger, ...custLedger]
        .filter((e) => e.amount > 0 && e.type !== "OPENING")
        .reduce((s, e) => s + e.amount, 0),
    );
    const totalCredit = roundCurrency(
      [...supLedger, ...custLedger]
        .filter((e) => e.amount < 0)
        .reduce((s, e) => s + Math.abs(e.amount), 0),
    );
    const outstandingBalance =
      p.type === "CUSTOMER"
        ? custLedger.length > 0
          ? custLedger[0].runningBalance
          : p.balance
        : supLedger.length > 0
          ? supLedger[0].runningBalance
          : p.balance;

    return (
      <div className="flex-1 flex flex-col gap-4 font-sans animate-fade-in min-h-0">
        {/* Unified Header / Hero Section */}
        <div className="dark:bg-slate-900 bg-white p-4 sm:p-5 rounded-2xl border dark:border-slate-800 border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden group shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none group-hover:bg-indigo-500/10 transition-colors duration-700"></div>

          <div className="flex items-start space-x-5 relative z-10">
            <button
              onClick={() => setDetailParty(null)}
              className="mt-1 p-2 dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-600 rounded-xl cursor-pointer dark:hover:bg-slate-700 hover:bg-slate-200 transition-all border dark:border-slate-700 border-slate-200 active:scale-90"
              title="Back to list"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Av name={p.name} size="w-14 h-14 text-lg" />
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold dark:text-white text-slate-900 tracking-tight">
                  {p.name}
                </h1>
                <TypeBadge type={p.type} />
              </div>
              <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 text-[10px] dark:text-slate-400 text-slate-500 font-bold uppercase tracking-wider">
                {p.city && (
                  <span className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded-lg">
                    <MapPin className="w-3 h-3 text-indigo-500" />
                    <span>
                      {p.city}
                      {p.state ? `, ${p.state}` : ""}
                    </span>
                  </span>
                )}
                {p.phone && (
                  <span className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded-lg">
                    <Phone className="w-3 h-3 text-indigo-500" />
                    <span>{p.phone}</span>
                  </span>
                )}
                {p.gstin && (
                  <span className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded-lg font-mono">
                    <span className="text-indigo-500">GST:</span>
                    <span>{p.gstin}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center lg:items-end xl:items-center gap-4 relative z-10">
            {/* Compact Highlight Balance */}
            <div className="flex-1 lg:flex-none dark:bg-slate-950/50 bg-slate-50 px-5 py-2.5 rounded-2xl border-2 dark:border-slate-800 border-slate-100 text-right min-w-[180px] hover:border-indigo-500/30 transition-colors">
              <div className="text-[9px] font-bold uppercase tracking-[0.15em] dark:text-slate-500 text-slate-400 mb-0.5">
                Current Balance
              </div>
              <div className="flex items-center justify-end space-x-2">
                <Bal balance={outstandingBalance} className="text-lg" />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {(p.type === "CUSTOMER" || p.type === "BOTH") && (
                <button
                  onClick={() => {
                    setPaymentType("CUSTOMER");
                    setShowPaymentModal(true);
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-[11px] font-bold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>Receive payment</span>
                </button>
              )}
              {(p.type === "SUPPLIER" || p.type === "BOTH") && (
                <button
                  onClick={() => {
                    setPaymentType("SUPPLIER");
                    setShowPaymentModal(true);
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-[11px] font-bold shadow-lg shadow-cyan-500/20 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Pay Supplier</span>
                </button>
              )}

              <button
                onClick={() => setShowStatement(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 dark:bg-slate-800 bg-white dark:text-slate-300 text-slate-700 rounded-xl text-[11px] font-bold border dark:border-slate-700 border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer active:scale-[0.98]"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Statement</span>
              </button>

              <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-0.5"></div>

              <button
                onClick={() => {
                  openEdit(p);
                }}
                className="p-2 dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-700 rounded-xl cursor-pointer dark:hover:bg-slate-700 hover:bg-slate-200 transition-colors border dark:border-slate-700 border-slate-300 active:scale-[0.95]"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeleteParty(p)}
                className="p-2 dark:bg-slate-800 bg-slate-100 text-rose-600 dark:text-rose-400 rounded-xl cursor-pointer dark:hover:bg-rose-950/50 hover:bg-rose-50 transition-colors border dark:border-slate-700 border-slate-300 active:scale-[0.95]"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Financial KPI Chips */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar shrink-0">
          <div className="flex-1 min-w-[140px] dark:bg-slate-900 bg-white p-2.5 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm flex items-center space-x-3 hover:border-indigo-500/30 transition-all">
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <div className="text-[8px] font-bold uppercase tracking-wider dark:text-slate-500 text-slate-400">
                Opening
              </div>
              <Bal balance={p.balance} className="text-[11px] font-bold" />
            </div>
          </div>

          <div className="flex-1 min-w-[140px] dark:bg-slate-900 bg-white p-2.5 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm flex items-center space-x-3 hover:border-rose-500/30 transition-all">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div>
              <div className="text-[8px] font-black uppercase tracking-wider dark:text-slate-500 text-slate-400">
                Total Debit
              </div>
              <div className="font-mono font-bold text-[11px] text-rose-600 dark:text-rose-400">
                ₹{totalDebit.toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-[140px] dark:bg-slate-900 bg-white p-2.5 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm flex items-center space-x-3 hover:border-emerald-500/30 transition-all">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div>
              <div className="text-[8px] font-black uppercase tracking-wider dark:text-slate-500 text-slate-400">
                Total Credit
              </div>
              <div className="font-mono font-bold text-[11px] text-emerald-600 dark:text-emerald-400">
                ₹{totalCredit.toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-[140px] dark:bg-slate-900 bg-white p-2.5 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm flex items-center space-x-3 border-b-2 border-b-indigo-500/50 hover:border-indigo-500/30 transition-all">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
              <IndianRupee className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div>
              <div className="text-[8px] font-black uppercase tracking-wider dark:text-slate-500 text-slate-400">
                Net Balance
              </div>
              <Bal
                balance={outstandingBalance}
                className="text-[11px] font-bold"
              />
            </div>
          </div>
        </div>

        {(p.type === "SUPPLIER" || p.type === "BOTH") &&
          supLedger.length > 0 && (
            <div className="flex-1 flex flex-col dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden min-h-0">
              <div className="px-4 py-2 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2 text-[10px] font-black dark:text-emerald-400 text-emerald-700 uppercase tracking-[0.15em] shrink-0">
                <Users className="w-3.5 h-3.5" />
                <span>Supplier Ledger</span>
                <span className="text-[10px] font-mono dark:bg-slate-800 bg-slate-200 dark:text-slate-400 text-slate-600 px-1.5 py-0.5 rounded ml-auto">
                  {supLedger.length}
                </span>
              </div>
              <DataTable
                className="flex-1 min-h-0"
                scrollClassName="flex-1"
                footer={
                  <Pagination
                    page={supplierLedgerTable.page}
                    totalPages={supplierLedgerTable.totalPages}
                    totalRecords={supplierLedgerTable.totalRecords}
                    pageSize={supplierLedgerTable.pageSize}
                    pageSizeOptions={supplierLedgerTable.pageSizeOptions}
                    onPageChange={supplierLedgerTable.setPage}
                    onPageSizeChange={supplierLedgerTable.setPageSize}
                    label="supplier ledger rows"
                  />
                }
              >
                <table className="erp-table text-left text-[11px] font-sans">
                  <thead>
                    <tr className="dark:bg-slate-950 bg-slate-50 dark:text-slate-400 text-slate-600 uppercase font-black text-[9px] border-b dark:border-slate-800 border-slate-200 tracking-wider">
                      <th className="py-2 px-4 w-28 col-text">
                        <button
                          type="button"
                          onClick={() => supplierLedgerTable.toggleSort("date")}
                          className="inline-flex items-center gap-1"
                        >
                          Date <ArrowUpDown className="w-3 h-3 opacity-50" />
                        </button>
                      </th>
                      <th className="py-2 px-3 w-32 col-text">Type</th>
                      <th className="py-2 px-3 col-text">
                        Bill # / Description
                      </th>
                      <th className="py-2 px-3 col-num text-rose-600 dark:text-rose-400 w-44">
                        <button
                          type="button"
                          onClick={() =>
                            supplierLedgerTable.toggleSort("amount")
                          }
                          className="inline-flex items-center gap-1 ml-auto"
                        >
                          Purchase Amount (Dr){" "}
                          <ArrowUpDown className="w-3 h-3 opacity-50" />
                        </button>
                      </th>
                      <th className="py-2 px-3 col-num text-emerald-600 dark:text-emerald-400 w-44">
                        Payment Paid (Cr)
                      </th>
                      <th className="py-2 px-4 col-num font-black text-emerald-700 dark:text-emerald-400 w-44">
                        <button
                          type="button"
                          onClick={() =>
                            supplierLedgerTable.toggleSort("runningBalance")
                          }
                          className="inline-flex items-center gap-1 ml-auto"
                        >
                          Running Balance{" "}
                          <ArrowUpDown className="w-3 h-3 opacity-50" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                    {supplierLedgerTable.pageRows.map((entry) => {
                      const isPurch = entry.type === "PURCHASE_BILL";
                      const isPayment = entry.type === "PAYMENT";
                      const isOpening = entry.type === "OPENING";

                      return (
                        <tr
                          key={entry.id}
                          className="dark:hover:bg-slate-800/30 hover:bg-slate-50 group font-sans transition-colors"
                        >
                          <td className="py-2 px-4 col-text font-mono font-medium text-[#64748b] text-[10px]">
                            {fmtDate(entry.date)}
                          </td>
                          <td className="py-2 px-3 col-text font-sans">
                            {isOpening && (
                              <span className="bg-[#f1f5f9] dark:bg-slate-800 text-[#475569] dark:text-slate-400 px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase">
                                OPENING
                              </span>
                            )}
                            {isPurch && (
                              <span className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[9px] font-bold flex items-center w-max font-mono">
                                <ArrowUpRight className="w-3 h-3 mr-1" />{" "}
                                PURCHASE
                              </span>
                            )}
                            {isPayment && (
                              <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] font-bold flex items-center w-max font-mono">
                                <ArrowDownRight className="w-3 h-3 mr-1" />{" "}
                                PAYMENT
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 col-text max-w-60 font-sans">
                            <span className="font-bold dark:text-white text-slate-900 block text-xs">
                              {entry.referenceNo ||
                                entry.variety ||
                                "Account Balance"}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-500 block truncate font-medium">
                              {entry.note}
                            </span>
                          </td>
                          <td className="py-2 px-3 col-num font-mono font-bold text-rose-700 dark:text-rose-400 text-xs">
                            {isPurch
                              ? `₹${entry.amount.toLocaleString("en-IN")}`
                              : "—"}
                          </td>
                          <td className="py-2 px-3 col-num font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                            {isPayment
                              ? `₹${Math.abs(entry.amount).toLocaleString("en-IN")}`
                              : "—"}
                          </td>
                          <td className="py-2 px-4 col-num font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 text-xs">
                            ₹{entry.runningBalance.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </DataTable>
            </div>
          )}

        {(p.type === "CUSTOMER" || p.type === "BOTH") &&
          custLedger.length > 0 && (
            <div className="flex-1 flex flex-col dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden min-h-0">
              <div className="px-4 py-2 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2 text-[10px] font-black dark:text-indigo-400 text-indigo-700 uppercase tracking-[0.15em] shrink-0">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Customer Ledger</span>
                <span className="text-[10px] font-mono dark:bg-slate-800 bg-slate-200 dark:text-slate-400 text-slate-600 px-1.5 py-0.5 rounded ml-auto">
                  {custLedger.length}
                </span>
              </div>
              <DataTable
                className="flex-1 min-h-0"
                scrollClassName="flex-1"
                footer={
                  <Pagination
                    page={customerLedgerTable.page}
                    totalPages={customerLedgerTable.totalPages}
                    totalRecords={customerLedgerTable.totalRecords}
                    pageSize={customerLedgerTable.pageSize}
                    pageSizeOptions={customerLedgerTable.pageSizeOptions}
                    onPageChange={customerLedgerTable.setPage}
                    onPageSizeChange={customerLedgerTable.setPageSize}
                    label="customer ledger rows"
                  />
                }
              >
                <table className="erp-table text-left text-[11px] font-sans">
                  <thead>
                    <tr className="dark:bg-slate-950 bg-slate-50 dark:text-slate-400 text-slate-600 uppercase font-black text-[9px] border-b dark:border-slate-800 border-slate-200 tracking-wider">
                      <th className="py-2 px-4 w-28 col-text">
                        <button
                          type="button"
                          onClick={() => customerLedgerTable.toggleSort("date")}
                          className="inline-flex items-center gap-1"
                        >
                          Date <ArrowUpDown className="w-3 h-3 opacity-50" />
                        </button>
                      </th>
                      <th className="py-2 px-3 w-32 col-text">Type</th>
                      <th className="py-2 px-3 col-text">
                        Invoice # / Description
                      </th>
                      <th className="py-2 px-3 col-num text-indigo-600 dark:text-indigo-400 w-44">
                        <button
                          type="button"
                          onClick={() =>
                            customerLedgerTable.toggleSort("amount")
                          }
                          className="inline-flex items-center gap-1 ml-auto"
                        >
                          Invoice Amount (Dr){" "}
                          <ArrowUpDown className="w-3 h-3 opacity-50" />
                        </button>
                      </th>
                      <th className="py-2 px-3 col-num text-emerald-600 dark:text-emerald-400 w-44">
                        Payment Received (Cr)
                      </th>
                      <th className="py-2 px-4 col-num font-black text-[#0369a1] dark:text-sky-400 w-44">
                        <button
                          type="button"
                          onClick={() =>
                            customerLedgerTable.toggleSort("runningBalance")
                          }
                          className="inline-flex items-center gap-1 ml-auto"
                        >
                          Running Balance{" "}
                          <ArrowUpDown className="w-3 h-3 opacity-50" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                    {customerLedgerTable.pageRows.map((entry) => {
                      const isInvoice = entry.type === "INVOICE";
                      const isPayment = entry.type === "PAYMENT";
                      const isOpening = entry.type === "OPENING";

                      return (
                        <tr
                          key={entry.id}
                          className="dark:hover:bg-slate-800/30 hover:bg-slate-50 group font-sans transition-colors"
                        >
                          <td className="py-2 px-4 col-text font-mono font-medium text-[#64748b] text-[10px]">
                            {fmtDate(entry.date)}
                          </td>
                          <td className="py-2 px-3 col-text font-sans">
                            {isOpening && (
                              <span className="bg-[#f1f5f9] dark:bg-slate-800 text-[#475569] dark:text-slate-400 px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase">
                                OPENING
                              </span>
                            )}
                            {isInvoice && (
                              <span className="bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded text-[9px] font-bold flex items-center w-max font-mono">
                                <ArrowUpRight className="w-3 h-3 mr-1" />{" "}
                                INVOICE
                              </span>
                            )}
                            {isPayment && (
                              <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] font-bold flex items-center w-max font-mono">
                                <ArrowDownRight className="w-3 h-3 mr-1" />{" "}
                                RECEIVED
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 col-text max-w-60 font-sans">
                            <span className="font-bold dark:text-white text-slate-900 block text-xs">
                              {entry.referenceNo || "Account Balance"}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-500 block truncate font-medium">
                              {entry.note}
                            </span>
                          </td>
                          <td className="py-2 px-3 col-num font-mono font-bold text-sky-700 dark:text-sky-400 text-xs">
                            {isInvoice
                              ? `₹${entry.amount.toLocaleString("en-IN")}`
                              : "—"}
                          </td>
                          <td className="py-2 px-3 col-num font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                            {isPayment
                              ? `₹${Math.abs(entry.amount).toLocaleString("en-IN")}`
                              : "—"}
                          </td>
                          <td className="py-2 px-4 col-num font-mono font-bold text-[#0369a1] dark:text-sky-400 bg-sky-500/5 dark:bg-sky-500/10 text-xs">
                            ₹{entry.runningBalance.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </DataTable>
            </div>
          )}

        {supLedger.length === 0 && custLedger.length === 0 && (
          <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 py-12 text-center">
            <Calendar className="w-10 h-10 dark:text-slate-700 text-slate-300 mx-auto mb-3" />
            <div className="text-sm font-bold dark:text-slate-400 text-slate-500">
              No transactions yet
            </div>
            <p className="text-xs dark:text-slate-500 text-slate-400 mt-1">
              Ledger entries will appear here after purchases or sales.
            </p>
          </div>
        )}

        {/* Modal for edit from detail page */}
        {showModal && renderModal()}

        {/* Payment Receipt Modal (Customer/Supplier) */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-fade-in">
            <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl max-w-lg w-full overflow-hidden p-6 space-y-6 animate-slide-up">
              <div className="flex items-center justify-between border-b dark:border-slate-800 border-slate-100 pb-4">
                <h3 className="text-lg font-bold dark:text-white text-slate-900 flex items-center space-x-2">
                  <span>
                    {paymentType === "SUPPLIER"
                      ? "Record Payment to Supplier"
                      : "Receive Payment from Customer"}
                  </span>
                </h3>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={handleAddPayment}
                className="space-y-4 font-sans text-xs sm:text-sm"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    {paymentType === "SUPPLIER"
                      ? "Paying To:"
                      : "Receiving From Buyer:"}
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={p.name}
                    className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    {paymentType === "SUPPLIER"
                      ? "Payment Amount (₹) *"
                      : "Amount Received (₹) *"}
                  </label>
                  <input
                    type="number"
                    required
                    value={payAmount === 0 ? "" : payAmount}
                    placeholder="100000"
                    onChange={(e) =>
                      setPayAmount(parseFloat(e.target.value) || 0)
                    }
                    className={`w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 border-slate-200 rounded-xl px-4 py-3 font-mono font-bold text-lg outline-none transition-all ${paymentType === "SUPPLIER" ? "text-cyan-600 dark:text-cyan-400 focus:border-cyan-500" : "text-indigo-600 dark:text-indigo-400 focus:border-indigo-500"}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      Payment Mode
                    </label>
                    <CommandSelect
                      value={payMode}
                      onChange={(val) => setPayMode(val as any)}
                      options={paymentModeOptions}
                      placeholder="Select mode"
                      creatable={false}
                      showEmoji={true}
                      variant="violet"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                      {paymentType === "SUPPLIER"
                        ? "Reference / Cheque No"
                        : "Reference No"}
                    </label>
                    <input
                      type="text"
                      value={payRefNo}
                      onChange={(e) => setPayRefNo(e.target.value)}
                      placeholder={
                        paymentType === "SUPPLIER"
                          ? "e.g. NEFT-99120"
                          : "e.g. UPI-998812"
                      }
                      className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 border-slate-200 rounded-xl px-4 py-2.5 font-mono font-bold outline-none focus:border-indigo-500 transition-all text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                    {paymentType === "SUPPLIER"
                      ? "Payment Note"
                      : "Receipt Note"}
                  </label>
                  <input
                    type="text"
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder={
                      paymentType === "SUPPLIER"
                        ? "Advance payment against seasonal load..."
                        : "Payment cleared for previous invoices..."
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 transition-all text-slate-900 dark:text-white"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-slate-800 border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-6 py-2.5 text-white rounded-xl text-xs font-bold shadow-lg transition-all ${paymentType === "SUPPLIER" ? "bg-linear-to-r from-cyan-500 to-blue-600 shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500" : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20"}`}
                  >
                    {paymentType === "SUPPLIER"
                      ? "Save Payment"
                      : "Save Payment Receipt"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Statement Preview */}
        <StatementPreview
          isOpen={showStatement}
          onClose={() => setShowStatement(false)}
          title={`${p.type === "CUSTOMER" ? "Customer" : "Supplier"} Account Statement`}
          subtitle={`${p.name} �. ${p.city}`}
        >
          <div className="space-y-6">
            {/* Party Info */}
            <div className="flex justify-between items-start rounded-lg border border-slate-200 overflow-hidden">
              <div className="flex-1 p-4 bg-slate-50/70">
                <div className="text-[8.5px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">
                  {p.type === "BOTH" ? "Dual Party" : p.type}
                </div>
                <div className="text-[15px] font-black text-slate-950">
                  {p.name}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                  {p.phone && <div>Phone: {p.phone}</div>}
                  <div>City: {p.city}</div>
                </div>
              </div>
              <div className="p-4 border-l border-slate-200 bg-white text-right min-w-[140px] flex flex-col justify-center">
                <div className="text-[8.5px] font-bold uppercase text-slate-400">
                  Outstanding
                </div>
                <div
                  className={`text-[16px] font-black font-mono mt-0.5 ${outstandingBalance >= 0 ? "text-indigo-700" : "text-emerald-700"}`}
                >
                  ₹{outstandingBalance.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            {/* Combined Ledger Table for Print */}
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-indigo-600 text-white">
                  <th className="py-2.5 px-3 text-left font-semibold text-[10px] rounded-tl-md">
                    Date
                  </th>
                  <th className="py-2.5 px-3 text-left font-semibold text-[10px]">
                    Type
                  </th>
                  <th className="py-2.5 px-3 text-left font-semibold text-[10px]">
                    Reference
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold text-[10px]">
                    Debit
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold text-[10px]">
                    Credit
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold text-[10px] rounded-tr-md">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...supLedger, ...custLedger]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((entry, idx) => (
                    <tr
                      key={entry.id}
                      className={`border-b border-slate-100 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                    >
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600">
                        {fmtDate(entry.date)}
                      </td>
                      <td className="py-2.5 px-3 text-[10px] font-semibold text-slate-700 uppercase">
                        {entry.type.replace("_", " ")}
                      </td>
                      <td className="py-2.5 px-3 text-[10px] text-slate-600 truncate max-w-[150px]">
                        {entry.referenceNo || "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[10.5px] text-rose-700">
                        {entry.amount > 0
                          ? `₹${entry.amount.toLocaleString("en-IN")}`
                          : ""}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[10.5px] text-emerald-700">
                        {entry.amount < 0
                          ? `₹${Math.abs(entry.amount).toLocaleString("en-IN")}`
                          : ""}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-[10.5px] text-slate-900">
                        ₹{entry.runningBalance.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </StatementPreview>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // MODAL RENDER (shared)
  // ═══════════════════════════════════════════
  function renderModal() {
    return (
      <div className="fixed inset-0 z-99999 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl overflow-hidden animate-slide-up flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b dark:border-slate-800 border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-base font-bold dark:text-white text-slate-900">
                {isEditMode ? "Edit Party Profile" : "Create New Party"}
              </h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                {isEditMode
                  ? `Update details for ${editingParty?.name}`
                  : "Register a new buyer or supplier"}
              </p>
            </div>
            <button
              onClick={closeModal}
              className="p-1.5 dark:text-slate-400 text-slate-500 hover:text-rose-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content - Compact View */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="space-y-6">
              {/* SECTION: BASIC INFO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Inp
                    label="Party Name"
                    value={form.name}
                    onChange={(v) => f("name", v)}
                    placeholder="e.g. Ramesh Agro Traders"
                    required
                    icon={<Building2 />}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block ml-0.5">
                    Party Type *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        [
                          "CUSTOMER",
                          "Buyer",
                          <UserCheck key="c" className="w-4 h-4" />,
                        ],
                        [
                          "SUPPLIER",
                          "Supplier",
                          <Users key="s" className="w-4 h-4" />,
                        ],
                        ["BOTH", "Both", <Users key="b" className="w-4 h-4" />],
                      ] as [PartyType, string, React.ReactNode][]
                    ).map(([val, lbl, icon]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => f("type", val)}
                        className={`flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold border-2 cursor-pointer transition-all ${
                          form.type === val
                            ? "border-indigo-500 dark:bg-indigo-500/10 bg-indigo-50 text-indigo-700 dark:text-indigo-400 shadow-sm"
                            : "dark:border-slate-800 border-slate-100 dark:text-slate-500 text-slate-500"
                        }`}
                      >
                        {icon}
                        <span>{lbl}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Inp
                  label="Phone"
                  value={form.phone}
                  onChange={(v) => f("phone", v)}
                  placeholder="+91 99887 77665"
                  icon={<Phone />}
                />
                <Inp
                  label="GSTIN"
                  value={form.gstin}
                  onChange={(v) => f("gstin", v.toUpperCase())}
                  placeholder="24AABCT1234A1ZH"
                  mono
                />
                <div className="sm:col-span-2">
                  <Inp
                    label="Email Address"
                    value={form.email}
                    onChange={(v) => f("email", v)}
                    placeholder="contact@business.com"
                    icon={<Mail />}
                  />
                </div>
              </div>

              {/* SECTION: ADDRESS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t dark:border-slate-800 border-slate-50">
                <div className="sm:col-span-2">
                  <Inp
                    label="Address"
                    value={form.billingAddress}
                    onChange={(v) => f("billingAddress", v)}
                    placeholder="Street, Area, Building..."
                    icon={<MapPin />}
                  />
                </div>
                <Inp
                  label="City"
                  value={form.city}
                  onChange={(v) => f("city", v)}
                  placeholder="City"
                />
                <Inp
                  label="State"
                  value={form.state}
                  onChange={(v) => f("state", v)}
                  placeholder="State"
                />
              </div>

              {/* SECTION: FINANCIAL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t dark:border-slate-800 border-slate-50">
                <Inp
                  label="Opening Balance"
                  type="number"
                  value={form.balance}
                  onChange={(v) => f("balance", parseFloat(v) || 0)}
                  placeholder="0.00"
                  mono
                  icon={<IndianRupee />}
                />
                <Inp
                  label="Credit Limit"
                  type="number"
                  value={form.creditLimit}
                  onChange={(v) => f("creditLimit", parseFloat(v) || 0)}
                  placeholder="No limit"
                  mono
                  icon={<TrendingUp />}
                />

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block ml-0.5">
                    Balance Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["DEBIT", "CREDIT"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => f("balanceType", t)}
                        className={`py-2 rounded-xl text-xs font-bold border-2 cursor-pointer transition-all ${
                          form.balanceType === t
                            ? "border-indigo-500 dark:bg-indigo-500/10 bg-indigo-50 text-indigo-700 dark:text-indigo-400 shadow-sm"
                            : "dark:border-slate-800 border-slate-100 dark:text-slate-500 text-slate-500"
                        }`}
                      >
                        {t === "DEBIT"
                          ? "Debit (Customer Will Pay)"
                          : "Credit (We Will Pay)"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION: NOTES */}
              <div className="pt-4 border-t dark:border-slate-800 border-slate-50">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-0.5">
                    Internal Remarks
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => f("notes", e.target.value)}
                    rows={2}
                    placeholder="Additional instructions..."
                    className="w-full bg-slate-50/50 dark:bg-slate-900/30 border dark:border-slate-800 border-slate-200 dark:text-white text-slate-900 rounded-xl p-3 text-xs font-medium outline-none focus:border-indigo-500 transition-all resize-none shadow-inner"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t dark:border-slate-800 border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-slate-50/30 dark:bg-slate-900/30">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!formValid}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              {isEditMode ? "Update Party" : "Create Party"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // MAIN LIST/GRID VIEW
  // ═══════════════════════════════════════════
  return (
    <div className="flex-1 flex flex-col gap-6 font-sans min-h-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 dark:bg-slate-900 bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm shrink-0">
        <div>
          <h1 className="text-xl font-black dark:text-white text-slate-900 tracking-tight flex items-center space-x-2.5">
            <Users className="w-6 h-6 text-violet-500" />
            <span>PARTIES MANAGEMENT</span>
          </h1>
          <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5">
            Manage customers, suppliers & dual parties
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Party</span>
        </button>
      </div>

      {/* Search & Filters attached to Table */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Controls */}
        <div className="dark:bg-slate-900 bg-white p-4 rounded-xl rounded-b-none border dark:border-slate-800 border-slate-200 border-b-0 shadow-sm space-y-4 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 dark:text-slate-400 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, email, GSTIN, city..."
              className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 pl-10 pr-10 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-2.5 dark:text-slate-500 text-slate-400 cursor-pointer hover:text-rose-500"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
              {(
                [
                  ["ALL", "All"],
                  ["CUSTOMER", "Customers"],
                  ["SUPPLIER", "Suppliers"],
                  ["BOTH", "Dual"],
                ] as [FilterTab, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilterTab(key)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border ${filterTab === key ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "dark:bg-slate-950 bg-slate-50 dark:text-slate-300 text-slate-600 dark:border-slate-800 border-slate-200"}`}
                >
                  <span>{label}</span>
                  <span
                    className={`text-[9px] font-mono px-1 py-0.5 rounded ${filterTab === key ? "bg-white/20" : "dark:bg-slate-800 bg-slate-200"}`}
                  >
                    {counts[key]}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-44">
                <CommandSelect
                  value={partiesTable.sortBy}
                  onChange={(val) => partiesTable.toggleSort(val as SortKey)}
                  options={sortOptions}
                  placeholder="Sort by"
                  creatable={false}
                  showEmoji={false}
                  variant="violet"
                  size="sm"
                />
              </div>
              <div className="flex items-center dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("GRID")}
                  className={`p-1.5 rounded-md cursor-pointer transition-colors ${viewMode === "GRID" ? "bg-indigo-600 text-white shadow-sm" : "dark:text-slate-400 text-slate-500"}`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewMode("LIST")}
                  className={`p-1.5 rounded-md cursor-pointer transition-colors ${viewMode === "LIST" ? "bg-indigo-600 text-white shadow-sm" : "dark:text-slate-400 text-slate-500"}`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Empty */}
        {partiesTable.totalRecords === 0 && (
          <div className="flex-1 dark:bg-slate-900 bg-white rounded-xl rounded-t-none border dark:border-slate-800 border-slate-200 py-16 text-center animate-fade-in flex flex-col items-center justify-center">
            <Users className="w-12 h-12 dark:text-slate-700 text-slate-300 mx-auto mb-4" />
            <div className="text-sm font-bold dark:text-slate-400 text-slate-500">
              {search ? `No parties matching "${search}"` : "No parties yet"}
            </div>
            <p className="text-xs dark:text-slate-500 text-slate-400 mt-1">
              {search ? "Try a different search" : "Create your first party"}
            </p>
            {!search && (
              <button
                onClick={openCreate}
                className="mt-4 inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl font-bold text-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Party</span>
              </button>
            )}
          </div>
        )}

        {/* GRID */}
        {partiesTable.totalRecords > 0 && viewMode === "GRID" && (
          <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pr-1 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
              {partiesTable.pageRows.map((p) => (
                <div
                  key={p.id + p.type}
                  style={{
                    contentVisibility: "auto",
                    containIntrinsicSize: "0 120px",
                  }}
                  className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm hover:shadow-md dark:hover:border-slate-700 hover:border-slate-300 transition-all group overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <Av name={p.name} />
                        <div className="min-w-0">
                          <div className="text-sm font-bold dark:text-white text-slate-900 truncate">
                            {p.name}
                          </div>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <TypeBadge type={p.type} />
                            {p.gstin && (
                              <span className="text-[9px] font-mono dark:text-slate-500 text-slate-400">
                                {p.gstin}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 dark:text-slate-500 text-slate-400 hover:text-indigo-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteParty(p)}
                          className="p-1.5 dark:text-slate-500 text-slate-400 hover:text-rose-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-[11px] dark:text-slate-400 text-slate-500">
                      {p.phone && (
                        <div className="flex items-center space-x-1.5">
                          <Phone className="w-3 h-3 shrink-0" />
                          <span>{p.phone}</span>
                        </div>
                      )}
                      {p.email && (
                        <div className="flex items-center space-x-1.5">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{p.email}</span>
                        </div>
                      )}
                      {p.city && (
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span>
                            {p.city}
                            {p.state ? `, ${p.state}` : ""}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t dark:border-slate-800 border-slate-100 flex items-center justify-between">
                      <Bal balance={p.balance} />
                      {p.creditLimit > 0 && (
                        <span className="text-[10px] dark:text-slate-500 text-slate-400 font-mono">
                          Limit: ₹{p.creditLimit.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="px-4 py-2 border-t dark:border-slate-800 border-slate-100 dark:bg-slate-950/50 bg-slate-50 flex items-center justify-between">
                    {p.city ? (
                      <span className="text-[10px] dark:text-slate-500 text-slate-400 flex items-center space-x-1">
                        <MapPin className="w-3 h-3" />
                        <span>{p.city}</span>
                      </span>
                    ) : (
                      <span />
                    )}
                    <button
                      onClick={() => setDetailParty(p)}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LIST */}
        {partiesTable.totalRecords > 0 && viewMode === "LIST" && (
          <DataTable
            className="flex-1 dark:bg-slate-900 bg-white rounded-xl rounded-t-none border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden animate-fade-in flex flex-col min-h-0"
            scrollClassName="flex-1"
            footer={
              <Pagination
                page={partiesTable.page}
                totalPages={partiesTable.totalPages}
                totalRecords={partiesTable.totalRecords}
                pageSize={partiesTable.pageSize}
                pageSizeOptions={partiesTable.pageSizeOptions}
                onPageChange={partiesTable.setPage}
                onPageSizeChange={partiesTable.setPageSize}
                label="parties"
              />
            }
          >
            <table className="erp-table w-full text-left text-xs">
              <thead>
                <tr className="dark:bg-slate-950 bg-slate-50 dark:text-slate-400 text-slate-600 uppercase font-bold text-[10px] border-b dark:border-slate-800 border-slate-200 sticky top-0 z-10">
                  <th className="py-3 px-4 col-text">
                    <button
                      type="button"
                      onClick={() => partiesTable.toggleSort("name")}
                      className="inline-flex items-center gap-1"
                    >
                      Party <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3 px-3 col-text w-[100px]">
                    <button
                      type="button"
                      onClick={() => partiesTable.toggleSort("type")}
                      className="inline-flex items-center gap-1"
                    >
                      Type <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3 px-3 col-text w-[140px]">
                    <button
                      type="button"
                      onClick={() => partiesTable.toggleSort("phone")}
                      className="inline-flex items-center gap-1"
                    >
                      Phone <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3 px-3 col-text w-[120px]">
                    <button
                      type="button"
                      onClick={() => partiesTable.toggleSort("city")}
                      className="inline-flex items-center gap-1"
                    >
                      City <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3 px-3 col-num w-[120px]">
                    <button
                      type="button"
                      onClick={() => partiesTable.toggleSort("balance")}
                      className="inline-flex items-center gap-1 ml-auto"
                    >
                      Balance <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3 px-4 col-actions w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                {partiesTable.pageRows.map((p) => (
                  <tr
                    key={p.id + p.type}
                    style={
                      {
                        contentVisibility: "auto",
                        containIntrinsicSize: "0 52px",
                      } as React.CSSProperties
                    }
                    className="dark:hover:bg-slate-800/40 hover:bg-slate-50 transition-colors group"
                  >
                    <td className="py-3.5 px-4 col-text">
                      <div className="flex items-center space-x-3">
                        <Av name={p.name} size="w-8 h-8 text-[10px]" />
                        <div>
                          <div className="text-sm font-bold dark:text-white text-slate-900">
                            {p.name}
                          </div>
                          {p.gstin && (
                            <div className="text-[10px] font-mono dark:text-slate-500 text-slate-400">
                              {p.gstin}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 col-text">
                      <TypeBadge type={p.type} />
                    </td>
                    <td className="py-3.5 px-3 col-text text-[11px] dark:text-slate-400 text-slate-500 font-mono">
                      {p.phone || "—"}
                    </td>
                    <td className="py-3.5 px-3 col-text text-[11px] dark:text-slate-400 text-slate-500">
                      {p.city || "—"}
                    </td>
                    <td className="py-3.5 px-3 col-num">
                      <Bal balance={p.balance} />
                    </td>
                    <td className="py-3.5 px-4 col-actions">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setDetailParty(p)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg dark:text-slate-400 text-slate-500 hover:bg-indigo-500 hover:text-white transition-all duration-200 shadow-sm hover:shadow-indigo-500/20 cursor-pointer"
                          title="View Details"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(p)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg dark:text-slate-400 text-slate-500 hover:bg-amber-500 hover:text-white transition-all duration-200 shadow-sm hover:shadow-amber-500/20 cursor-pointer"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteParty(p)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg dark:text-slate-400 text-slate-500 hover:bg-rose-500 hover:text-white transition-all duration-200 shadow-sm hover:shadow-rose-500/20 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DataTable>
        )}

        {partiesTable.totalRecords > 0 && viewMode === "GRID" && (
          <div className="shrink-0 bg-white dark:bg-slate-900 border dark:border-slate-800 border-slate-200 border-t-0 rounded-b-xl px-4 py-2">
            <Pagination
              page={partiesTable.page}
              totalPages={partiesTable.totalPages}
              totalRecords={partiesTable.totalRecords}
              pageSize={partiesTable.pageSize}
              pageSizeOptions={partiesTable.pageSizeOptions}
              onPageChange={partiesTable.setPage}
              onPageSizeChange={partiesTable.setPageSize}
              label="parties"
            />
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && renderModal()}
    </div>
  );
};
