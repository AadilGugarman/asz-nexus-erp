import React, { useMemo } from "react";
import { FinancialSettings } from "@/types/company";
import { CURRENCIES } from "@/config";
import {
  Calendar,
  RefreshCw,
  AlertCircle,
  Hash,
  Tag,
  FileText,
  Landmark,
  CreditCard,
  Wallet,
} from "lucide-react";
import { SegmentedControl } from "../ui/SegmentedControl";

interface FinancialSettingsStepProps {
  data: FinancialSettings;
  onChange: (fields: Partial<FinancialSettings>) => void;
  errors: { [key: string]: string };
}

export const FinancialSettingsStep: React.FC<FinancialSettingsStepProps> = ({
  data,
  onChange,
  errors,
}) => {
  const handleCurrencyChange = (code: string) => {
    const found = CURRENCIES.find((c) => c.code === code);
    if (found) {
      onChange({ currency: code, currencySymbol: found.symbol });
    } else {
      onChange({ currency: code });
    }
  };

  const handleAutoGenerateFY = () => {
    const currentYear = new Date().getFullYear();
    onChange({
      fyStart: `${currentYear}-04-01`,
      fyEnd: `${currentYear + 1}-03-31`,
    });
  };

  const invoicePreview = useMemo(() => {
    const prefix = data.invoicePrefix || "";
    const num = data.invoiceStartingNumber || "0001";
    return `${prefix}${num}`;
  }, [data.invoicePrefix, data.invoiceStartingNumber]);

  const taxOptions = [
    { label: "GST Registered", value: "gst" },
    { label: "Unregistered", value: "none" },
  ];

  const handleStartingNumberChange = (val: string) => {
    onChange({ invoiceStartingNumber: val.replace(/\D/g, "") });
  };

  // Shared class builders
  const inputBase = "w-full py-2 rounded-lg border text-xs font-medium bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 transition-all";
  const inputNormal = `${inputBase} border-slate-200 dark:border-slate-700 focus:ring-amber-100 dark:focus:ring-amber-500/10 focus:border-amber-500 dark:focus:border-amber-500/60`;
  const inputError  = `${inputBase} border-red-300 dark:border-red-500/50 focus:ring-red-100 dark:focus:ring-red-500/10 focus:border-red-500`;
  const labelClass  = "block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider";
  const iconClass   = "absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500";
  const errorMsg    = "text-[11px] text-red-500 dark:text-red-400 flex items-center gap-1";

  return (
    <div className="space-y-4 animate-fadeIn">
      <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
        Financial & Accounting Configuration
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* FY Start */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className={labelClass}>
              FY Start <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleAutoGenerateFY}
              className="text-[11px] text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Auto April 1</span>
            </button>
          </div>
          <div className="relative">
            <div className={iconClass}><Calendar className="w-3.5 h-3.5" /></div>
            <input
              type="date"
              value={data.fyStart}
              onChange={(e) => onChange({ fyStart: e.target.value })}
              className={`pl-8 pr-3 ${errors.fyStart ? inputError : inputNormal}`}
            />
          </div>
          {errors.fyStart && (
            <p className={errorMsg}><AlertCircle className="w-3 h-3 shrink-0" /><span>{errors.fyStart}</span></p>
          )}
        </div>

        {/* FY End */}
        <div className="space-y-1">
          <label className={labelClass}>FY End <span className="text-red-500">*</span></label>
          <div className="relative">
            <div className={iconClass}><Calendar className="w-3.5 h-3.5" /></div>
            <input
              type="date"
              value={data.fyEnd}
              onChange={(e) => onChange({ fyEnd: e.target.value })}
              className={`pl-8 pr-3 ${errors.fyEnd ? inputError : inputNormal}`}
            />
          </div>
          {errors.fyEnd && (
            <p className={errorMsg}><AlertCircle className="w-3 h-3 shrink-0" /><span>{errors.fyEnd}</span></p>
          )}
        </div>

        {/* Currency */}
        <div className="space-y-1">
          <label className={labelClass}>Base Currency <span className="text-red-500">*</span></label>
          <select
            value={data.currency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className={`px-3 ${inputNormal}`}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} - {c.name} ({c.symbol})
              </option>
            ))}
          </select>
        </div>

        {/* Currency Symbol */}
        <div className="space-y-1">
          <label className={labelClass}>Currency Symbol <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={data.currencySymbol}
            onChange={(e) => onChange({ currencySymbol: e.target.value })}
            className={`px-3 ${inputNormal}`}
          />
        </div>
      </div>

      {/* Invoice Sequencing */}
      <div className="border-t border-slate-200/80 dark:border-slate-700/60 pt-3 space-y-4">
        <h3 className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
          Invoice Sequencing & Tax Rules
        </h3>

        <SegmentedControl
          label="Business Tax Status"
          options={taxOptions}
          value={data.taxType}
          onChange={(val) => onChange({ taxType: val })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Invoice Prefix */}
          <div className="space-y-1">
            <label className={labelClass}>Invoice Prefix <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className={iconClass}><Tag className="w-3.5 h-3.5" /></div>
              <input
                type="text"
                value={data.invoicePrefix}
                onChange={(e) => onChange({ invoicePrefix: e.target.value.toUpperCase() })}
                placeholder="e.g. ASZINV"
                className={`pl-8 pr-3 font-mono font-bold ${errors.invoicePrefix ? inputError : inputNormal}`}
              />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
              Auto-generated from company name
            </p>
            {errors.invoicePrefix && (
              <p className={errorMsg}><AlertCircle className="w-3 h-3 shrink-0" /><span>{errors.invoicePrefix}</span></p>
            )}
          </div>

          {/* Starting Number */}
          <div className="space-y-1">
            <label className={labelClass}>Starting Number <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className={iconClass}><Hash className="w-3.5 h-3.5" /></div>
              <input
                type="text"
                value={data.invoiceStartingNumber}
                onChange={(e) => handleStartingNumberChange(e.target.value)}
                placeholder="0001"
                className={`pl-8 pr-3 font-mono font-bold ${errors.invoiceStartingNumber ? inputError : inputNormal}`}
              />
            </div>
            {errors.invoiceStartingNumber && (
              <p className={errorMsg}><AlertCircle className="w-3 h-3 shrink-0" /><span>{errors.invoiceStartingNumber}</span></p>
            )}
          </div>
        </div>

        {/* Invoice Preview */}
        <div className="bg-amber-50/50 dark:bg-amber-500/5 rounded-xl border border-amber-200/50 dark:border-amber-500/20 p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
              Next Invoice Preview
            </p>
            <p className="text-sm font-mono font-black text-slate-900 dark:text-white tracking-wider">
              {invoicePreview}
            </p>
          </div>
        </div>
      </div>

      {/* Banking & Payment Details */}
      <div className="border-t border-slate-200/80 dark:border-slate-700/60 pt-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 rounded">
            <Landmark className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            Banking & Payment Details
          </h3>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">(optional — shown on invoices)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Bank Name */}
          <div className="space-y-1">
            <label className={labelClass}>Bank Name</label>
            <div className="relative">
              <div className={iconClass}><Landmark className="w-3.5 h-3.5" /></div>
              <input
                type="text"
                value={data.bankName}
                onChange={(e) => onChange({ bankName: e.target.value })}
                placeholder="e.g. State Bank of India"
                className={`pl-8 pr-3 ${inputNormal}`}
              />
            </div>
          </div>

          {/* Account Number */}
          <div className="space-y-1">
            <label className={labelClass}>Account Number</label>
            <div className="relative">
              <div className={iconClass}><CreditCard className="w-3.5 h-3.5" /></div>
              <input
                type="text"
                value={data.accountNo}
                onChange={(e) => onChange({ accountNo: e.target.value.replace(/\D/g, "") })}
                placeholder="e.g. 38920019283"
                className={`pl-8 pr-3 font-mono font-bold ${inputNormal}`}
              />
            </div>
          </div>

          {/* IFSC */}
          <div className="space-y-1">
            <label className={labelClass}>IFSC Code</label>
            <div className="relative">
              <div className={iconClass}><Hash className="w-3.5 h-3.5" /></div>
              <input
                type="text"
                value={data.ifsc}
                onChange={(e) => onChange({ ifsc: e.target.value.toUpperCase() })}
                placeholder="e.g. SBIN0001234"
                className={`pl-8 pr-3 font-mono font-bold ${inputNormal}`}
              />
            </div>
          </div>

          {/* UPI ID */}
          <div className="space-y-1">
            <label className={labelClass}>UPI ID</label>
            <div className="relative">
              <div className={iconClass}><Wallet className="w-3.5 h-3.5" /></div>
              <input
                type="text"
                value={data.upiId}
                onChange={(e) => onChange({ upiId: e.target.value })}
                placeholder="e.g. business@sbi"
                className={`pl-8 pr-3 ${inputNormal}`}
              />
            </div>
          </div>
        </div>

        {(data.bankName || data.accountNo || data.ifsc || data.upiId) && (
          <div className="bg-emerald-50/60 dark:bg-emerald-500/5 rounded-lg border border-emerald-200/60 dark:border-emerald-500/20 p-2.5 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
              Bank details will appear on invoices to enable direct transfers and UPI payments.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
