import React, { useState, useRef } from "react";

// Utility to generate company initials (max 3, skip common words)
const getCompanyInitials = (name: string) => {
  const skip = ["and", "&", "of", "the"];
  return name
    .split(/\s+/)
    .filter((w) => w && !skip.includes(w.toLowerCase()))
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
};
import { useApp } from "../context/AppContext";
import { useAppearance, useAppTranslation } from "@/hooks";
import { useDataTable } from "@/hooks/useDataTable";
import { backupService } from "@/services/backup.service";
import {
  useBackupStore,
  useLockStore,
  useSecurityStore,
  useAuthStore,
} from "@/store";
import type { BackupFrequency } from "@/store";
import { useToast } from "./ui/Toast";
import { useConfirmDialog } from "./ui/ConfirmDialog";
import {
  Settings,
  Building2,
  DollarSign,
  FileText,
  Database,
  Palette,
  ShieldCheck,
  Save,
  Download,
  Upload,
  Trash2,
  Sun,
  Moon,
  RotateCcw,
  Eye,
  EyeOff,
  Lock,
  Check,
  AlertTriangle,
  HardDrive,
  Info,
  Plus,
  Star,
  Briefcase,
  X,
  MapPin,
  Phone,
  Mail,
  Sparkles,
  Printer,
  Share2,
  Image,
  QrCode,
  PenTool,
  Search,
  ArrowUpDown,
} from "lucide-react";
import { CompanyProfile, Invoice } from "../types";
import type { AppLanguage } from "@/types/language";
import { formatInvoiceNumber } from "../utils/invoice-number";
import { InvoiceTemplateRenderer } from "./invoice/InvoiceTemplateRenderer";
import { DataTable, Pagination } from "./ui/table";

type Section =
  | "COMPANIES"
  | "FINANCIAL"
  | "INVOICE"
  | "MASTERS"
  | "BACKUP"
  | "APPEARANCE"
  | "SECURITY";

export const SettingsModule: React.FC = () => {
  const { t } = useAppTranslation("settings");
  const { t: tCommon } = useAppTranslation("common");
  const {
    settings,
    updateSettings,
    resetAllData,
    importData,
    getExportData,
    vehicles,
    invoices,
    purchaseInvoices,
    payments,
    suppliers,
    customers,
    fruits,
    companies,
    activeCompanyId,
    addCompany,
    updateCompany,
    deleteCompany,
    switchCompany,
    addFruitVariety,
    addFruit,
    addSupplier,
    addCustomer,
  } = useApp();
  const {
    themePreference,
    setThemePreference,
    fontFamily,
    setFontFamily,
    fontSize,
    setFontSize,
    density,
    setDensity,
    accentColor,
    setAccentColor,
    language,
    setLanguage,
    lowStockAlerts,
    setLowStockAlerts,
    animationsEnabled,
    setAnimationsEnabled,
    resetAppearance,
  } = useAppearance();
  const toast = useToast();
  const dialog = useConfirmDialog();
  const configureLockSecurity = useLockStore((s) => s.configureSecurity);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeSection, setActiveSection] = useState<Section>("COMPANIES");
  const [showPin, setShowPin] = useState(false);
  const [confirmResetDialog, setConfirmResetDialog] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const sigInputRef = useRef<HTMLInputElement>(null);
  const companyLogoInputRef = useRef<HTMLInputElement>(null);
  const [logoUploadProgress, setLogoUploadProgress] = useState(false);

  const handleResetAppearance = () => {
    resetAppearance();
    toast.info(
      "Appearance Reset",
      "All appearance settings restored to defaults.",
    );
  };

  // ── Security State (extended) ───────────────
  const {
    sessionTimeout,
    setSessionTimeout,
    twoFactorEnabled,
    setTwoFactorEnabled,
    allowExport,
    setAllowExport,
    auditLog,
    setAuditLog,
    dbEncryption,
    setDbEncryption,
  } = useSecurityStore();

  // -- Backup State � powered by backupService + useBackupStore -------------
  const {
    autoBackup,
    setAutoBackup,
    backupFreq,
    setBackupFreq,
    backupRetention,
    setBackupRetention,
    encryptBackups,
    setEncryptBackups,
    backupLocation,
    setBackupLocation,
    entries: backupEntries,
    isCreating: backupCreating,
  } = useBackupStore();

  // Map Zustand entries to the shape expected by the existing UI
  type BackupHistoryItem = {
    id: string;
    name: string;
    type: string;
    size: string;
    date: string;
    encrypted: boolean;
    filename: string;
    is_valid: boolean;
  };
  const backupHistory: BackupHistoryItem[] = backupEntries.map((e) => ({
    id: e.id,
    name: e.id,
    type: e.label,
    size: e.size_display,
    date: e.created_at,
    encrypted: encryptBackups,
    filename: e.filename,
    is_valid: e.is_valid,
  }));

  const [restoreConfirm, setRestoreConfirm] = React.useState<string | null>(
    null,
  );
  const [backupSearch, setBackupSearch] = React.useState("");

  const backupHistoryTable = useDataTable<
    BackupHistoryItem,
    "name" | "type" | "size" | "date"
  >({
    data: backupHistory,
    initialSortBy: "date",
    initialSortDir: "desc",
    initialPageSize: 8,
    pageSizeOptions: [5, 8, 15, 30],
    searchTerm: backupSearch,
    searchFn: (row, query) =>
      row.name.toLowerCase().includes(query) ||
      row.type.toLowerCase().includes(query) ||
      row.size.toLowerCase().includes(query) ||
      new Date(row.date).toLocaleDateString().toLowerCase().includes(query),
    sortComparators: {
      name: (a, b) => a.name.localeCompare(b.name),
      type: (a, b) => a.type.localeCompare(b.type),
      size: (a, b) => parseFloat(a.size) - parseFloat(b.size),
      date: (a, b) => a.date.localeCompare(b.date),
    },
    resetPageOn: [activeSection, backupHistory.length],
  });

  // Restart/stop auto-backup scheduler whenever preferences change
  React.useEffect(() => {
    backupService.applyAutoBackupPreference(autoBackup, backupFreq);
  }, [autoBackup, backupFreq]);

  const handleBackupFreqChange = (value: string) => {
    setBackupFreq(value as BackupFrequency);
  };

  const lastBackup = backupHistory.length > 0 ? backupHistory[0] : null;

  const handleCreateManualBackup = () => {
    void backupService.createBackup({ label: "Manual" });
  };

  const handleDeleteBackup = (id: string) => {
    const entry = backupHistory.find((b) => b.id === id);
    if (entry) void backupService.deleteBackup(entry.filename);
  };

  const handleRestoreBackup = (bk: BackupHistoryItem) => {
    void backupService.restoreBackup(bk.filename);
    setRestoreConfirm(null);
  };
  const handleDangerReset = () => {
    resetAllData();
    setConfirmResetDialog(false);
    toast.warning(
      "Database Reset",
      "All data erased. App restored to factory defaults.",
    );
  };

  const resetApp = useAuthStore((s) => s.resetApp);
  const [confirmFactoryReset, setConfirmFactoryReset] = useState(false);

  const handleFactoryReset = async () => {
    setConfirmFactoryReset(false);
    await resetApp();
  };

  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);

  // ── Reusable Company Form State (Create & Edit) ──
  const [cfName, setCfName] = useState("");
  const [cfTagline, setCfTagline] = useState("Wholesale Fruit Merchants");
  const [cfGstin, setCfGstin] = useState("");
  const [cfPan, setCfPan] = useState("");
  const [cfAddress, setCfAddress] = useState("");
  const [cfCity, setCfCity] = useState("");
  const [cfState, setCfState] = useState("Gujarat");
  const [cfPincode, setCfPincode] = useState("");
  const [cfPhone, setCfPhone] = useState("");
  const [cfEmail, setCfEmail] = useState("");
  const [cfCurrency, setCfCurrency] = useState("INR");
  const [cfInvPrefix, setCfInvPrefix] = useState("INV");
  const [cfInvStart, setCfInvStart] = useState(1001);
  const [cfBankName, setCfBankName] = useState("");
  const [cfAccountNo, setCfAccountNo] = useState("");
  const [cfIfsc, setCfIfsc] = useState("");
  const [cfUpiId, setCfUpiId] = useState("");
  const [cfLogo, setCfLogo] = useState("");
  const [cfStep, setCfStep] = useState(1);
  const [cfSaving, setCfSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = editingCompanyId !== null;
  const cfModalTitle = isEditMode ? "Edit Company" : "Create Company";

  const resetCompanyForm = () => {
    setCfName("");
    setCfTagline("Wholesale Fruit Merchants");
    setCfGstin("");
    setCfPan("");
    setCfAddress("");
    setCfCity("");
    setCfState("Gujarat");
    setCfPincode("");
    setCfPhone("");
    setCfEmail("");
    setCfCurrency("INR");
    setCfInvPrefix("INV");
    setCfInvStart(1001);
    setCfBankName("");
    setCfAccountNo("");
    setCfIfsc("");
    setCfUpiId("");
    setCfLogo("");
    setCfStep(1);
    setEditingCompanyId(null);
    setCfSaving(false);
  };

  const openCreateCompany = () => {
    resetCompanyForm();
    setShowCompanyModal(true);
  };

  const openEditCompany = (c: CompanyProfile) => {
    setEditingCompanyId(c.id);
    setCfName(c.company.name);
    setCfTagline(c.company.tagline);
    setCfGstin(c.company.gstin);
    setCfPan(c.pan || "");
    setCfAddress(c.company.address);
    setCfCity(c.city || "");
    setCfState(c.state || "Gujarat");
    setCfPincode(c.pincode || "");
    setCfPhone(c.company.phone);
    setCfEmail(c.company.email);
    setCfCurrency(c.financial.currency);
    setCfInvPrefix(c.invoice.salesPrefix);
    setCfInvStart(c.invoice.salesNextNo);
    setCfBankName(c.company.bankName);
    setCfAccountNo(c.company.accountNo);
    setCfIfsc(c.company.ifsc);
    setCfUpiId(c.company.upiId);
    setCfLogo(c.company.logo || "");
    setCfStep(1);
    setCfSaving(false);
    setShowCompanyModal(true);
  };

  const cfStep1Valid = cfName.trim().length >= 2 && cfPhone.trim().length >= 6;
  const cfStep2Valid = cfInvPrefix.trim().length > 0 && cfInvStart > 0;

  // ── Masters State ───────────────────────────
  const [selectedFruitId, setSelectedFruitId] = useState(fruits[0]?.id || "");
  const [newVariety, setNewVariety] = useState("");
  const [newFruitName, setNewFruitName] = useState("");
  const [newSupName, setNewSupName] = useState("");
  const [newSupCode, setNewSupCode] = useState("");
  const [newSupCity, setNewSupCity] = useState("");
  const [newCustName, setNewCustName] = useState("");
  const [newCustCity, setNewCustCity] = useState("");

  const handleSaveCompany = () => {
    setCfSaving(true);
    const profile: CompanyProfile = {
      id: editingCompanyId || `co-${Date.now()}`,
      company: {
        name: cfName.trim(),
        tagline: cfTagline,
        address: [cfAddress, cfCity, cfState, cfPincode]
          .filter(Boolean)
          .join(", "),
        phone: cfPhone,
        email: cfEmail,
        gstin: cfGstin.toUpperCase(),
        bankName: cfBankName,
        accountNo: cfAccountNo,
        ifsc: cfIfsc,
        upiId: cfUpiId,
        logo: cfLogo,
      },
      financial: {
        financialYearStart: "04-01",
        currency: cfCurrency,
        commissionRate: 8,
        defaultHamali: 0,
        defaultFreight: 0,
      },
      invoice: {
        salesPrefix: cfInvPrefix,
        purchasePrefix: "PUR",
        arrivalPrefix: "ARR",
        salesNextNo: cfInvStart,
        purchaseNextNo: 101,
        arrivalNextNo: 1,
        termsText: "Subject to APMC market yard rules.",
        footerNote: "Thank you for your business",
        showUPI: true,
        showBankDetails: true,
        templateStyle: "modern",
        brandColor: "#6366f1",
        enableQR: true,
        autoInvoiceNo: true,
        invoiceNumberMode: "sequential",
        businessPrefix: "TF",
        defaultTaxRate: 0,
        paymentDueDays: 15,
        showCompanyDetails: true,
        showPaymentDetails: true,
        watermarkType: "none",
        watermarkText: "",
        watermarkImage: "",
        watermarkOpacity: 0.08,
        watermarkSize: 110,
        watermarkPosition: "center",
        watermarkRepeat: false,
        signatureImage: "",
        invoiceLogo: "",
        enableInvoiceLogo: false,
      },
      createdAt: isEditMode
        ? companies.find((c) => c.id === editingCompanyId)?.createdAt ||
          new Date().toISOString()
        : new Date().toISOString(),
      pan: cfPan.toUpperCase(),
      city: cfCity,
      state: cfState,
      pincode: cfPincode,
    };
    setTimeout(() => {
      if (isEditMode) {
        updateCompany(profile);
        toast.success("Company Updated", `${cfName} details have been saved.`);
      } else {
        addCompany(profile);
        toast.success(
          "Company Created",
          `${cfName} has been registered. Switch to it anytime!`,
        );
      }
      setCfSaving(false);
      setShowCompanyModal(false);
      resetCompanyForm();
    }, 400);
  };

  // ── local editable copies for controlled inputs ──
  const [fin, setFin] = useState(settings.financial);
  const [inv, setInv] = useState(settings.invoice);
  const [sec, setSec] = useState(settings.security);

  // sync local state when settings change externally

  React.useEffect(() => {
    setFin(settings.financial);
  }, [settings.financial]);
  React.useEffect(() => {
    setInv(settings.invoice);
  }, [settings.invoice]);
  React.useEffect(() => {
    setSec(settings.security);
  }, [settings.security]);

  const sections: {
    id: Section;
    label: string;
    icon: React.ReactNode;
    desc: string;
  }[] = [
    {
      id: "COMPANIES",
      label: "Companies",
      icon: <Briefcase className="w-4 h-4" />,
      desc: "Create, manage & switch companies",
    },
    {
      id: "FINANCIAL",
      label: "Financial",
      icon: <DollarSign className="w-4 h-4" />,
      desc: "Currency, commission, defaults",
    },
    {
      id: "INVOICE",
      label: "Invoice & Numbering",
      icon: <FileText className="w-4 h-4" />,
      desc: "Prefixes, terms, footer, print options",
    },
    {
      id: "MASTERS",
      label: "Masters",
      icon: <Database className="w-4 h-4" />,
      desc: "Fruits, varieties, suppliers, customers",
    },
    {
      id: "BACKUP",
      label: "Backup & Data",
      icon: <HardDrive className="w-4 h-4" />,
      desc: "Export, import, reset all data",
    },
    {
      id: "APPEARANCE",
      label: "Appearance",
      icon: <Palette className="w-4 h-4" />,
      desc: "Theme, display preferences",
    },
    {
      id: "SECURITY",
      label: "Security & Lock",
      icon: <ShieldCheck className="w-4 h-4" />,
      desc: "App PIN, auto-lock timer",
    },
  ];

 

  // ── Input helper ──
  const Inp = ({
    label,
    value,
    onChange,
    placeholder = "",
    type = "text",
    mono = false,
    disabled = false,
  }: {
    label: string;
    value: string | number;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    mono?: boolean;
    disabled?: boolean;
  }) => (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-2.5 text-xs outline-none focus:border-cyan-500 transition-all disabled:opacity-50 ${mono ? "font-mono font-bold" : ""}`}
      />
    </div>
  );

  const Toggle = ({
    label,
    desc,
    checked,
    onChange,
  }: {
    label: string;
    desc: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-center justify-between py-3 border-b dark:border-slate-800 border-slate-200 last:border-0">
      <div>
        <div className="text-sm font-bold dark:text-white text-slate-900">
          {label}
        </div>
        <div className="text-[11px] dark:text-slate-400 text-slate-500">
          {desc}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${checked ? "bg-emerald-500" : "dark:bg-slate-700 bg-slate-300"}`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[22px]" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );

  const saveFinancial = () => {
    updateSettings({ financial: fin });
    toast.success(
      "Financial Saved",
      "Financial settings updated across the system.",
    );
  };
  const saveInvoice = () => {
    updateSettings({ invoice: inv });
    toast.success(
      "Invoice Settings Saved",
      "Numbering, terms, and print preferences updated.",
    );
  };
  const saveSecurity = async () => {
    if (
      sec.pinEnabled &&
      sec.appPin.trim().length > 0 &&
      sec.appPin.trim().length < 4
    ) {
      toast.error("Invalid PIN", "PIN must be at least 4 digits.");
      return;
    }

    await configureLockSecurity({
      pinEnabled: sec.pinEnabled,
      appPin: sec.appPin,
      autoLockMinutes: sec.autoLockMinutes,
    });

    const lockState = useLockStore.getState();
    updateSettings({
      security: {
        appPin: "",
        pinEnabled: lockState.pinEnabled,
        autoLockMinutes: lockState.autoLockMinutes,
      },
    });

    toast.success(
      "Security Updated",
      lockState.pinEnabled
        ? "App PIN protection and lock policy are active."
        : "Security settings saved.",
    );
  };

  const handleExport = () => {
    const blob = new Blob([getExportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tfc-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      "Backup Exported",
      "Full ERP data downloaded as JSON. Store safely!",
    );
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importData(reader.result as string);
      if (ok)
        toast.success(
          "Data Imported!",
          "All records restored from backup. Refresh recommended.",
        );
      else
        toast.error(
          "Import Failed",
          "Invalid JSON file. Please use a valid TFC backup.",
        );
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Storage usage ──
  const storageUsed = React.useMemo(() => {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("tfc_erp_"))
        total += (localStorage.getItem(key) || "").length;
    }
    return (total / 1024).toFixed(1);
  }, [vehicles, invoices, purchaseInvoices, payments]);

  const dataCounts = {
    vehicles: vehicles.length,
    invoices: invoices.length,
    purchaseInvoices: purchaseInvoices.length,
    payments: payments.length,
    suppliers: suppliers.length,
    customers: customers.length,
    fruits: fruits.length,
  };

  const invoicePreviewSample: Invoice = {
    id: "sample-invoice",
    invoiceNo: formatInvoiceNumber(
      inv,
      inv.salesNextNo || 1,
      new Date().toISOString().split("T")[0],
      invoices,
    ),
    date: new Date().toISOString().split("T")[0],
    customerId: "sample-customer",
    customerName: "Metro Fresh Supermarket",
    previousBalance: 35000,
    todayAmount: 42950,
    hamali: 350,
    discount: 100,
    paidAmount: 5000,
    remainingBalance: 72950,
    notes: "Sample invoice preview for style verification",
    createdAt: new Date().toISOString(),
    items: [
      {
        id: "s1",
        fruit: "Kesar Mango",
        lotVariety: "Grade A",
        caret: 12,
        weight: 220,
        rate: 85,
        amount: 18700,
      },
      {
        id: "s2",
        fruit: "Alphonso",
        lotVariety: "Export",
        caret: 8,
        weight: 120,
        rate: 140,
        amount: 16800,
      },
      {
        id: "s3",
        fruit: "Rajapuri",
        lotVariety: "Table",
        caret: 10,
        weight: 160,
        rate: 45,
        amount: 7200,
      },
    ],
  };

  return (
    <div className="space-y-6 font-sans">
      {/* ── HEADER ─────────────────────────────────── */}
      <div className="dark:bg-slate-900 bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 shadow-md">
        <h1 className="text-xl font-black dark:text-white text-slate-900 tracking-tight flex items-center space-x-2.5">
          <Settings className="w-6 h-6 text-cyan-500" />
          <span>SETTINGS & CONFIGURATION</span>
        </h1>
        <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5">
          Company profile, financial defaults, invoice numbering, data backup,
          appearance & security
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── LEFT SIDEBAR ─────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden sticky top-20">
            {sections.map((s) => {
              const active = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3.5 text-left transition-all cursor-pointer border-b dark:border-slate-800/60 border-slate-100 last:border-0 ${
                    active
                      ? "dark:bg-cyan-500/10 bg-cyan-50 text-cyan-700 dark:text-cyan-400 border-l-[3px] border-l-cyan-500"
                      : "dark:text-slate-300 text-slate-700 dark:hover:bg-slate-800/50 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg ${active ? "dark:bg-cyan-500/20 bg-cyan-100" : "dark:bg-slate-800 bg-slate-100"}`}
                  >
                    {s.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold">{s.label}</div>
                    <div className="text-[10px] dark:text-slate-500 text-slate-400 font-medium">
                      {s.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT CONTENT ────────────────────────── */}
        <div className="lg:col-span-3 space-y-0">
          {/* ═══ COMPANIES ═══ */}
          {activeSection === "COMPANIES" && (
            <div className="space-y-5 animate-slide-up">
              <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Briefcase className="w-4 h-4 text-cyan-500" />
                    <span className="text-sm font-bold dark:text-white text-slate-900">
                      All Companies
                    </span>
                    <span className="text-[10px] font-mono dark:bg-slate-800 bg-slate-200 dark:text-slate-400 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                      {companies.length}
                    </span>
                  </div>
                  <button
                    onClick={openCreateCompany}
                    className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Create New Company</span>
                  </button>
                </div>

                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {companies.map((c) => {
                    const isActive = c.id === activeCompanyId;
                    const coName = c.company?.name || "Unnamed Company";
                    const initials = getCompanyInitials(coName);
                    return (
                      <div
                        key={c.id}
                        className={`rounded-xl border-2 overflow-hidden transition-all ${isActive ? "dark:border-emerald-500/60 border-emerald-500 shadow-lg dark:shadow-emerald-500/10" : "dark:border-slate-800 border-slate-200 dark:hover:border-slate-700 hover:border-slate-300"}`}
                      >
                        <div className="p-4 flex items-start space-x-3.5">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black shrink-0 shadow-sm ${isActive ? "bg-gradient-to-br from-emerald-500 to-teal-500 text-slate-950" : "dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-600"}`}
                          >
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-bold dark:text-white text-slate-900 truncate">
                            {coName}
                              </span>
                              {isActive && (
                                <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono shrink-0">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] dark:text-slate-400 text-slate-500 truncate mt-0.5 font-medium">
                             {c.company?.tagline || ""}
                            </div>
                            <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px] dark:text-slate-500 text-slate-400 font-medium">
                              {c.company?.phone && (
                                <span className="flex items-center space-x-1">
                                  <Phone className="w-3 h-3" />
                                  <span>{c.company.phone}</span>
                                </span>
                              )}
                               {c.company?.gstin && (
                                <span className="font-mono font-bold">
                                  GSTIN: {c.company.gstin}
                                </span>
                              )}
                            </div>
                            
                            {c.company?.address && (
                              <div className="flex items-center space-x-1 mt-1 text-[10px] dark:text-slate-500 text-slate-400">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">
                                  {c.company.address}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="px-4 py-2.5 border-t dark:border-slate-800 border-slate-200 dark:bg-slate-950/50 bg-slate-50 flex items-center justify-between">
                          <div className="text-[10px] dark:text-slate-500 text-slate-400 font-mono">
                            {c.financial.currency} · {c.invoice.salesPrefix}-
                            {c.invoice.salesNextNo}
                          </div>
                          <div className="flex items-center space-x-1">
                            {/* Edit */}
                            <button
                              onClick={() => openEditCompany(c)}
                              title="Edit company details"
                              className="p-1.5 dark:text-slate-500 text-slate-400 hover:text-cyan-500 dark:hover:bg-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            {/* Switch */}
                            {!isActive && (
                              <button
                                onClick={() => {
                                  switchCompany(c.id);
                                  toast.success(
                                    "Company Switched",
                                    `Now operating as ${c.company.name}`,
                                  );
                                }}
                                className="flex items-center space-x-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors shadow-sm"
                              >
                                <Star className="w-3 h-3" />
                                <span>Switch</span>
                              </button>
                            )}
                            {isActive && (
                              <span className="flex items-center space-x-1 px-2.5 py-1.5 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                                <Check className="w-3.5 h-3.5" />
                                <span>Current</span>
                              </span>
                            )}
                            {/* Delete */}
                            {!isActive && companies.length > 1 && (
                              <button
                                onClick={async () => {
                                  const ok = await dialog.confirm({
                                    variant: "destructive",
                                    title: `Delete ${c.company.name}?`,
                                    description:
                                      "This will permanently remove the company profile and all associated configuration. This action cannot be undone.",
                                    confirmText: "Delete Company",
                                  });
                                  if (ok) {
                                    deleteCompany(c.id);
                                    toast.info(
                                      "Company Deleted",
                                      `${c.company.name} removed.`,
                                    );
                                  }
                                }}
                                className="p-1.5 dark:text-slate-500 text-slate-400 hover:text-rose-500 dark:hover:bg-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Add Company Card */}
                  <button
                    onClick={openCreateCompany}
                    className="rounded-xl border-2 border-dashed dark:border-slate-700 border-slate-300 dark:hover:border-indigo-500/50 hover:border-indigo-500/50 p-8 flex flex-col items-center justify-center space-y-2 cursor-pointer transition-all group"
                  >
                    <div className="p-3 rounded-xl dark:bg-slate-800 bg-slate-100 dark:group-hover:bg-indigo-500/10 group-hover:bg-indigo-50 transition-colors">
                      <Plus className="w-6 h-6 dark:text-slate-500 text-slate-400 dark:group-hover:text-indigo-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <div className="text-xs font-bold dark:text-slate-400 text-slate-500 dark:group-hover:text-white group-hover:text-slate-900 transition-colors">
                      Add New Company
                    </div>
                    <div className="text-[10px] dark:text-slate-600 text-slate-400">
                      Multi-company support
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ FINANCIAL ═══ */}
          {activeSection === "FINANCIAL" && (
            <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden animate-slide-up">
              <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-bold dark:text-white text-slate-900">
                    Financial Settings
                  </span>
                </div>
                <button
                  onClick={saveFinancial}
                  className="flex items-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow cursor-pointer transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1">
                      Financial Year Start (MM-DD)
                    </label>
                    <input
                      type="text"
                      value={fin.financialYearStart}
                      onChange={(e) =>
                        setFin((p) => ({
                          ...p,
                          financialYearStart: e.target.value,
                        }))
                      }
                      placeholder="04-01"
                      className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-2.5 text-xs outline-none focus:border-cyan-500 font-mono font-bold"
                    />
                    <span className="text-[10px] dark:text-slate-500 text-slate-400 mt-0.5 block">
                      April 1 = 04-01 (Indian FY)
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1">
                      Currency
                    </label>
                    <select
                      value={fin.currency}
                      onChange={(e) =>
                        setFin((p) => ({ ...p, currency: e.target.value }))
                      }
                      className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-2.5 text-xs font-bold outline-none cursor-pointer focus:border-cyan-500"
                    >
                      <option value="INR">₹ INR — Indian Rupee</option>
                      <option value="USD">$ USD — US Dollar</option>
                      <option value="AED">د.إ AED — UAE Dirham</option>
                    </select>
                  </div>
                  <Inp
                    label="APMC Commission Rate (%)"
                    type="number"
                    value={fin.commissionRate}
                    onChange={(v) =>
                      setFin((p) => ({
                        ...p,
                        commissionRate: parseFloat(v) || 0,
                      }))
                    }
                    placeholder="8"
                    mono
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Inp
                    label="Default Hamali / Loading Charge (₹)"
                    type="number"
                    value={fin.defaultHamali}
                    onChange={(v) =>
                      setFin((p) => ({
                        ...p,
                        defaultHamali: parseFloat(v) || 0,
                      }))
                    }
                    placeholder="0"
                    mono
                  />
                  <Inp
                    label="Default Freight / Transport (₹)"
                    type="number"
                    value={fin.defaultFreight}
                    onChange={(v) =>
                      setFin((p) => ({
                        ...p,
                        defaultFreight: parseFloat(v) || 0,
                      }))
                    }
                    placeholder="0"
                    mono
                  />
                </div>
                <div className="p-4 dark:bg-slate-950 bg-slate-50 rounded-xl border dark:border-slate-800 border-slate-200 flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-xs dark:text-slate-400 text-slate-600 leading-relaxed">
                    Default values auto-fill into new invoices & vehicle
                    entries. You can always override them per transaction.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ INVOICE ═══ */}
          {activeSection === "INVOICE" && (
            <div className="space-y-5 animate-slide-up">
              {/* Save button bar */}
              <div className="flex items-center justify-end">
                <button
                  onClick={saveInvoice}
                  className="flex items-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-cyan-500/15 cursor-pointer transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save All Invoice Settings</span>
                </button>
              </div>

              {/* 1. Invoice Template */}
              <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2">
                  <Palette className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-bold dark:text-white text-slate-900">
                    Invoice Template
                  </span>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1.5">
                        Template Style
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          [
                            "modern",
                            "classic",
                            "minimal",
                            "professional",
                          ] as const
                        ).map((s) => (
                          <button
                            key={s}
                            onClick={() =>
                              setInv((p) => ({ ...p, templateStyle: s }))
                            }
                            className={`py-2.5 rounded-xl text-xs font-bold border-2 cursor-pointer transition-all capitalize ${inv.templateStyle === s ? "border-indigo-500 dark:bg-indigo-500/10 bg-indigo-50 text-indigo-700 dark:text-indigo-400 shadow-md" : "dark:border-slate-800 border-slate-200 dark:text-slate-400 text-slate-500"}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1.5">
                        Brand Color
                      </label>
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={inv.brandColor || "#6366f1"}
                          onChange={(e) =>
                            setInv((p) => ({
                              ...p,
                              brandColor: e.target.value,
                            }))
                          }
                          className="w-10 h-10 rounded-xl border-2 dark:border-slate-700 border-slate-300 cursor-pointer p-0.5"
                        />
                        <div className="flex-1 dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 rounded-xl p-2.5 text-xs font-mono font-bold dark:text-white text-slate-900 uppercase">
                          {inv.brandColor || "#6366f1"}
                        </div>
                        <div
                          className="w-20 h-10 rounded-xl shadow-sm"
                          style={{
                            backgroundColor: inv.brandColor || "#6366f1",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Invoice Options */}
              <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2">
                  <QrCode className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-bold dark:text-white text-slate-900">
                    Invoice Options
                  </span>
                </div>
                <div className="p-6">
                  <Toggle
                    label="Enable QR Code on Invoice"
                    desc="Auto-generate payment QR from UPI ID"
                    checked={inv.enableQR ?? true}
                    onChange={(v) => setInv((p) => ({ ...p, enableQR: v }))}
                  />
                  <Toggle
                    label="Auto Invoice Numbering"
                    desc="Automatically increment invoice number after each bill"
                    checked={inv.autoInvoiceNo ?? true}
                    onChange={(v) =>
                      setInv((p) => ({ ...p, autoInvoiceNo: v }))
                    }
                  />
                  <Toggle
                    label="Show UPI / QR Details"
                    desc="Display UPI ID for mobile payments"
                    checked={inv.showUPI}
                    onChange={(v) => setInv((p) => ({ ...p, showUPI: v }))}
                  />
                  <Toggle
                    label="Show Bank Account Details"
                    desc="Display bank A/C, IFSC on printed invoices"
                    checked={inv.showBankDetails}
                    onChange={(v) =>
                      setInv((p) => ({ ...p, showBankDetails: v }))
                    }
                  />
                </div>
              </div>

              {/* 3. Numbering & Financial Defaults */}
              <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-bold dark:text-white text-slate-900">
                    Numbering & Financial Defaults
                  </span>
                </div>
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Inp
                      label="Sales Prefix"
                      value={inv.salesPrefix}
                      onChange={(v) =>
                        setInv((p) => ({ ...p, salesPrefix: v }))
                      }
                      mono
                    />
                    <Inp
                      label="Next Sales No."
                      type="number"
                      value={inv.salesNextNo}
                      onChange={(v) =>
                        setInv((p) => ({ ...p, salesNextNo: parseInt(v) || 0 }))
                      }
                      mono
                    />
                    <Inp
                      label="Purchase Prefix"
                      value={inv.purchasePrefix}
                      onChange={(v) =>
                        setInv((p) => ({ ...p, purchasePrefix: v }))
                      }
                      mono
                    />
                    <Inp
                      label="Next Purchase No."
                      type="number"
                      value={inv.purchaseNextNo}
                      onChange={(v) =>
                        setInv((p) => ({
                          ...p,
                          purchaseNextNo: parseInt(v) || 0,
                        }))
                      }
                      mono
                    />
                    <Inp
                      label="Arrival Prefix"
                      value={inv.arrivalPrefix}
                      onChange={(v) =>
                        setInv((p) => ({ ...p, arrivalPrefix: v }))
                      }
                      mono
                    />
                    <Inp
                      label="Next Arrival No."
                      type="number"
                      value={inv.arrivalNextNo}
                      onChange={(v) =>
                        setInv((p) => ({
                          ...p,
                          arrivalNextNo: parseInt(v) || 0,
                        }))
                      }
                      mono
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t dark:border-slate-800 border-slate-200">
                    <Inp
                      label="Default Tax Rate (%)"
                      type="number"
                      value={inv.defaultTaxRate ?? 0}
                      onChange={(v) =>
                        setInv((p) => ({
                          ...p,
                          defaultTaxRate: parseFloat(v) || 0,
                        }))
                      }
                      placeholder="0"
                      mono
                    />
                    <Inp
                      label="Payment Due Days"
                      type="number"
                      value={inv.paymentDueDays ?? 15}
                      onChange={(v) =>
                        setInv((p) => ({
                          ...p,
                          paymentDueDays: parseInt(v) || 0,
                        }))
                      }
                      placeholder="15"
                      mono
                    />
                  </div>
                </div>
              </div>

              {/* 4. Invoice Content */}
              <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-bold dark:text-white text-slate-900">
                    Invoice Content
                  </span>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1">
                      Terms & Conditions
                    </label>
                    <textarea
                      value={inv.termsText}
                      onChange={(e) =>
                        setInv((p) => ({ ...p, termsText: e.target.value }))
                      }
                      rows={3}
                      placeholder="Subject to APMC market yard rules..."
                      className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-3 text-xs outline-none focus:border-cyan-500 resize-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1">
                      Footer Notes
                    </label>
                    <textarea
                      value={inv.footerNote}
                      onChange={(e) =>
                        setInv((p) => ({ ...p, footerNote: e.target.value }))
                      }
                      rows={2}
                      placeholder="Thank you for your business"
                      className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-3 text-xs outline-none focus:border-cyan-500 resize-none transition-all"
                    />
                  </div>
                  <Toggle
                    label="Show Company Details"
                    desc="Display company name, address, GSTIN on invoice header"
                    checked={inv.showCompanyDetails ?? true}
                    onChange={(v) =>
                      setInv((p) => ({ ...p, showCompanyDetails: v }))
                    }
                  />
                  <Toggle
                    label="Show Payment Details"
                    desc="Display bank/UPI payment information on invoice"
                    checked={inv.showPaymentDetails ?? true}
                    onChange={(v) =>
                      setInv((p) => ({ ...p, showPaymentDetails: v }))
                    }
                  />
                </div>
              </div>

              {/* 5. Invoice Branding — Signature + Logo side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* ── Signature Upload ────────────────── */}
                <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2">
                    <PenTool className="w-4 h-4 text-cyan-500" />
                    <span className="text-sm font-bold dark:text-white text-slate-900">
                      Signature
                    </span>
                  </div>
                  <div className="p-6 flex flex-col gap-4 flex-1">
                    {inv.signatureImage ? (
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <img
                            src={inv.signatureImage}
                            alt="Signature"
                            className="h-16 max-w-[180px] object-contain border dark:border-slate-700 border-slate-300 rounded-xl p-2 dark:bg-slate-950 bg-slate-50"
                          />
                          <button
                            onClick={() =>
                              setInv((p) => ({ ...p, signatureImage: "" }))
                            }
                            title="Remove signature"
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center cursor-pointer text-xs shadow"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => sigInputRef.current?.click()}
                          className="text-[11px] font-bold dark:text-indigo-400 text-indigo-600 hover:underline cursor-pointer"
                        >
                          Replace
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => sigInputRef.current?.click()}
                        className="h-20 border-2 border-dashed dark:border-slate-700 border-slate-300 rounded-xl flex flex-col items-center justify-center cursor-pointer dark:hover:border-cyan-500/50 hover:border-cyan-500/50 transition-colors gap-1.5"
                      >
                        <Image className="w-5 h-5 dark:text-slate-500 text-slate-400" />
                        <span className="text-xs dark:text-slate-500 text-slate-400 font-medium">
                          Click or drop to upload
                        </span>
                        <span className="text-[10px] dark:text-slate-600 text-slate-400">
                          PNG, JPG supported
                        </span>
                      </div>
                    )}
                    <input
                      ref={sigInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () =>
                            setInv((p) => ({
                              ...p,
                              signatureImage: reader.result as string,
                            }));
                          reader.readAsDataURL(file);
                        }
                        e.target.value = "";
                      }}
                    />
                    <p className="text-[11px] dark:text-slate-400 text-slate-500 leading-relaxed">
                      Appears in the authorized signatory section of printed
                      invoices. Max 500 KB recommended.
                    </p>
                  </div>
                </div>

                {/* ── Invoice Logo Upload ──────────────── */}
                <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Image className="w-4 h-4 text-violet-500" />
                      <span className="text-sm font-bold dark:text-white text-slate-900">
                        Invoice Logo
                      </span>
                    </div>
                    {/* Enable toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className="text-[11px] font-semibold dark:text-slate-400 text-slate-500">
                        Enable Custom Logo
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={inv.enableInvoiceLogo ?? false}
                        onClick={() =>
                          setInv((p) => ({
                            ...p,
                            enableInvoiceLogo: !(p.enableInvoiceLogo ?? false),
                          }))
                        }
                        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer focus:outline-none ${(inv.enableInvoiceLogo ?? false) ? "bg-violet-600" : "dark:bg-slate-700 bg-slate-300"}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform ${(inv.enableInvoiceLogo ?? false) ? "translate-x-4" : "translate-x-0"}`}
                        />
                      </button>
                    </label>
                  </div>
                  <div className="p-6 flex flex-col gap-4 flex-1">
                    {/* Upload area */}
                    {inv.invoiceLogo ? (
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <img
                            src={inv.invoiceLogo}
                            alt="Invoice Logo"
                            className="h-16 max-w-[180px] object-contain border dark:border-slate-700 border-slate-300 rounded-xl p-2 dark:bg-slate-950 bg-slate-50"
                          />
                          <button
                            onClick={() =>
                              setInv((p) => ({ ...p, invoiceLogo: "" }))
                            }
                            title="Remove logo"
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center cursor-pointer text-xs shadow"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          onClick={() => logoInputRef.current?.click()}
                          className="text-[11px] font-bold dark:text-violet-400 text-violet-600 hover:underline cursor-pointer"
                        >
                          Replace
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => logoInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (
                            file &&
                            /image\/(png|jpe?g|svg\+xml)/.test(file.type)
                          ) {
                            setLogoUploadProgress(true);
                            const reader = new FileReader();
                            reader.onload = () => {
                              setInv((p) => ({
                                ...p,
                                invoiceLogo: reader.result as string,
                              }));
                              setLogoUploadProgress(false);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className={`h-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors gap-1.5 ${logoUploadProgress ? "dark:border-violet-500/60 border-violet-400/60 animate-pulse" : "dark:border-slate-700 border-slate-300 dark:hover:border-violet-500/50 hover:border-violet-500/50"}`}
                      >
                        {logoUploadProgress ? (
                          <span className="text-xs dark:text-violet-400 text-violet-600 font-semibold">
                            Uploading…
                          </span>
                        ) : (
                          <>
                            <Image className="w-5 h-5 dark:text-slate-500 text-slate-400" />
                            <span className="text-xs dark:text-slate-500 text-slate-400 font-medium">
                              Click or drag &amp; drop to upload
                            </span>
                            <span className="text-[10px] dark:text-slate-600 text-slate-400">
                              PNG, JPG, SVG · max 1 MB
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setLogoUploadProgress(true);
                          const reader = new FileReader();
                          reader.onload = () => {
                            setInv((p) => ({
                              ...p,
                              invoiceLogo: reader.result as string,
                            }));
                            setLogoUploadProgress(false);
                          };
                          reader.readAsDataURL(file);
                        }
                        e.target.value = "";
                      }}
                    />
                    {/* Fallback helper */}
                    <p className="text-[11px] dark:text-slate-400 text-slate-500 leading-relaxed">
                      Invoice Logo overrides the default company logo in printed
                      invoices. If disabled, the system automatically uses the
                      company master logo.
                    </p>
                    {/* Status badge */}
                    {!(inv.enableInvoiceLogo ?? false) && (
                      <div className="flex items-center gap-1.5 text-[11px] dark:text-amber-400 text-amber-600 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Custom logo disabled — company master logo will be
                          used
                        </span>
                      </div>
                    )}
                    {(inv.enableInvoiceLogo ?? false) && !inv.invoiceLogo && (
                      <div className="flex items-center gap-1.5 text-[11px] dark:text-amber-400 text-amber-600 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          No logo uploaded — falling back to company master logo
                        </span>
                      </div>
                    )}
                    {(inv.enableInvoiceLogo ?? false) && inv.invoiceLogo && (
                      <div className="flex items-center gap-1.5 text-[11px] dark:text-emerald-400 text-emerald-600 font-semibold">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span>Custom invoice logo active</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 6. Invoice Preview & Actions */}
              <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-bold dark:text-white text-slate-900">
                    Invoice Preview & Actions
                  </span>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <button
                      onClick={() => setShowInvoicePreview(true)}
                      className="flex flex-col items-center space-y-2 p-4 rounded-xl border-2 dark:border-slate-800 border-slate-200 dark:hover:border-indigo-500/50 hover:border-indigo-500/50 cursor-pointer transition-all group"
                    >
                      <div className="p-2.5 dark:bg-indigo-500/10 bg-indigo-50 text-indigo-500 rounded-xl group-hover:scale-110 transition-transform">
                        <Eye className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold dark:text-slate-300 text-slate-700">
                        View A4 Preview
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setShowInvoicePreview(true);
                        setTimeout(() => window.print(), 300);
                      }}
                      className="flex flex-col items-center space-y-2 p-4 rounded-xl border-2 dark:border-slate-800 border-slate-200 dark:hover:border-emerald-500/50 hover:border-emerald-500/50 cursor-pointer transition-all group"
                    >
                      <div className="p-2.5 dark:bg-emerald-500/10 bg-emerald-50 text-emerald-500 rounded-xl group-hover:scale-110 transition-transform">
                        <Printer className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold dark:text-slate-300 text-slate-700">
                        Print A4 Invoice
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setShowInvoicePreview(true);
                        setTimeout(() => window.print(), 300);
                        toast.info(
                          "Save as PDF",
                          'Choose "Save as PDF" in the print dialog.',
                        );
                      }}
                      className="flex flex-col items-center space-y-2 p-4 rounded-xl border-2 dark:border-slate-800 border-slate-200 dark:hover:border-blue-500/50 hover:border-blue-500/50 cursor-pointer transition-all group"
                    >
                      <div className="p-2.5 dark:bg-blue-500/10 bg-blue-50 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                        <Download className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold dark:text-slate-300 text-slate-700">
                        Download A4 PDF
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        const msg = encodeURIComponent(
                          `Invoice from ${settings.company.name}\nContact: ${settings.company.phone}\n${settings.company.email}`,
                        );
                        window.open(`https://wa.me/?text=${msg}`, "_blank");
                      }}
                      className="flex flex-col items-center space-y-2 p-4 rounded-xl border-2 dark:border-slate-800 border-slate-200 dark:hover:border-green-500/50 hover:border-green-500/50 cursor-pointer transition-all group"
                    >
                      <div className="p-2.5 dark:bg-green-500/10 bg-green-50 text-green-500 rounded-xl group-hover:scale-110 transition-transform">
                        <Share2 className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold dark:text-slate-300 text-slate-700">
                        Share WhatsApp
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invoice Preview Modal */}
          {showInvoicePreview && (
            <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-8 animate-fade-in">
              <div className="bg-white border border-slate-200 rounded-2xl max-w-[820px] w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-slide-up">
                <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between no-print">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        A4 Invoice Preview
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        Sample invoice with current settings
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => window.print()}
                      className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Print</span>
                    </button>
                    <button
                      onClick={() => setShowInvoicePreview(false)}
                      className="p-2 text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto bg-white text-slate-900 printable-patti">
                  <div className="p-6 sm:p-8 max-w-[820px] mx-auto">
                    <InvoiceTemplateRenderer
                      invoice={invoicePreviewSample}
                      company={settings.company}
                      invoiceSettings={inv}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ MASTERS ═══ */}
          {activeSection === "MASTERS" && (
            <div className="space-y-5 animate-slide-up">
              {/* Fruit & Variety Management */}
              <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-teal-500" />
                    <span className="text-sm font-bold dark:text-white text-slate-900">
                      Fruit & Variety Hierarchy
                    </span>
                  </div>
                  <span className="text-[10px] font-mono dark:bg-slate-800 bg-slate-200 dark:text-slate-400 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                    {fruits.length} fruits
                  </span>
                </div>
                <div className="p-5 space-y-4">
                  {/* Add new fruit */}
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1">
                        Add New Fruit Category
                      </label>
                      <input
                        type="text"
                        value={newFruitName}
                        onChange={(e) => setNewFruitName(e.target.value)}
                        placeholder="e.g. Dragon Fruit, Litchi..."
                        className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-2.5 text-xs font-semibold outline-none focus:border-teal-500 transition-all"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (newFruitName.trim()) {
                          addFruit(newFruitName.trim());
                          toast.success(
                            "Fruit Added",
                            `${newFruitName.trim()} added to hierarchy.`,
                          );
                          setNewFruitName("");
                        }
                      }}
                      className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 inline mr-1" />
                      Add
                    </button>
                  </div>

                  {/* Fruit list with variety management */}
                  <div className="space-y-3">
                    {fruits.map((f) => (
                      <div
                        key={f.id}
                        className="dark:bg-slate-950 bg-slate-50 rounded-xl border dark:border-slate-800 border-slate-200 overflow-hidden"
                      >
                        <div className="px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">🍃</span>
                            <span className="text-xs font-bold dark:text-white text-slate-900">
                              {f.name}
                            </span>
                            <span className="text-[10px] font-mono dark:bg-slate-800 bg-slate-200 dark:text-slate-400 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                              {f.varieties.length} varieties
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              setSelectedFruitId(
                                selectedFruitId === f.id ? "" : f.id,
                              )
                            }
                            className="text-[10px] font-bold text-teal-600 dark:text-teal-400 cursor-pointer hover:underline"
                          >
                            {selectedFruitId === f.id ? "Collapse" : "Manage →"}
                          </button>
                        </div>
                        {selectedFruitId === f.id && (
                          <div className="px-4 pb-4 pt-0 space-y-3 border-t dark:border-slate-800 border-slate-200 animate-slide-down">
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {f.varieties.map((v, vi) => (
                                <span
                                  key={vi}
                                  className="dark:bg-slate-800 bg-slate-200 dark:text-slate-300 text-slate-700 border dark:border-slate-700 border-slate-300 px-2.5 py-1 rounded-lg text-[11px] font-bold"
                                >
                                  {v}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-end gap-2">
                              <div className="flex-1">
                                <input
                                  type="text"
                                  value={newVariety}
                                  onChange={(e) =>
                                    setNewVariety(e.target.value)
                                  }
                                  placeholder="New variety name..."
                                  className="w-full dark:bg-slate-900 bg-white border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-lg p-2 text-xs font-medium outline-none focus:border-teal-500 transition-all"
                                  onKeyDown={(e) => {
                                    if (
                                      e.key === "Enter" &&
                                      newVariety.trim()
                                    ) {
                                      addFruitVariety(f.id, newVariety.trim());
                                      toast.success(
                                        "Variety Added",
                                        `${newVariety.trim()} added to ${f.name}.`,
                                      );
                                      setNewVariety("");
                                    }
                                  }}
                                />
                              </div>
                              <button
                                onClick={() => {
                                  if (newVariety.trim()) {
                                    addFruitVariety(f.id, newVariety.trim());
                                    toast.success(
                                      "Variety Added",
                                      `${newVariety.trim()} added to ${f.name}.`,
                                    );
                                    setNewVariety("");
                                  }
                                }}
                                className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors shadow-sm shrink-0"
                              >
                                <Plus className="w-3 h-3 inline mr-0.5" />
                                Add
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick Add Supplier & Customer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Supplier */}
                <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2">
                    <Star className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold dark:text-white text-slate-900">
                      Quick Add Supplier
                    </span>
                    <span className="text-[10px] font-mono dark:bg-slate-800 bg-slate-200 dark:text-slate-400 text-slate-600 px-1.5 py-0.5 rounded font-bold ml-auto">
                      {suppliers.length}
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    <Inp
                      label="Supplier Name *"
                      value={newSupName}
                      onChange={setNewSupName}
                      placeholder="e.g. Ramesh Agro Traders"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Inp
                        label="Code *"
                        value={newSupCode}
                        onChange={(v) => setNewSupCode(v.toUpperCase())}
                        placeholder="RAT-01"
                        mono
                      />
                      <Inp
                        label="City"
                        value={newSupCity}
                        onChange={setNewSupCity}
                        placeholder="Valsad"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (!newSupName.trim() || !newSupCode.trim()) {
                          toast.error("Required", "Name & code are required.");
                          return;
                        }
                        addSupplier({
                          name: newSupName.trim(),
                          code: newSupCode.trim(),
                          city: newSupCity || "Local",
                          phone: "",
                          previousBalance: 0,
                        });
                        toast.success(
                          "Supplier Added",
                          `${newSupName.trim()} registered.`,
                        );
                        setNewSupName("");
                        setNewSupCode("");
                        setNewSupCity("");
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors shadow-sm flex items-center justify-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save Supplier</span>
                    </button>
                  </div>
                </div>

                {/* Customer */}
                <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2">
                    <Star className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold dark:text-white text-slate-900">
                      Quick Add Customer
                    </span>
                    <span className="text-[10px] font-mono dark:bg-slate-800 bg-slate-200 dark:text-slate-400 text-slate-600 px-1.5 py-0.5 rounded font-bold ml-auto">
                      {customers.length}
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    <Inp
                      label="Customer / Buyer Name *"
                      value={newCustName}
                      onChange={setNewCustName}
                      placeholder="e.g. Metro Fresh Mart"
                    />
                    <Inp
                      label="City"
                      value={newCustCity}
                      onChange={setNewCustCity}
                      placeholder="Mumbai"
                    />
                    <button
                      onClick={() => {
                        if (!newCustName.trim()) {
                          toast.error("Required", "Customer name is required.");
                          return;
                        }
                        addCustomer({
                          name: newCustName.trim(),
                          city: newCustCity || "Local",
                          phone: "",
                          previousBalance: 0,
                        });
                        toast.success(
                          "Customer Added",
                          `${newCustName.trim()} registered.`,
                        );
                        setNewCustName("");
                        setNewCustCity("");
                      }}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors shadow-sm flex items-center justify-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save Customer</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ BACKUP & DATA ═══ */}
          {activeSection === "BACKUP" && (
            <div className="space-y-5 animate-slide-up">
              {/* Storage overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {Object.entries(dataCounts).map(([k, v]) => (
                  <div
                    key={k}
                    className="dark:bg-slate-900 bg-white p-3.5 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm text-center"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500">
                      {k}
                    </div>
                    <div className="text-lg font-black font-mono dark:text-white text-slate-900 mt-0.5">
                      {v}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── 1. AUTOMATIC BACKUPS ───────────── */}
              <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-cyan-500" />
                    <span className="text-sm font-bold dark:text-white text-slate-900">
                      Automatic Backups
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs dark:text-slate-400 text-slate-500">
                    <HardDrive className="w-3.5 h-3.5" />
                    <span className="font-mono font-bold">
                      {storageUsed} KB
                    </span>
                  </div>
                </div>
                <div className="p-6 space-y-1">
                  <Toggle
                    label="Enable Automatic Backups"
                    desc="Automatically create backups on a schedule"
                    checked={autoBackup}
                    onChange={setAutoBackup}
                  />
                  {autoBackup && (
                    <div className="pl-2 ml-1 border-l-2 dark:border-cyan-500/30 border-cyan-300 space-y-4 pt-3 animate-slide-down">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1">
                            Backup Frequency
                          </label>
                          <select
                            value={backupFreq}
                            onChange={(e) =>
                              handleBackupFreqChange(e.target.value)
                            }
                            className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-2.5 text-xs font-bold outline-none cursor-pointer focus:border-cyan-500"
                          >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                        <Inp
                          label="Retention Period (days)"
                          type="number"
                          value={backupRetention}
                          onChange={(v) =>
                            setBackupRetention(parseInt(v) || 30)
                          }
                          placeholder="30"
                          mono
                        />
                      </div>
                      <Inp
                        label="Backup Location (path)"
                        value={backupLocation}
                        onChange={setBackupLocation}
                        placeholder="/backups"
                        mono
                      />
                      <Toggle
                        label="Encrypt Backups"
                        desc="AES-256 encryption for sensitive data"
                        checked={encryptBackups}
                        onChange={setEncryptBackups}
                      />
                      <Toggle
                        label="Cloud Backup"
                        desc="Sync to cloud storage (coming soon)"
                        checked={false}
                        onChange={() =>
                          toast.info(
                            "Coming Soon",
                            "Cloud backup integration is under development.",
                          )
                        }
                      />
                    </div>
                  )}
                </div>
                {/* Last Backup Status + Manual Button */}
                <div className="px-6 py-4 border-t dark:border-slate-800 border-slate-200 dark:bg-slate-950/50 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                  {lastBackup ? (
                    <div className="flex items-center space-x-2 text-xs dark:text-slate-400 text-slate-500">
                      <div className="p-1.5 dark:bg-emerald-500/10 bg-emerald-50 text-emerald-500 rounded-lg">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-bold dark:text-slate-300 text-slate-700">
                          Last Backup:
                        </span>{" "}
                        <span className="font-mono">
                          {new Date(lastBackup.date).toLocaleString()}
                        </span>{" "}
                        <span className="dark:text-slate-500 text-slate-400">
                          ({lastBackup.size})
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs dark:text-slate-500 text-slate-400">
                      No backups created yet
                    </div>
                  )}
                  <button
                    onClick={handleCreateManualBackup}
                    disabled={backupCreating}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow cursor-pointer transition-colors disabled:opacity-60 shrink-0"
                  >
                    {backupCreating ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Create Manual Backup</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* ── 2. BACKUP HISTORY ─────────────── */}
              <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-cyan-500" />
                    <span className="text-sm font-bold dark:text-white text-slate-900">
                      Backup History
                    </span>
                    <span className="text-[10px] font-mono dark:bg-slate-800 bg-slate-200 dark:text-slate-400 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                      {backupHistory.length}
                    </span>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 dark:text-slate-500 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={backupSearch}
                      onChange={(e) => setBackupSearch(e.target.value)}
                      placeholder="Search backups..."
                      className="erp-input w-full pl-9 pr-3 py-2 text-xs"
                    />
                  </div>
                </div>
                {backupHistoryTable.totalRecords === 0 ? (
                  <div className="p-10 text-center">
                    <Database className="w-10 h-10 dark:text-slate-700 text-slate-300 mx-auto mb-3" />
                    <div className="text-sm font-bold dark:text-slate-400 text-slate-500">
                      {backupHistory.length === 0
                        ? "No backups found"
                        : "No backups match your search"}
                    </div>
                    <p className="text-xs dark:text-slate-500 text-slate-400 mt-1">
                      {backupHistory.length === 0
                        ? "Create your first backup to see it here."
                        : "Try a different keyword."}
                    </p>
                    <button
                      onClick={handleCreateManualBackup}
                      className="mt-3 inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Create Backup</span>
                    </button>
                  </div>
                ) : (
                  <DataTable
                    footer={
                      <Pagination
                        page={backupHistoryTable.page}
                        totalPages={backupHistoryTable.totalPages}
                        totalRecords={backupHistoryTable.totalRecords}
                        pageSize={backupHistoryTable.pageSize}
                        pageSizeOptions={backupHistoryTable.pageSizeOptions}
                        onPageChange={backupHistoryTable.setPage}
                        onPageSizeChange={backupHistoryTable.setPageSize}
                        label="backups"
                      />
                    }
                  >
                    <table className="erp-table text-left text-xs sm:text-sm">
                      <thead>
                        <tr>
                          <th className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() =>
                                backupHistoryTable.toggleSort("name")
                              }
                              className="inline-flex items-center gap-1"
                            >
                              Backup <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>
                          </th>
                          <th className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() =>
                                backupHistoryTable.toggleSort("type")
                              }
                              className="inline-flex items-center gap-1"
                            >
                              Type <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>
                          </th>
                          <th className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() =>
                                backupHistoryTable.toggleSort("size")
                              }
                              className="inline-flex items-center gap-1"
                            >
                              Size <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>
                          </th>
                          <th className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() =>
                                backupHistoryTable.toggleSort("date")
                              }
                              className="inline-flex items-center gap-1"
                            >
                              Date <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>
                          </th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backupHistoryTable.pageRows.map((bk) => (
                          <tr key={bk.id} className="group">
                            <td className="py-3 px-4 font-mono text-xs font-bold dark:text-slate-200 text-slate-800">
                              {bk.name}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`font-bold px-2 py-0.5 rounded border text-[10px] font-mono ${bk.type === "Manual" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"}`}
                              >
                                {bk.type}
                              </span>
                              {bk.encrypted && (
                                <span className="ml-2 inline-flex items-center gap-0.5 text-amber-500 text-[10px]">
                                  <Lock className="w-3 h-3" />
                                  Encrypted
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono text-xs dark:text-slate-300 text-slate-700">
                              {bk.size}
                            </td>
                            <td className="py-3 px-3 text-xs dark:text-slate-400 text-slate-600">
                              {new Date(bk.date).toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end space-x-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => setRestoreConfirm(bk.id)}
                                  className="p-1.5 dark:text-slate-400 text-slate-500 hover:text-blue-500 dark:hover:bg-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                                  title="Restore"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBackup(bk.id)}
                                  className="p-1.5 dark:text-slate-400 text-slate-500 hover:text-rose-500 dark:hover:bg-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
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
              </div>

              {/* ── 3. DATABASE MANAGEMENT ─────────── */}
              <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2">
                  <HardDrive className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-bold dark:text-white text-slate-900">
                    Database Management
                  </span>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 dark:bg-slate-950 bg-slate-50 rounded-xl border dark:border-slate-800 border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="text-sm font-bold dark:text-white text-slate-900 flex items-center space-x-2">
                          <Download className="w-4 h-4 text-emerald-500" />
                          <span>Export Database</span>
                        </div>
                        <div className="text-[11px] dark:text-slate-400 text-slate-500 mt-1">
                          Download complete ERP data as JSON. Includes
                          transactions, masters, settings.
                        </div>
                      </div>
                      <button
                        onClick={handleExport}
                        className="mt-3 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow cursor-pointer transition-colors flex items-center justify-center space-x-1.5"
                      >
                        <Download className="w-4 h-4" />
                        <span>Export .json</span>
                      </button>
                    </div>
                    <div className="p-4 dark:bg-slate-950 bg-slate-50 rounded-xl border dark:border-slate-800 border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="text-sm font-bold dark:text-white text-slate-900 flex items-center space-x-2">
                          <Upload className="w-4 h-4 text-blue-500" />
                          <span>Import Database</span>
                        </div>
                        <div className="text-[11px] dark:text-slate-400 text-slate-500 mt-1">
                          Restore from a previously exported JSON file. Merges
                          with existing data.
                        </div>
                      </div>
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".json"
                          onChange={handleImport}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-3 w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow cursor-pointer transition-colors flex items-center justify-center space-x-1.5"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Import .json</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Restore warning */}
                  <div className="p-4 dark:bg-amber-950/20 bg-amber-50 rounded-xl border dark:border-amber-500/20 border-amber-200 flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-amber-800 dark:text-amber-400">
                        Restore will overwrite current data
                      </div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-400/60 mt-0.5">
                        Always create a backup before restoring. Imported data
                        will merge with or replace existing records.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 4. DANGER ZONE ────────────────── */}
              <div className="dark:bg-slate-900 bg-white rounded-xl border-2 dark:border-rose-500/30 border-rose-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 dark:bg-rose-950/30 bg-rose-50 border-b dark:border-rose-500/20 border-rose-200 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span className="text-sm font-bold text-rose-700 dark:text-rose-400">
                    Danger Zone
                  </span>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center space-x-2">
                        <Trash2 className="w-4 h-4" />
                        <span>Reset Database</span>
                      </div>
                      <div className="text-[11px] text-rose-600/80 dark:text-rose-400/60 mt-0.5 max-w-md">
                        Permanently delete all transactions, masters, companies,
                        backups and settings. This action{" "}
                        <strong>cannot be undone</strong>. You will lose all
                        data.
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmResetDialog(true)}
                      className="px-5 py-2.5 dark:bg-slate-800 bg-white text-rose-700 dark:text-rose-400 border dark:border-rose-500/30 border-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-xl font-bold text-xs shadow cursor-pointer transition-all flex items-center space-x-1.5 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Reset Database</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t dark:border-slate-800 border-slate-200 mt-6">
                    <div>
                      <div className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center space-x-2">
                        <Sparkles className="w-4 h-4" />
                        <span>Factory Reset (First-Run Setup)</span>
                      </div>
                      <div className="text-[11px] text-rose-600/80 dark:text-rose-400/60 mt-0.5 max-w-md">
                        Deletes everything{" "}
                        <strong>
                          including your password and setup status
                        </strong>
                        . The app will restart and ask you to create a new
                        password, just like a fresh install.
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmFactoryReset(true)}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-500/20 cursor-pointer transition-all flex items-center space-x-1.5 shrink-0"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Factory Reset</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Reset Confirmation Dialog */}
          {confirmResetDialog && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="dark:bg-slate-900 bg-white border-2 dark:border-rose-500/40 border-rose-300 rounded-2xl max-w-sm w-full shadow-2xl p-6 space-y-4 animate-scale-in">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-rose-700 dark:text-rose-400">
                      Reset Entire Database?
                    </h3>
                    <p className="text-[11px] dark:text-slate-400 text-slate-500 mt-0.5">
                      All transactions, parties, inventory, backups and settings
                      will be permanently erased.
                    </p>
                  </div>
                </div>
                <div className="p-3 dark:bg-rose-950/30 bg-rose-50 rounded-xl border dark:border-rose-500/20 border-rose-200 text-[11px] text-rose-700 dark:text-rose-400 font-semibold">
                  ⚠️ This cannot be undone. Consider creating a backup first.
                </div>
                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    onClick={() => setConfirmResetDialog(false)}
                    className="px-4 py-2.5 dark:bg-slate-800 bg-slate-200 dark:text-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDangerReset}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-500/20 cursor-pointer transition-colors flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Yes, Delete Everything</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Factory Reset Confirmation Dialog */}
          {confirmFactoryReset && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="dark:bg-slate-900 bg-white border-2 dark:border-rose-500/40 border-rose-300 rounded-2xl max-w-sm w-full shadow-2xl p-6 space-y-4 animate-scale-in">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-rose-500/10 text-rose-500 rounded-xl">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-rose-700 dark:text-rose-400">
                      Perform Factory Reset?
                    </h3>
                    <p className="text-[11px] dark:text-slate-400 text-slate-500 mt-0.5">
                      This will delete all data AND your login password. The app
                      will restart in its first-run setup mode.
                    </p>
                  </div>
                </div>
                <div className="p-3 dark:bg-rose-950/30 bg-rose-50 rounded-xl border dark:border-rose-500/20 border-rose-200 text-[11px] text-rose-700 dark:text-rose-400 font-semibold">
                  ⚠️ Extremely destructive action. Use only for clean handover.
                </div>
                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    onClick={() => setConfirmFactoryReset(false)}
                    className="px-4 py-2.5 dark:bg-slate-800 bg-slate-200 dark:text-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFactoryReset}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-500/20 cursor-pointer transition-colors flex items-center space-x-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Yes, Reset to First-Run</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Restore Confirmation Dialog */}
          {restoreConfirm && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl max-w-sm w-full shadow-2xl p-6 space-y-4 animate-scale-in">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
                    <RotateCcw className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold dark:text-white text-slate-900">
                      Restore Backup?
                    </h3>
                    <p className="text-[11px] dark:text-slate-400 text-slate-500 mt-0.5">
                      Current data will be backed up first, then this backup
                      will be applied.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    onClick={() => setRestoreConfirm(null)}
                    className="px-4 py-2 dark:bg-slate-800 bg-slate-200 dark:text-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const bk = backupHistory.find(
                        (b) => b.id === restoreConfirm,
                      );
                      if (bk) handleRestoreBackup(bk);
                    }}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow cursor-pointer transition-colors flex items-center space-x-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Restore</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ APPEARANCE ═══ */}
          {activeSection === "APPEARANCE" && (
            <div className="space-y-5 animate-slide-up">
              {/* 1. Theme */}
              <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2">
                  <Palette className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-bold dark:text-white text-slate-900">
                    Theme
                  </span>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        id: "light",
                        icon: <Sun className="w-5 h-5 text-amber-500" />,
                        label: "Light",
                        desc: "Clean bright workspace",
                        bg: "bg-white border-slate-300",
                        active: themePreference === "light",
                      },
                      {
                        id: "dark",
                        icon: <Moon className="w-5 h-5 text-indigo-400" />,
                        label: "Dark",
                        desc: "Trading terminal feel",
                        bg: "bg-slate-900 border-slate-700",
                        active: themePreference === "dark",
                      },
                      {
                        id: "system",
                        icon: (
                          <Settings className="w-5 h-5 dark:text-slate-400 text-slate-500" />
                        ),
                        label: "System",
                        desc: "Follow OS preference",
                        bg: "bg-gradient-to-r from-white to-slate-900 border-slate-400",
                        active: themePreference === "system",
                      },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() =>
                          setThemePreference(
                            t.id as "light" | "dark" | "system",
                          )
                        }
                        aria-label={`Set ${t.label} theme`}
                        className={`flex flex-col items-center p-5 rounded-xl border-2 transition-all cursor-pointer ${t.active ? "border-cyan-500 dark:bg-cyan-500/10 bg-cyan-50 shadow-lg shadow-cyan-500/10" : "dark:border-slate-800 border-slate-200 dark:hover:border-slate-700 hover:border-slate-300"}`}
                      >
                        <div
                          className={`w-14 h-9 rounded-lg border mb-3 flex items-center justify-center shadow-sm ${t.bg}`}
                        >
                          {t.icon}
                        </div>
                        <span className="text-xs font-bold dark:text-white text-slate-900">
                          {t.label}
                        </span>
                        <span className="text-[10px] dark:text-slate-400 text-slate-500 mt-0.5 text-center">
                          {t.desc}
                        </span>
                        {t.active && (
                          <Check className="w-4 h-4 text-cyan-500 mt-2" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Accent Color */}
              <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2">
                  <Palette className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-bold dark:text-white text-slate-900">
                    Accent Color
                  </span>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center space-x-4">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      aria-label="Select accent color"
                      className="w-10 h-10 rounded-xl border-2 dark:border-slate-700 border-slate-300 cursor-pointer p-0.5"
                    />
                    <div className="flex-1">
                      <div className="text-xs font-bold dark:text-white text-slate-900 mb-1.5">
                        Preset Colors
                      </div>
                      <div className="flex items-center space-x-2">
                        {[
                          "#6366f1",
                          "#8b5cf6",
                          "#ec4899",
                          "#ef4444",
                          "#f59e0b",
                          "#22c55e",
                          "#06b6d4",
                          "#3b82f6",
                        ].map((c) => (
                          <button
                            key={c}
                            onClick={() => setAccentColor(c)}
                            aria-label={`Set accent ${c}`}
                            className={`w-7 h-7 rounded-lg cursor-pointer transition-all shadow-sm ${accentColor === c ? "ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-offset-white scale-110" : "hover:scale-110"}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Live preview */}
                  <div className="dark:bg-slate-950 bg-slate-50 rounded-xl border dark:border-slate-800 border-slate-200 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-500 text-slate-400 mb-3">
                      Live Preview
                    </div>
                    <div className="flex items-center space-x-4">
                      <button
                        className="px-4 py-2 rounded-lg text-white text-xs font-bold shadow-sm"
                        style={{ backgroundColor: accentColor }}
                      >
                        Primary Button
                      </button>
                      <span
                        className="px-2.5 py-1 rounded-md text-white text-[10px] font-bold"
                        style={{ backgroundColor: accentColor }}
                      >
                        Badge
                      </span>
                      <div className="flex-1 h-2 rounded-full dark:bg-slate-800 bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full w-3/5 transition-all"
                          style={{ backgroundColor: accentColor }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Typography */}
              <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-bold dark:text-white text-slate-900">
                    Typography
                  </span>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-500 text-slate-400 mb-2">
                      Font Family
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        {
                          id: "inter",
                          label: "Inter",
                          css: "'Inter', sans-serif",
                        },
                        {
                          id: "roboto",
                          label: "Roboto",
                          css: "'Roboto', sans-serif",
                        },
                        {
                          id: "segoe",
                          label: "Segoe UI",
                          css: "'Segoe UI', sans-serif",
                        },
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() =>
                            setFontFamily(f.id as "inter" | "roboto" | "segoe")
                          }
                          className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all cursor-pointer ${fontFamily === f.id ? "border-cyan-500 dark:bg-cyan-500/10 bg-cyan-50 shadow-md" : "dark:border-slate-800 border-slate-200 dark:hover:border-slate-700 hover:border-slate-300"}`}
                        >
                          <span
                            className="font-bold dark:text-white text-slate-900"
                            style={{ fontFamily: f.css }}
                          >
                            {f.label}
                          </span>
                          {fontFamily === f.id && (
                            <Check className="w-3.5 h-3.5 text-cyan-500 mt-1.5" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "small", label: "Small", size: "13px" },
                      { id: "medium", label: "Medium", size: "14px" },
                      { id: "large", label: "Large", size: "16px" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() =>
                          setFontSize(s.id as "small" | "medium" | "large")
                        }
                        className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all cursor-pointer ${fontSize === s.id ? "border-cyan-500 dark:bg-cyan-500/10 bg-cyan-50 shadow-md" : "dark:border-slate-800 border-slate-200 dark:hover:border-slate-700 hover:border-slate-300"}`}
                      >
                        <span
                          className="font-bold dark:text-white text-slate-900"
                          style={{ fontSize: s.size }}
                        >
                          {s.label}
                        </span>
                        <span className="text-[10px] dark:text-slate-400 text-slate-500 mt-1">
                          {s.size}
                        </span>
                        {fontSize === s.id && (
                          <Check className="w-3.5 h-3.5 text-cyan-500 mt-1.5" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="dark:bg-slate-950 bg-slate-50 rounded-xl border dark:border-slate-800 border-slate-200 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-500 text-slate-400 mb-2">
                      Preview
                    </div>
                    <p
                      className="dark:text-white text-slate-900 font-medium leading-relaxed"
                      style={{
                        fontSize:
                          fontSize === "small"
                            ? "12px"
                            : fontSize === "large"
                              ? "16px"
                              : "14px",
                      }}
                    >
                      This is a preview of your selected text size. All content
                      in the app will scale accordingly for better readability.
                    </p>
                  </div>
                </div>
              </div>

              {/* 5. Display Options */}
              <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-bold dark:text-white text-slate-900">
                    Display Options
                  </span>
                </div>
                <div className="p-6">
                  <div className="pb-3 border-b dark:border-slate-800 border-slate-200">
                    <div className="text-sm font-bold dark:text-white text-slate-900">
                      Density
                    </div>
                    <div className="text-[11px] dark:text-slate-400 text-slate-500">
                      Controls table row heights, sidebar spacing, card
                      paddings, inputs, and modal spacing.
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      {[
                        {
                          id: "compact",
                          label: "Compact",
                          desc: "Maximum data density",
                        },
                        {
                          id: "comfortable",
                          label: "Comfortable",
                          desc: "Balanced default spacing",
                        },
                        {
                          id: "spacious",
                          label: "Spacious",
                          desc: "Lower visual fatigue",
                        },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() =>
                            setDensity(
                              mode.id as "compact" | "comfortable" | "spacious",
                            )
                          }
                          className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all cursor-pointer ${density === mode.id ? "border-cyan-500 dark:bg-cyan-500/10 bg-cyan-50 shadow-md" : "dark:border-slate-800 border-slate-200 dark:hover:border-slate-700 hover:border-slate-300"}`}
                        >
                          <span className="text-xs font-bold dark:text-white text-slate-900">
                            {mode.label}
                          </span>
                          <span className="text-[10px] dark:text-slate-400 text-slate-500 mt-1 text-center">
                            {mode.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <Toggle
                    label="Low Stock Alerts"
                    desc="Show warning badges on inventory items below threshold"
                    checked={lowStockAlerts}
                    onChange={setLowStockAlerts}
                  />
                </div>
              </div>

              {/* 6. Animations & Effects */}
              <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-bold dark:text-white text-slate-900">
                    Animations & Effects
                  </span>
                </div>
                <div className="p-6">
                  <Toggle
                    label="Enable Animations"
                    desc="Smooth transitions, slide-in effects, and micro-interactions throughout the app"
                    checked={animationsEnabled}
                    onChange={setAnimationsEnabled}
                  />
                </div>
              </div>

              {/* 7. Reset Appearance */}
              <div className="dark:bg-slate-900 bg-white rounded-xl border-2 dark:border-amber-500/30 border-amber-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 dark:bg-amber-950/20 bg-amber-50 border-b dark:border-amber-500/20 border-amber-200 flex items-center space-x-2">
                  <RotateCcw className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-amber-700 dark:text-amber-400">
                    Reset Appearance
                  </span>
                </div>
                <div className="p-6 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold dark:text-white text-slate-900">
                      Restore Default Settings
                    </div>
                    <div className="text-[11px] dark:text-slate-400 text-slate-500 mt-0.5 max-w-md">
                      Reset theme to system, accent to indigo, typography and
                      density to defaults, and restore all display options.
                    </div>
                  </div>
                  <button
                    onClick={handleResetAppearance}
                    className="px-5 py-2.5 dark:bg-slate-800 bg-white text-amber-700 dark:text-amber-400 border dark:border-amber-500/30 border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40 rounded-xl font-bold text-xs cursor-pointer transition-all flex items-center space-x-1.5 shrink-0"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset to Defaults</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══ SECURITY ═══ */}
          {activeSection === "SECURITY" && (
            <div className="space-y-5 animate-slide-up">
              {/* 1. Access Control */}
              <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-bold dark:text-white text-slate-900">
                    Access Control
                  </span>
                </div>
                <div className="p-6 space-y-1">
                  {/* PIN Lock */}
                  <Toggle
                    label="Require Password / App PIN"
                    desc="Enable PIN protection when opening the app"
                    checked={sec.pinEnabled}
                    onChange={(v) => {
                      setSec((p) => ({ ...p, pinEnabled: v }));
                    }}
                  />

                  {sec.pinEnabled && (
                    <div className="space-y-4 pl-3 ml-1 border-l-2 dark:border-cyan-500/30 border-cyan-300 pt-3 animate-slide-down">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1.5">
                          Set App PIN (4–6 digits)
                        </label>
                        <div className="relative max-w-xs">
                          <Lock className="w-4 h-4 dark:text-slate-500 text-slate-400 absolute left-3 top-3" />
                          <input
                            type={showPin ? "text" : "password"}
                            value={sec.appPin}
                            onChange={(e) =>
                              setSec((p) => ({
                                ...p,
                                appPin: e.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 6),
                              }))
                            }
                            maxLength={6}
                            placeholder="••••"
                            className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl pl-10 pr-10 py-2.5 text-lg font-mono font-black tracking-[0.3em] outline-none focus:border-cyan-500 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPin(!showPin)}
                            className="absolute right-3 top-3 dark:text-slate-500 text-slate-400 cursor-pointer hover:text-cyan-500 transition-colors"
                          >
                            {showPin ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <span className="text-[10px] dark:text-slate-500 text-slate-400 mt-1 block">
                          Numeric digits only. PIN is stored locally as a hash.
                        </span>
                      </div>

                      {/* Auto-Lock Timeout */}
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1.5">
                          Auto-Lock Timeout
                        </label>
                        <select
                          value={sec.autoLockMinutes}
                          onChange={(e) => {
                            setSec((p) => ({
                              ...p,
                              autoLockMinutes: parseInt(e.target.value) || 0,
                            }));
                          }}
                          className="w-full max-w-xs dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-2.5 text-xs font-bold outline-none cursor-pointer focus:border-cyan-500 transition-all"
                        >
                          <option value="0">Disabled</option>
                          <option value="5">5 Minutes</option>
                          <option value="15">15 Minutes</option>
                          <option value="30">30 Minutes</option>
                          <option value="60">1 Hour</option>
                          <option value="120">2 Hours</option>
                        </select>
                        <span className="text-[10px] dark:text-slate-500 text-slate-400 mt-1 block">
                          Lock the app after inactivity. Only works when PIN is
                          enabled.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Session Timeout (always available) */}
                  <div className="pt-4 border-t dark:border-slate-800 border-slate-200 mt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold dark:text-white text-slate-900">
                          Session Timeout
                        </div>
                        <div className="text-[11px] dark:text-slate-400 text-slate-500">
                          Automatically end session after idle period
                        </div>
                      </div>
                      <select
                        value={sessionTimeout}
                        onChange={(e) => setSessionTimeout(e.target.value)}
                        className="dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-2.5 text-xs font-bold outline-none cursor-pointer focus:border-cyan-500 transition-all w-36"
                      >
                        <option value="15">15 Minutes</option>
                        <option value="30">30 Minutes</option>
                        <option value="60">1 Hour</option>
                        <option value="120">2 Hours</option>
                        <option value="480">8 Hours</option>
                      </select>
                    </div>
                  </div>

                  {/* 2FA */}
                  <div className="pt-3">
                    <Toggle
                      label="Two-Factor Authentication"
                      desc="Add extra verification step for enhanced login security"
                      checked={twoFactorEnabled}
                      onChange={(v) => {
                        setTwoFactorEnabled(v);
                        if (v)
                          toast.info(
                            "Coming Soon",
                            "2FA integration will be available in the next update.",
                          );
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Data Security */}
              <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-bold dark:text-white text-slate-900">
                    Data Security
                  </span>
                </div>
                <div className="p-6 space-y-1">
                  <Toggle
                    label="Allow Data Export"
                    desc="Permit downloading database backups and JSON exports"
                    checked={allowExport}
                    onChange={setAllowExport}
                  />
                  <Toggle
                    label="Enable Audit Log"
                    desc="Track important changes, logins, and activity across the app"
                    checked={auditLog}
                    onChange={(v) => {
                      setAuditLog(v);
                      if (v)
                        toast.success(
                          "Audit Log Enabled",
                          "Activity tracking is now active.",
                        );
                    }}
                  />
                  <Toggle
                    label="Database Encryption"
                    desc="Encrypt stored application data for additional protection"
                    checked={dbEncryption}
                    onChange={(v) => {
                      setDbEncryption(v);
                      if (v)
                        toast.success(
                          "Encryption Enabled",
                          "Data will be encrypted at rest.",
                        );
                    }}
                  />
                </div>
              </div>

              {/* Info Banner */}
              <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm p-5 flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs dark:text-slate-400 text-slate-600 leading-relaxed">
                  All data is stored <strong>locally in your browser</strong>.
                  No data is transmitted to external servers. PIN protection
                  adds a local access barrier. For maximum security, enable
                  encryption, use backups regularly, and store exports in a
                  secure location.
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end">
                <button
                  onClick={saveSecurity}
                  className="flex items-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-cyan-500/15 cursor-pointer transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Security Settings</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          COMPANY FORM MODAL (Create & Edit)
         ══════════════════════════════════════════════ */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-12 animate-fade-in">
          <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-slide-up">
            {/* Modal Header */}
            <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2 rounded-lg ${isEditMode ? "bg-cyan-500/10 text-cyan-500" : "bg-indigo-500/10 text-indigo-500"}`}
                >
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold dark:text-white text-slate-900">
                    {cfModalTitle}
                  </h3>
                  <p className="text-[10px] dark:text-slate-400 text-slate-500">
                    Step {cfStep} of 3 —{" "}
                    {cfStep === 1
                      ? "Company Details"
                      : cfStep === 2
                        ? "Financial & Bank"
                        : "Review & Save"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5">
                  {[1, 2, 3].map((s) => (
                    <div
                      key={s}
                      className={`w-2 h-2 rounded-full transition-colors ${cfStep >= s ? (isEditMode ? "bg-cyan-500" : "bg-indigo-500") : "dark:bg-slate-700 bg-slate-300"}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => {
                    setShowCompanyModal(false);
                    resetCompanyForm();
                  }}
                  className="p-1.5 dark:text-slate-400 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* STEP 1: Company Details */}
            {cfStep === 1 && (
              <div className="p-6 space-y-4 animate-fade-in">
                {/* Logo Upload */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1.5">
                    Company Logo
                  </label>
                  <div className="flex items-center space-x-4">
                    {cfLogo ? (
                      <div className="relative">
                        <img
                          src={cfLogo}
                          alt="Logo"
                          className="h-14 max-w-[140px] object-contain border dark:border-slate-700 border-slate-200 rounded-xl p-1.5 dark:bg-slate-950 bg-slate-50"
                        />
                        <button
                          onClick={() => setCfLogo("")}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center cursor-pointer text-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => companyLogoInputRef.current?.click()}
                        className="h-14 w-36 border-2 border-dashed dark:border-slate-700 border-slate-300 rounded-xl flex items-center justify-center cursor-pointer dark:hover:border-indigo-500/50 hover:border-indigo-500/50 transition-colors"
                      >
                        <div className="flex items-center space-x-2 text-xs dark:text-slate-500 text-slate-400">
                          <Image className="w-4 h-4" />
                          <span>Upload Logo</span>
                        </div>
                      </div>
                    )}
                    <input
                      ref={companyLogoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () =>
                            setCfLogo(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                        e.target.value = "";
                      }}
                    />
                    <div className="text-[10px] dark:text-slate-500 text-slate-400 leading-relaxed max-w-[200px]">
                      PNG, JPG, or SVG. Will appear on all invoices and
                      receipts.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1">
                      Company Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 absolute left-3 top-2.5 dark:text-slate-500 text-slate-400" />
                      <input
                        type="text"
                        value={cfName}
                        onChange={(e) => setCfName(e.target.value)}
                        placeholder="e.g. Talha Fruit Co."
                        className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                  <Inp
                    label="Tagline / Type"
                    value={cfTagline}
                    onChange={setCfTagline}
                    placeholder="Wholesale Merchants"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Inp
                    label="GSTIN"
                    value={cfGstin}
                    onChange={(v) => setCfGstin(v.toUpperCase())}
                    placeholder="24AABCT1234A1ZH"
                    mono
                  />
                  <Inp
                    label="PAN"
                    value={cfPan}
                    onChange={(v) => setCfPan(v.toUpperCase())}
                    placeholder="ABCDE1234F"
                    mono
                  />
                </div>
                <Inp
                  label="Full Address"
                  value={cfAddress}
                  onChange={setCfAddress}
                  placeholder="Shop 102, Gate 4, APMC Yard..."
                />
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Inp
                    label="City"
                    value={cfCity}
                    onChange={setCfCity}
                    placeholder="Surat"
                  />
                  <Inp
                    label="State"
                    value={cfState}
                    onChange={setCfState}
                    placeholder="Gujarat"
                  />
                  <Inp
                    label="Pincode"
                    value={cfPincode}
                    onChange={(v) =>
                      setCfPincode(v.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="395001"
                    mono
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1">
                      Phone <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-2.5 dark:text-slate-500 text-slate-400" />
                      <input
                        type="text"
                        value={cfPhone}
                        onChange={(e) => setCfPhone(e.target.value)}
                        placeholder="+91 99887 77665"
                        className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono font-bold outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 dark:text-slate-500 text-slate-400" />
                      <input
                        type="email"
                        value={cfEmail}
                        onChange={(e) => setCfEmail(e.target.value)}
                        placeholder="accounts@company.in"
                        className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none focus:border-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Financial & Bank */}
            {cfStep === 2 && (
              <div className="p-6 space-y-4 animate-fade-in">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-2">
                    Currency
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {[
                      { c: "INR", s: "₹" },
                      { c: "USD", s: "$" },
                      { c: "AED", s: "د.إ" },
                      { c: "GBP", s: "£" },
                      { c: "EUR", s: "€" },
                    ].map(({ c, s }) => (
                      <button
                        key={c}
                        onClick={() => setCfCurrency(c)}
                        className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-bold border-2 cursor-pointer transition-all ${cfCurrency === c ? "border-indigo-500 dark:bg-indigo-500/10 bg-indigo-50 text-indigo-700 dark:text-indigo-400 shadow-md" : "dark:border-slate-800 border-slate-200 dark:text-slate-400 text-slate-500"}`}
                      >
                        <span className="text-base">{s}</span>
                        <span>{c}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Inp
                    label="Invoice Prefix"
                    value={cfInvPrefix}
                    onChange={(v) => setCfInvPrefix(v.toUpperCase())}
                    placeholder="INV"
                    mono
                  />
                  <Inp
                    label="Starting Number"
                    type="number"
                    value={cfInvStart}
                    onChange={(v) => setCfInvStart(parseInt(v) || 0)}
                    placeholder="1001"
                    mono
                  />
                </div>
                <div className="dark:bg-slate-950 bg-slate-50 rounded-xl border dark:border-slate-800 border-slate-200 p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 dark:text-slate-500 text-slate-400" />
                    <span className="text-xs dark:text-slate-400 text-slate-500 font-semibold">
                      Invoice Preview:
                    </span>
                  </div>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm tracking-wider">
                    {cfInvPrefix}-2026-{String(cfInvStart).padStart(4, "0")}
                  </span>
                </div>
                <div className="pt-4 border-t dark:border-slate-800 border-slate-200">
                  <div className="text-xs font-bold dark:text-slate-300 text-slate-800 mb-3 uppercase tracking-wider">
                    Bank & UPI Details
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Inp
                      label="Bank Name"
                      value={cfBankName}
                      onChange={setCfBankName}
                      placeholder="State Bank of India"
                    />
                    <Inp
                      label="Account Number"
                      value={cfAccountNo}
                      onChange={setCfAccountNo}
                      placeholder="38920019283"
                      mono
                    />
                    <Inp
                      label="IFSC Code"
                      value={cfIfsc}
                      onChange={setCfIfsc}
                      placeholder="SBIN0001234"
                      mono
                    />
                    <Inp
                      label="UPI ID"
                      value={cfUpiId}
                      onChange={setCfUpiId}
                      placeholder="tfc@sbi"
                      mono
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Review */}
            {cfStep === 3 && (
              <div className="p-6 space-y-4 animate-fade-in">
                {cfStep1Valid && cfStep2Valid ? (
                  <div className="flex items-center space-x-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl">
                    <Check className="w-6 h-6 text-emerald-500 shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-emerald-800 dark:text-emerald-400">
                        Ready to {isEditMode ? "Update" : "Create"}!
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400/70">
                        All details verified.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl">
                    <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-amber-800 dark:text-amber-400">
                        Missing Required Fields
                      </div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-400/70">
                        Company name (min 2 chars) and phone (min 6 digits) are
                        required.
                      </div>
                    </div>
                  </div>
                )}
                <div className="dark:bg-slate-950 bg-slate-50 rounded-xl border dark:border-slate-800 border-slate-200 overflow-hidden">
                  <div className="px-5 py-3 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold dark:text-white text-slate-900">
                      Company Summary
                    </span>
                  </div>
                  <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    {[
                      { l: "Company", v: cfName || "—" },
                      { l: "Type", v: cfTagline || "—" },
                      { l: "GSTIN", v: cfGstin || "N/A", m: true },
                      { l: "PAN", v: cfPan || "N/A", m: true },
                      {
                        l: "Location",
                        v: [cfCity, cfState].filter(Boolean).join(", ") || "—",
                      },
                      { l: "Phone", v: cfPhone || "—", m: true },
                      { l: "Email", v: cfEmail || "—" },
                      { l: "Currency", v: cfCurrency },
                      {
                        l: "Invoice",
                        v: `${cfInvPrefix}-${cfInvStart}`,
                        m: true,
                      },
                    ].map((r, i) => (
                      <div key={i}>
                        <div className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-500 text-slate-400">
                          {r.l}
                        </div>
                        <div
                          className={`dark:text-white text-slate-900 font-semibold mt-0.5 ${r.m ? "font-mono" : ""}`}
                        >
                          {r.v}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Footer Nav */}
            <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-t dark:border-slate-800 border-slate-200 flex items-center justify-between">
              <div>
                {cfStep > 1 && (
                  <button
                    onClick={() => setCfStep(cfStep - 1)}
                    className="flex items-center space-x-1.5 px-4 py-2 dark:bg-slate-800 bg-slate-200 dark:text-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    <span>← Back</span>
                  </button>
                )}
              </div>
              <div>
                {cfStep < 3 ? (
                  <button
                    onClick={() => {
                      if (cfStep === 1 && cfStep1Valid) setCfStep(2);
                      else if (cfStep === 1)
                        toast.error(
                          "Required Fields",
                          "Company name (min 2 chars) and phone (min 6 digits) are required.",
                        );
                      else if (cfStep === 2 && cfStep2Valid) setCfStep(3);
                      else
                        toast.error(
                          "Required Fields",
                          "Invoice prefix and starting number are required.",
                        );
                    }}
                    className="flex items-center space-x-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow cursor-pointer transition-colors"
                  >
                    <span>Continue →</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSaveCompany}
                    disabled={!cfStep1Valid || !cfStep2Valid || cfSaving}
                    className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-black shadow-xl cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      isEditMode
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-500/20"
                        : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-500/20"
                    }`}
                  >
                    {cfSaving ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>
                          {isEditMode ? "Update Company" : "Create Company"}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
