import React, { useState, useMemo, useRef, useEffect } from "react";
import { STORAGE_KEYS } from "@/config";
import { useApp } from "../context/AppContext";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  Hash,
  CalendarRange,
  DollarSign,
  Receipt,
  Zap,
  Check,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Image,
  X,
  Eye,

} from "lucide-react";

interface SetupWizardProps {
  onComplete: () => void;
}

type StepStatus =
  | "completed"
  | "incomplete"
  | "not_started"
  | "validation_errors";

interface SetupWizardDraft {
  step: number;
  
  logoPreview: string | null;
  companyName: string;
  legalName: string;
  gstin: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  fyStart: string;
  fyEnd: string;
  currency: string;
  invPrefix: string;
  invStartNo: number;
  taxType: "GST" | "NO_TAX" | "CUSTOM";
  roundOff: boolean;
  touched: Record<string, boolean>;
  visitedSteps: number[];
}

const ONBOARDING_DRAFT_KEY = STORAGE_KEYS.onboardingDraft;

const clampStep = (value: number) => Math.min(3, Math.max(1, value));

const loadOnboardingDraft = (): Partial<SetupWizardDraft> | null => {
  try {
    const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SetupWizardDraft>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

// ── Validation helpers ──────────────────────────
const gstinRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/;
const panRegex = /^[A-Z]{5}\d{4}[A-Z]$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?\d[\d\s\-]{8,14}$/;


const T: Record<string, string> = {
  step1Title: "Company Details & Legal ID",
  step2Title: "Financial & Accounting Config",
  step3Title: "Review & Confirm Setup",
  companyName: "Company / Firm Name",
  legalName: "Legal Business Name",
  gstin: "GSTIN Number",
  pan: "PAN Number",
  address: "Full Address",
  city: "City",
  state: "State",
  pincode: "Pincode",
  phone: "Phone",
  email: "Email",
  next: "Continue",
  back: "Back",
  finish: "Launch Dashboard",
  required: "Required",
  fyStart: "Financial Year Start",
  fyEnd: "Financial Year End",
  currency: "Currency",
  invoicePrefix: "Invoice Prefix",
  startingNo: "Starting Number",
  autoApril: "Auto Set April 1",
  roundOff: "Automatic Round-Off",
  taxType: "Tax Type",
};

// ── Reusable Field ─────────────────────────────
interface FieldProps {
  id: string;
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  markTouched: (id: string) => void;
  touched: Record<string, boolean>;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  mono?: boolean;
  required?: boolean;
  error?: string;
  maxLength?: number;
  className?: string;
}

const Field: React.FC<FieldProps> = ({
  id,
  label,
  value,
  onChange,
  markTouched,
  touched,
  placeholder = "",
  type = "text",
  icon,
  mono = false,
  required = false,
  error,
  maxLength,
  className = "",
}) => {
  const hasError = touched[id] && error;
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="flex items-center space-x-1 text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1.5"
      >
        <span>{label}</span>
        {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400">
            {icon}
          </div>
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            markTouched(id);
          }}
          onBlur={() => markTouched(id)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`w-full dark:bg-slate-950 bg-slate-50 border rounded-xl py-2.5 text-sm outline-none transition-all ${
            icon ? "pl-10 pr-4" : "px-4"
          } ${mono ? "font-mono font-bold uppercase tracking-wider" : "font-medium"} ${
            hasError
              ? "border-rose-500 dark:border-rose-500 focus:ring-2 focus:ring-rose-500/30"
              : "dark:border-slate-700/80 border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          } dark:text-white text-slate-900 dark:placeholder-slate-600 placeholder-slate-400`}
        />
        {hasError && (
          <div className="flex items-center space-x-1 mt-1 text-rose-500 text-[11px] font-medium animate-slide-down">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {touched[id] && !error && value && (
          <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
        )}
      </div>
    </div>
  );
};

const currencySymbols: Record<string, string> = {
  INR: "₹",
  USD: "$",
  AED: "د.إ",
  GBP: "£",
  EUR: "€",
};

const statusMeta: Record<
  StepStatus,
  { label: string; dot: string; text: string }
> = {
  completed: {
    label: "Completed",
    dot: "bg-emerald-500",
    text: "text-emerald-500",
  },
  incomplete: {
    label: "Incomplete",
    dot: "bg-amber-500",
    text: "text-amber-500",
  },
  not_started: {
    label: "Not Started",
    dot: "bg-slate-400",
    text: "text-slate-400",
  },
  validation_errors: {
    label: "Validation Errors",
    dot: "bg-rose-500",
    text: "text-rose-500",
  },
};

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  if (import.meta.env.DEV) {
    console.log("[SetupWizard] Mounting...");
  }
  const { settings, updateSettings, theme } = useApp();
  const draft = useMemo(() => loadOnboardingDraft(), []);
  const [step, setStep] = useState(() => clampStep(draft?.step ?? 1));
     const t = (key: string) => T[key] || key;

  // Logo
  const [logoPreview, setLogoPreview] = useState<string | null>(
    () => draft?.logoPreview || null,
  );
  const logoRef = useRef<HTMLInputElement>(null);

  // Step 1 state
  const [companyName, setCompanyName] = useState(
     draft?.companyName ?? (settings.company?.name || ""),
  );
  const [legalName, setLegalName] = useState(
    draft?.legalName ?? (settings.company.tagline || ""),
  );

   // Auto-sync Legal Name with Firm Name if it hasn't been manually edited
  const handleCompanyNameChange = (val: string) => {
    const oldName = companyName;
    setCompanyName(val);

    // If Legal Name is empty or was exactly matching the old Firm Name, sync it
    if (!legalName || legalName === oldName) {
      setLegalName(val);
    }
  };
  const [gstin, setGstin] = useState(
    draft?.gstin ?? (settings.company.gstin || ""),
  );
  const [pan, setPan] = useState(draft?.pan ?? "");
  const [address, setAddress] = useState(
    draft?.address ?? (settings.company.address || ""),
  );
  const [city, setCity] = useState(draft?.city ?? "");
  const [state, setState] = useState(draft?.state ?? "Gujarat");
  const [pincode, setPincode] = useState(draft?.pincode ?? "");
  const [country] = useState("India");
  const [phone, setPhone] = useState(
    draft?.phone ?? (settings.company.phone || ""),
  );
  const [email, setEmail] = useState(
    draft?.email ?? (settings.company.email || ""),
  );

  // Step 2 state
  const [fyStart, setFyStart] = useState(draft?.fyStart ?? "2026-04-01");
  const [fyEnd, setFyEnd] = useState(draft?.fyEnd ?? "2027-03-31");
  const [currency, setCurrency] = useState(
    draft?.currency ?? (settings.financial.currency || "INR"),
  );
  const [invPrefix, setInvPrefix] = useState(
    draft?.invPrefix ?? (settings.invoice.salesPrefix || "INV"),
  );
  const [invStartNo, setInvStartNo] = useState(
    typeof draft?.invStartNo === "number"
      ? draft.invStartNo
      : settings.invoice.salesNextNo || 1001,
  );
  const [taxType, setTaxType] = useState<"GST" | "NO_TAX" | "CUSTOM">(() => {
    if (
      draft?.taxType === "GST" ||
      draft?.taxType === "NO_TAX" ||
      draft?.taxType === "CUSTOM"
    )
      return draft.taxType;
    return "NO_TAX";
  });
  const [roundOff, setRoundOff] = useState(
    typeof draft?.roundOff === "boolean" ? draft.roundOff : true,
  );
  const [touched, setTouched] = useState<Record<string, boolean>>(
    () => draft?.touched ?? {},
  );
  const [visitedSteps, setVisitedSteps] = useState<number[]>(() => {
    const saved = Array.isArray(draft?.visitedSteps) ? draft?.visitedSteps : [];
    const merged = Array.from(
      new Set([1, ...saved.map((s) => clampStep(Number(s) || 1))]),
    );
    return merged;
  });

  const markTouched = (f: string) => setTouched((p) => ({ ...p, [f]: true }));

  // ── Step 1 Validation ──────────────────────────
  const s1Errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!companyName.trim()) e.companyName = "Company name is required";
    if (!address.trim()) e.address = "Address is required";
    if (!phone.trim()) e.phone = "Phone is required";
    else if (!phoneRegex.test(phone.replace(/\s/g, "")))
      e.phone = "Invalid phone number";
    if (email && !emailRegex.test(email)) e.email = "Invalid email address";
    if (gstin && !gstinRegex.test(gstin.toUpperCase()))
      e.gstin = "Invalid GSTIN format (15 chars)";
    if (pan && !panRegex.test(pan.toUpperCase()))
      e.pan = "Invalid PAN format (10 chars)";
    if (pincode && !/^\d{6}$/.test(pincode))
      e.pincode = "Pincode must be 6 digits";
    return e;
  }, [companyName, address, phone, email, gstin, pan, pincode]);

  const s1Valid =
    Object.keys(s1Errors).length === 0 && companyName.trim().length > 0;

  // ── Step 2 Validation ──────────────────────────
  const s2Errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!fyStart) e.fyStart = "Start date required";
    if (!fyEnd) e.fyEnd = "End date required";
    if (fyStart && fyEnd && fyEnd <= fyStart)
      e.fyEnd = "End must be after start";
    if (!invPrefix.trim()) e.invPrefix = "Prefix is required";
    if (!invStartNo || invStartNo < 1) e.invStartNo = "Must be ≥ 1";
    return e;
  }, [fyStart, fyEnd, invPrefix, invStartNo]);

  const s2Valid = Object.keys(s2Errors).length === 0;

  const allValid = s1Valid && s2Valid;
  const totalErrors =
    Object.keys(s1Errors).length + Object.keys(s2Errors).length;

  const touchStepFields = (targetStep: number) => {
    if (targetStep === 1) {
      setTouched((p) => ({
        ...p,
        companyName: true,
        address: true,
        phone: true,
      }));
      Object.keys(s1Errors).forEach(markTouched);
      return;
    }

    if (targetStep === 2) {
      setTouched((p) => ({
        ...p,
        fyStart: true,
        fyEnd: true,
        invPrefix: true,
        invStartNo: true,
      }));
      Object.keys(s2Errors).forEach(markTouched);
    }
  };

  const goToStep = (targetStep: number) => {
    const nextStep = clampStep(targetStep);
    if (nextStep > step) {
      touchStepFields(step);
    }
    setVisitedSteps((prev) =>
      prev.includes(nextStep) ? prev : [...prev, nextStep],
    );
    setStep(nextStep);
  };

  const stepStatuses = useMemo<Record<number, StepStatus>>(() => {
    const hasAnyTouched = (fields: string[]) =>
      fields.some((f) => !!touched[f]);

    const step1Touched = hasAnyTouched([
      "companyName",
      "legalName",
      "gstin",
      "pan",
      "address",
      "city",
      "state",
      "pincode",
      "phone",
      "email",
    ]);
    const step2Touched = hasAnyTouched([
      "fyStart",
      "fyEnd",
      "invPrefix",
      "invStartNo",
    ]);

    const step1Status: StepStatus = s1Valid
      ? "completed"
      : step1Touched
        ? "validation_errors"
        : visitedSteps.includes(1)
          ? "incomplete"
          : "not_started";

    const step2Status: StepStatus =
      s2Valid && step2Touched
        ? "completed"
        : step2Touched && Object.keys(s2Errors).length > 0
          ? "validation_errors"
          : visitedSteps.includes(2)
            ? "incomplete"
            : "not_started";

    const step3Status: StepStatus = allValid
      ? "completed"
      : visitedSteps.includes(3)
        ? "validation_errors"
        : "not_started";

    return {
      1: step1Status,
      2: step2Status,
      3: step3Status,
    };
  }, [allValid, s1Valid, s2Valid, s2Errors, touched, visitedSteps]);

  const progressPercent = useMemo(() => {
    const completed = [1, 2, 3].filter(
      (n) => stepStatuses[n] === "completed",
    ).length;
    return Math.round((completed / 3) * 100);
  }, [stepStatuses]);

  useEffect(() => {
    const draftPayload: SetupWizardDraft = {
      step,

      logoPreview,
      companyName,
      legalName,
      gstin,
      pan,
      address,
      city,
      state,
      pincode,
      phone,
      email,
      fyStart,
      fyEnd,
      currency,
      invPrefix,
      invStartNo,
      taxType,
      roundOff,
      touched,
      visitedSteps,
    };
    localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draftPayload));
  }, [
    step,
  
    logoPreview,
    companyName,
    legalName,
    gstin,
    pan,
    address,
    city,
    state,
    pincode,
    phone,
    email,
    fyStart,
    fyEnd,
    currency,
    invPrefix,
    invStartNo,
    taxType,
    roundOff,
    touched,
    visitedSteps,
  ]);

  // ── Logo Handling ──────────────────────────────
  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ── Final Submit ───────────────────────────────
  const handleFinish = () => {
    const fyMonth = fyStart.split("-")[1] || "04";
    const fyDay = fyStart.split("-")[2] || "01";

    // updateSettings goes through useSettingsStore → writes to localStorage + SQLite
    updateSettings({
      company: {
        ...settings.company,
        name: companyName.trim(),
        tagline: legalName.trim() || settings.company.tagline,
        gstin: gstin.toUpperCase(),
        address: [address, city, state, pincode, country]
          .filter(Boolean)
          .join(", "),
        phone,
        email,
        logo: logoPreview ?? settings.company.logo,
      },
      financial: {
        ...settings.financial,
        financialYearStart: `${fyMonth}-${fyDay}`,
        currency,
      },
      invoice: {
        ...settings.invoice,
        salesPrefix: invPrefix,
        salesNextNo: invStartNo,
      },
    });

    localStorage.removeItem(ONBOARDING_DRAFT_KEY);
    onComplete();
  };

  const invPreviewText = `${invPrefix}-2026-${String(invStartNo).padStart(4, "0")}`;

  const steps = [
    { num: 1, label: t("step1Title"), icon: <Building2 className="w-4 h-4" /> },
    {
      num: 2,
      label: t("step2Title"),
      icon: <DollarSign className="w-4 h-4" />,
    },
    {
      num: 3,
      label: t("step3Title"),
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
  ];

  const statusMeta: Record<
    StepStatus,
    { label: string; dot: string; text: string }
  > = {
    completed: {
      label: "Completed",
      dot: "bg-emerald-500",
      text: "text-emerald-500",
    },
    incomplete: {
      label: "Incomplete",
      dot: "bg-amber-500",
      text: "text-amber-500",
    },
    not_started: {
      label: "Not Started",
      dot: "bg-slate-400",
      text: "text-slate-400",
    },
    validation_errors: {
      label: "Validation Errors",
      dot: "bg-rose-500",
      text: "text-rose-500",
    },
  };

  return (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 overflow-y-auto ${theme === "dark" ? "bg-slate-950" : "bg-slate-100"}`}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0zMCAwdjYwTTYwIDMwSDAiIHN0cm9rZT0icmdiYSgxMDAsMTAwLDEwMCwwLjMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IGZpbGw9InVybCgjZykiIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiLz48L3N2Zz4=')]"></div>

      <div className="relative w-full max-w-3xl my-8 animate-slide-up">
        {/* ── Header ──────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Business Setup Wizard</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black dark:text-white text-slate-900 tracking-tight">
            Set Up Your Company
          </h1>
          <p className="text-sm dark:text-slate-400 text-slate-500 mt-1.5 max-w-lg mx-auto">
            Complete these steps to configure your trading business. Everything
            can be changed later in Settings.
          </p>

        

        {/* ── Step Indicator ──────────────────────── */}
        <div className="flex items-center justify-center mb-4 space-x-2">
          {steps.map((s, i) => (
            <React.Fragment key={s.num}>
              <button
                onClick={() => goToStep(s.num)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  step === s.num
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20"
                    : step > s.num
                      ? "dark:bg-emerald-500/10 bg-emerald-50 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                      : "dark:bg-slate-900 bg-white dark:text-slate-400 text-slate-500 dark:border-slate-800 border-slate-200"
                }`}
              >
                {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.icon}
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span>{s.label}</span>
                  <span
                    className={`text-[10px] font-semibold flex items-center gap-1 ${statusMeta[stepStatuses[s.num]].text}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${statusMeta[stepStatuses[s.num]].dot}`}
                    />
                    {statusMeta[stepStatuses[s.num]].label}
                  </span>
                </div>
                <span className="sm:hidden">Step {s.num}</span>
              </button>
              {i < steps.length - 1 && (
                <div
                  className={`w-8 h-[2px] rounded-full ${step > s.num ? "bg-emerald-500" : "dark:bg-slate-800 bg-slate-300"}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="mb-8 max-w-xl mx-auto px-1">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-2">
            <span>Onboarding Progress</span>
            <span>{progressPercent}% complete</span>
          </div>
          <div className="h-2 rounded-full dark:bg-slate-800 bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* ── Step Content Card ───────────────────── */}
        <div className="dark:bg-slate-900 bg-white rounded-2xl border dark:border-slate-800 border-slate-200 shadow-xl overflow-hidden">
          {/* ════════════════════════════════════════
              STEP 1: COMPANY DETAILS
             ════════════════════════════════════════ */}
          {step === 1 && (
            <div className="animate-fade-in">
              <div className="px-8 py-5 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold dark:text-white text-slate-900">
                    {t("step1Title")}
                  </h2>
                  <p className="text-[11px] dark:text-slate-400 text-slate-500">
                    Your business identity & legal information
                  </p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {/* Logo Upload */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-2 block">
                    Company Logo (optional)
                  </label>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleLogoDrop}
                    onClick={() => logoRef.current?.click()}
                    className="flex items-center space-x-4 p-4 border-2 border-dashed dark:border-slate-700 border-slate-300 rounded-xl cursor-pointer dark:hover:border-indigo-500/50 hover:border-indigo-500/50 transition-colors"
                  >
                    {logoPreview ? (
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Logo"
                          className="w-16 h-16 rounded-xl object-cover border dark:border-slate-700 border-slate-200"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLogoPreview(null);
                          }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl dark:bg-slate-800 bg-slate-100 flex items-center justify-center">
                        <Image className="w-6 h-6 dark:text-slate-600 text-slate-400" />
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold dark:text-white text-slate-900">
                        Drag & drop or click to upload
                      </div>
                      <div className="text-[10px] dark:text-slate-500 text-slate-400 mt-0.5">
                        PNG, JPG up to 2MB — displayed on invoices
                      </div>
                    </div>
                    <input
                      ref={logoRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    id="companyName"
                    label={t("companyName")}
                    value={companyName}
                      onChange={handleCompanyNameChange}
                    markTouched={markTouched}
                    touched={touched}
                    placeholder="e.g. Talha Fruit Co."
                    icon={<Building2 className="w-4 h-4" />}
                    required
                    error={s1Errors.companyName}
                  />
                  <Field
                    id="legalName"
                    label={t("legalName")}
                    value={legalName}
                    onChange={setLegalName}
                    markTouched={markTouched}
                    touched={touched}
                    placeholder="e.g. Talha Enterprises Pvt Ltd"
                    icon={<FileText className="w-4 h-4" />}
                  />
                </div>

                {/* Tax IDs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    id="gstin"
                    label={t("gstin")}
                    value={gstin}
                    onChange={(v) => setGstin(v.toUpperCase())}
                    markTouched={markTouched}
                    touched={touched}
                    placeholder="24AABCT1234A1ZH"
                    icon={<Hash className="w-4 h-4" />}
                    mono
                    maxLength={15}
                    error={s1Errors.gstin}
                  />
                  <Field
                    id="pan"
                    label={t("pan")}
                    value={pan}
                    onChange={(v) => setPan(v.toUpperCase())}
                    markTouched={markTouched}
                    touched={touched}
                    placeholder="ABCDE1234F"
                    icon={<Hash className="w-4 h-4" />}
                    mono
                    maxLength={10}
                    error={s1Errors.pan}
                  />
                </div>

                {/* Address */}
                <Field
                  id="address"
                  label={t("address")}
                  value={address}
                  onChange={setAddress}
                  markTouched={markTouched}
                  touched={touched}
                  placeholder="Shop No. 102, Gate No. 4, APMC Yard..."
                  icon={<MapPin className="w-4 h-4" />}
                  required
                  error={s1Errors.address}
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Field
                    id="city"
                    label={t("city")}
                    value={city}
                    onChange={setCity}
                    markTouched={markTouched}
                    touched={touched}
                    placeholder="Surat"
                  />
                  <Field
                    id="state"
                    label={t("state")}
                    value={state}
                    onChange={setState}
                    markTouched={markTouched}
                    touched={touched}
                    placeholder="Gujarat"
                  />
                  <Field
                    id="pincode"
                    label={t("pincode")}
                    value={pincode}
                    onChange={(v) => setPincode(v.replace(/\D/g, ""))}
                    markTouched={markTouched}
                    touched={touched}
                    placeholder="395001"
                    mono
                    maxLength={6}
                    error={s1Errors.pincode}
                  />
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1.5 block">
                      Country
                    </label>
                    <div className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 rounded-xl py-2.5 px-4 text-sm font-medium dark:text-slate-400 text-slate-500">
                      {country}
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    id="phone"
                    label={t("phone")}
                    value={phone}
                    onChange={setPhone}
                    markTouched={markTouched}
                    touched={touched}
                    placeholder="+91 99887 77665"
                    icon={<Phone className="w-4 h-4" />}
                    required
                    mono
                    error={s1Errors.phone}
                  />
                  <Field
                    id="email"
                    label={t("email")}
                    value={email}
                    onChange={setEmail}
                    markTouched={markTouched}
                    touched={touched}
                    placeholder="accounts@talhafruit.in"
                    icon={<Mail className="w-4 h-4" />}
                    error={s1Errors.email}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════
              STEP 2: FINANCIAL CONFIG
             ════════════════════════════════════════ */}
          {step === 2 && (
            <div className="animate-fade-in">
              <div className="px-8 py-5 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold dark:text-white text-slate-900">
                    {t("step2Title")}
                  </h2>
                  <p className="text-[11px] dark:text-slate-400 text-slate-500">
                    Financial year, currency, invoice numbering & tax setup
                  </p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {/* FY Dates */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600">
                      Financial Year Period
                    </span>
                    <button
                      onClick={() => {
                        setFyStart("2026-04-01");
                        setFyEnd("2027-03-31");
                      }}
                      className="flex items-center space-x-1 text-[11px] font-bold text-indigo-500 cursor-pointer hover:underline"
                    >
                      <Zap className="w-3 h-3" />
                      <span>{t("autoApril")}</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      id="fyStart"
                      label={t("fyStart")}
                      type="date"
                      value={fyStart}
                      onChange={setFyStart}
                      markTouched={markTouched}
                      touched={touched}
                      required
                      error={s2Errors.fyStart}
                      icon={<CalendarRange className="w-4 h-4" />}
                      mono
                    />
                    <Field
                      id="fyEnd"
                      label={t("fyEnd")}
                      type="date"
                      value={fyEnd}
                      onChange={setFyEnd}
                      markTouched={markTouched}
                      touched={touched}
                      required
                      error={s2Errors.fyEnd}
                      icon={<CalendarRange className="w-4 h-4" />}
                      mono
                    />
                  </div>
                </div>

                {/* Currency */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1.5 block">
                    {t("currency")}
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {Object.entries(currencySymbols).map(([code, sym]) => (
                      <button
                        key={code}
                        onClick={() => setCurrency(code)}
                        className={`flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-bold border-2 cursor-pointer transition-all ${
                          currency === code
                            ? "border-indigo-500 dark:bg-indigo-500/10 bg-indigo-50 text-indigo-700 dark:text-indigo-400 shadow-md"
                            : "dark:border-slate-800 border-slate-200 dark:text-slate-400 text-slate-500 dark:hover:border-slate-700 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-base">{sym}</span>
                        <span>{code}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Invoice Prefix & Start */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field
                    id="invPrefix"
                    label={t("invoicePrefix")}
                    value={invPrefix}
                    onChange={(v) => setInvPrefix(v.toUpperCase())}
                    markTouched={markTouched}
                    touched={touched}
                    placeholder="INV"
                    icon={<Receipt className="w-4 h-4" />}
                    mono
                    required
                    error={s2Errors.invPrefix}
                    maxLength={6}
                  />
                  <Field
                    id="invStartNo"
                    label={t("startingNo")}
                    type="number"
                    value={invStartNo}
                    onChange={(v) => setInvStartNo(parseInt(v) || 0)}
                    markTouched={markTouched}
                    touched={touched}
                    placeholder="1001"
                    icon={<Hash className="w-4 h-4" />}
                    mono
                    required
                    error={s2Errors.invStartNo}
                  />
                </div>

                {/* Live Preview */}
                <div className="dark:bg-slate-950 bg-slate-50 rounded-xl border dark:border-slate-800 border-slate-200 p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Eye className="w-4 h-4 dark:text-slate-500 text-slate-400" />
                    <span className="text-xs dark:text-slate-400 text-slate-500 font-semibold">
                      Invoice Preview:
                    </span>
                  </div>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-sm tracking-wider">
                    {invPreviewText}
                  </span>
                </div>

                {/* Tax & Round-off */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1.5 block">
                      {t("taxType")}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { val: "NO_TAX", lbl: "No Tax" },
                        { val: "GST", lbl: "GST (India)" },
                        { val: "CUSTOM", lbl: "Custom" },
                      ].map((o) => (
                        <button
                          key={o.val}
                          onClick={() => setTaxType(o.val as any)}
                          className={`py-2.5 rounded-xl text-xs font-bold border-2 cursor-pointer transition-all ${
                            taxType === o.val
                              ? "border-indigo-500 dark:bg-indigo-500/10 bg-indigo-50 text-indigo-700 dark:text-indigo-400"
                              : "dark:border-slate-800 border-slate-200 dark:text-slate-400 text-slate-500"
                          }`}
                        >
                          {o.lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between dark:bg-slate-950 bg-slate-50 rounded-xl border dark:border-slate-800 border-slate-200 p-4">
                    <div>
                      <div className="text-xs font-bold dark:text-white text-slate-900">
                        {t("roundOff")}
                      </div>
                      <div className="text-[10px] dark:text-slate-500 text-slate-400">
                        Round totals to nearest ₹1
                      </div>
                    </div>
                    <button
                      onClick={() => setRoundOff(!roundOff)}
                      className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${roundOff ? "bg-emerald-500" : "dark:bg-slate-700 bg-slate-300"}`}
                    >
                      <div
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${roundOff ? "translate-x-[22px]" : "translate-x-0.5"}`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════
              STEP 3: REVIEW & CONFIRM
             ════════════════════════════════════════ */}
          {step === 3 && (
            <div className="animate-fade-in">
              <div className="px-8 py-5 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold dark:text-white text-slate-900">
                    {t("step3Title")}
                  </h2>
                  <p className="text-[11px] dark:text-slate-400 text-slate-500">
                    Verify your configuration before launching
                  </p>
                </div>
              </div>

              <div className="p-8 space-y-6">
                {/* Status Banner */}
                {allValid ? (
                  <div className="flex items-center space-x-3 p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-emerald-800 dark:text-emerald-400">
                        All Checks Passed!
                      </div>
                      <div className="text-[11px] text-emerald-700 dark:text-emerald-400/70">
                        Your business setup is complete. You're ready to launch.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-amber-800 dark:text-amber-400">
                        {totalErrors} Issue{totalErrors > 1 ? "s" : ""} Found
                      </div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-400/70">
                        Please go back and fix the highlighted fields.
                      </div>
                    </div>
                  </div>
                )}

                {/* Company Summary */}
                <div className="dark:bg-slate-950 bg-slate-50 rounded-xl border dark:border-slate-800 border-slate-200 overflow-hidden">
                  <div className="px-5 py-3 border-b dark:border-slate-800 border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-bold dark:text-white text-slate-900">
                        Company Details
                      </span>
                    </div>
                    <button
                      onClick={() => goToStep(1)}
                      className="text-[10px] font-bold text-indigo-500 cursor-pointer hover:underline"
                    >
                      Edit →
                    </button>
                  </div>
                  <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    {[
                      { l: "Company", v: companyName || "—" },
                      { l: "Legal Name", v: legalName || "—" },
                      { l: "GSTIN", v: gstin || "Not provided", mono: true },
                      { l: "PAN", v: pan || "Not provided", mono: true },
                      {
                        l: "Address",
                        v:
                          [address, city, state, pincode]
                            .filter(Boolean)
                            .join(", ") || "—",
                      },
                      { l: "Phone", v: phone || "—", mono: true },
                      { l: "Email", v: email || "—" },
                    ].map((r, i) => (
                      <div key={i}>
                        <div className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-500 text-slate-400">
                          {r.l}
                        </div>
                        <div
                          className={`dark:text-white text-slate-900 font-semibold mt-0.5 ${r.mono ? "font-mono" : ""}`}
                        >
                          {r.v}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="dark:bg-slate-950 bg-slate-50 rounded-xl border dark:border-slate-800 border-slate-200 overflow-hidden">
                  <div className="px-5 py-3 border-b dark:border-slate-800 border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-bold dark:text-white text-slate-900">
                        Financial Configuration
                      </span>
                    </div>
                    <button
                      onClick={() => goToStep(2)}
                      className="text-[10px] font-bold text-indigo-500 cursor-pointer hover:underline"
                    >
                      Edit →
                    </button>
                  </div>
                  <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                    {[
                      { l: "Financial Year", v: `${fyStart} → ${fyEnd}` },
                      {
                        l: "Currency",
                        v: `${currencySymbols[currency] || ""} ${currency}`,
                      },
                      { l: "Invoice Format", v: invPreviewText, mono: true },
                      {
                        l: "Tax Type",
                        v:
                          taxType === "GST"
                            ? "GST (India)"
                            : taxType === "NO_TAX"
                              ? "No Tax"
                              : "Custom",
                      },
                      { l: "Round-Off", v: roundOff ? "Enabled" : "Disabled" },
                    ].map((r, i) => (
                      <div key={i}>
                        <div className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-500 text-slate-400">
                          {r.l}
                        </div>
                        <div
                          className={`dark:text-white text-slate-900 font-semibold mt-0.5 ${r.mono ? "font-mono tracking-wider" : ""}`}
                        >
                          {r.v}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Validation Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`p-3 rounded-xl border text-center ${s1Valid ? "border-emerald-500/30 dark:bg-emerald-500/5 bg-emerald-50" : "border-rose-500/30 dark:bg-rose-500/5 bg-rose-50"}`}
                  >
                    <div
                      className={`text-lg font-black ${s1Valid ? "text-emerald-500" : "text-rose-500"}`}
                    >
                      {s1Valid ? "✓" : Object.keys(s1Errors).length}
                    </div>
                    <div className="text-[10px] font-bold dark:text-slate-400 text-slate-500 mt-0.5">
                      Step 1 — Company
                    </div>
                  </div>
                  <div
                    className={`p-3 rounded-xl border text-center ${s2Valid ? "border-emerald-500/30 dark:bg-emerald-500/5 bg-emerald-50" : "border-rose-500/30 dark:bg-rose-500/5 bg-rose-50"}`}
                  >
                    <div
                      className={`text-lg font-black ${s2Valid ? "text-emerald-500" : "text-rose-500"}`}
                    >
                      {s2Valid ? "✓" : Object.keys(s2Errors).length}
                    </div>
                    <div className="text-[10px] font-bold dark:text-slate-400 text-slate-500 mt-0.5">
                      Step 2 — Financial
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Footer Navigation ─────────────────── */}
          <div className="px-8 py-5 dark:bg-slate-950 bg-slate-50 border-t dark:border-slate-800 border-slate-200 flex items-center justify-between">
            <div>
              {step > 1 && (
                <button
                  onClick={() => goToStep(step - 1)}
                  className="flex items-center space-x-1.5 px-4 py-2.5 dark:bg-slate-800 bg-slate-200 dark:text-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer dark:hover:bg-slate-700 hover:bg-slate-300 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{t("back")}</span>
                </button>
              )}
            </div>
            <div>
              {step < 3 ? (
                <button
                  onClick={() => goToStep(step + 1)}
                  className="flex items-center space-x-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 cursor-pointer transition-colors"
                >
                  <span>{t("next")}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={!allValid}
                  className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-sm font-black shadow-xl shadow-indigo-500/25 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{t("finish")}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
