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
    // Indian FY: April 1 to March 31 next year
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
    const cleaned = val.replace(/\D/g, "");
    onChange({ invoiceStartingNumber: cleaned });
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <h2 className="text-sm font-bold text-slate-900 tracking-tight">
        Financial & Accounting Configuration
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* FY Start */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              FY Start <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleAutoGenerateFY}
              className="text-[11px] text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Auto April 1</span>
            </button>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <input
              type="date"
              value={data.fyStart}
              onChange={(e) => onChange({ fyStart: e.target.value })}
              className={`w-full pl-8 pr-3 py-2 rounded-lg border text-xs font-medium bg-white focus:outline-hidden focus:ring-2 transition-all ${errors.fyStart ? "border-red-300 focus:ring-red-100 focus:border-red-500" : "border-slate-200 focus:ring-amber-100 focus:border-amber-500"}`}
            />
          </div>
          {errors.fyStart && (
            <p className="text-[11px] text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.fyStart}</span>
            </p>
          )}
        </div>
        {/* FY End */}
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            FY End <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <input
              type="date"
              value={data.fyEnd}
              onChange={(e) => onChange({ fyEnd: e.target.value })}
              className={`w-full pl-8 pr-3 py-2 rounded-lg border text-xs font-medium bg-white focus:outline-hidden focus:ring-2 transition-all ${errors.fyEnd ? "border-red-300 focus:ring-red-100 focus:border-red-500" : "border-slate-200 focus:ring-amber-100 focus:border-amber-500"}`}
            />
          </div>
          {errors.fyEnd && (
            <p className="text-[11px] text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.fyEnd}</span>
            </p>
          )}
        </div>
        {/* Currency */}
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            Base Currency <span className="text-red-500">*</span>
          </label>
          <select
            value={data.currency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-100 focus:border-amber-500 transition-all"
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
          <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            Currency Symbol <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.currencySymbol}
            onChange={(e) => onChange({ currencySymbol: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-100 focus:border-amber-500 transition-all"
          />
        </div>
      </div>

      <div className="border-t border-slate-200/80 pt-3 space-y-4">
        <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
          Invoice Sequencing & Tax Rules
        </h3>

        {/* Tax Selection - Segmented */}
        <SegmentedControl
          label="Business Tax Status"
          options={taxOptions}
          value={data.taxType}
          onChange={(val) => onChange({ taxType: val })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Invoice Prefix */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Invoice Prefix <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Tag className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={data.invoicePrefix}
                onChange={(e) =>
                  onChange({ invoicePrefix: e.target.value.toUpperCase() })
                }
                placeholder="e.g. ASZINV"
                className={`w-full pl-8 pr-3 py-2 rounded-lg border text-xs font-mono font-bold bg-white focus:outline-hidden focus:ring-2 transition-all ${errors.invoicePrefix ? "border-red-300 focus:ring-red-100 focus:border-red-500" : "border-slate-200 focus:ring-amber-100 focus:border-amber-500"}`}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Auto-generated from company name
            </p>
            {errors.invoicePrefix && (
              <p className="text-[11px] text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.invoicePrefix}</span>
              </p>
            )}
          </div>
          {/* Starting Number */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Starting Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Hash className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={data.invoiceStartingNumber}
                onChange={(e) => handleStartingNumberChange(e.target.value)}
                placeholder="0001"
                className={`w-full pl-8 pr-3 py-2 rounded-lg border text-xs font-mono font-bold bg-white focus:outline-hidden focus:ring-2 transition-all ${errors.invoiceStartingNumber ? "border-red-300 focus:ring-red-100 focus:border-red-500" : "border-slate-200 focus:ring-amber-100 focus:border-amber-500"}`}
              />
            </div>
            {errors.invoiceStartingNumber && (
              <p className="text-[11px] text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.invoiceStartingNumber}</span>
              </p>
            )}
          </div>
        </div>

        {/* Real-time Preview */}
        <div className="bg-amber-50/50 rounded-xl border border-amber-200/50 p-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-white border border-amber-200 flex items-center justify-center text-amber-500 shadow-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">
              Next Invoice Preview
            </p>
            <p className="text-sm font-mono font-black text-slate-900 tracking-wider">
              {invoicePreview}
            </p>
          </div>
        </div>
      </div>

      {/* Banking & Payment Details */}
      <div className="border-t border-slate-200/80 pt-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-emerald-100 text-emerald-700 rounded">
            <Landmark className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            Banking & Payment Details
          </h3>
          <span className="text-[10px] text-slate-400 font-medium">(optional — shown on invoices)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Bank Name */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Bank Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Landmark className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={data.bankName}
                onChange={(e) => onChange({ bankName: e.target.value })}
                placeholder="e.g. State Bank of India"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-100 focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          {/* Account Number */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              Account Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={data.accountNo}
                onChange={(e) => onChange({ accountNo: e.target.value.replace(/\D/g, "") })}
                placeholder="e.g. 38920019283"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-100 focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          {/* IFSC */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              IFSC Code
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Hash className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={data.ifsc}
                onChange={(e) => onChange({ ifsc: e.target.value.toUpperCase() })}
                placeholder="e.g. SBIN0001234"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-100 focus:border-amber-500 transition-all"
              />
            </div>
          </div>

          {/* UPI ID */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              UPI ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={data.upiId}
                onChange={(e) => onChange({ upiId: e.target.value })}
                placeholder="e.g. business@sbi"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-100 focus:border-amber-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Banking hint */}
        {(data.bankName || data.accountNo || data.ifsc || data.upiId) && (
          <div className="bg-emerald-50/60 rounded-lg border border-emerald-200/60 p-2.5 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <p className="text-[10px] text-emerald-700 font-medium">
              Bank details will appear on invoices to enable direct transfers and UPI payments.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
