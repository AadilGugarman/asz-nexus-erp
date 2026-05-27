import React, { useMemo } from "react";
import { FinancialSettings } from "@/types/company";
import {
  RefreshCw,
  AlertCircle,
  Hash,
  Tag,
  FileText,
} from "lucide-react";
import { SegmentedControl } from "../ui/SegmentedControl";
import { DatePicker } from "../ui/DatePicker";

interface FinancialSettingsStepProps {
  data: FinancialSettings;
  onChange: (fields: Partial<FinancialSettings>) => void;
  errors: { [key: string]: string };
}

// Derive a display date string from fyStartMonth for the FY Start date input
function fyStartMonthToDate(month: number): string {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const year = currentMonth >= month ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

// Derive the FY end date from a start date string
function fyEndFromStart(startDate: string): string {
  if (!startDate) return "";
  const [yearStr, monthStr] = startDate.split("-");
  const year  = parseInt(yearStr,  10);
  const month = parseInt(monthStr, 10);
  const endMonth = month === 1 ? 12 : month - 1;
  const endYear  = month === 1 ? year : year + 1;
  const lastDay  = new Date(endYear, endMonth, 0).getDate();
  return `${endYear}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

export const FinancialSettingsStep: React.FC<FinancialSettingsStepProps> = ({
  data,
  onChange,
  errors,
}) => {
  const handleAutoGenerateFY = () => {
    onChange({ fyStartMonth: 4 });
  };

  // When user changes the FY Start date picker — extract month and store it
  const handleFyStartChange = (dateStr: string) => {
    if (!dateStr) return;
    const month = parseInt(dateStr.split("-")[1], 10);
    onChange({ fyStartMonth: isNaN(month) ? 4 : month });
  };

  // Derive display values from fyStartMonth
  const startMonth = data.fyStartMonth ?? 4;
  const fyStartDisplay = useMemo(() => fyStartMonthToDate(startMonth), [startMonth]);
  const fyEndDisplay   = useMemo(() => fyEndFromStart(fyStartDisplay), [fyStartDisplay]);

  const invoicePreview = useMemo(() => {
    const prefix = data.invoicePrefix || "";
    const num    = data.invoiceStartingNumber || "1001";
    return `${prefix}${num}`;
  }, [data.invoicePrefix, data.invoiceStartingNumber]);

  const handleStartingNumberChange = (val: string) => {
    onChange({ invoiceStartingNumber: val.replace(/\D/g, "") });
  };

  const taxOptions = [
    { label: "GST Registered", value: "gst" },
    { label: "Unregistered",   value: "none" },
  ];

  // Shared class builders — identical to original
  const inputBase   = "w-full py-2 rounded-lg border text-xs font-medium bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 transition-all";
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
          <div className="flex items-center justify-between mb-1">
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
          <DatePicker
            value={fyStartDisplay}
            onChange={handleFyStartChange}
            variant="amber"
          />
          {errors.fyStartMonth && (
            <p className={errorMsg}>
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.fyStartMonth}</span>
            </p>
          )}
        </div>

        {/* FY End — auto-computed, read-only */}
        <div className="space-y-1">
          <label className={labelClass + " mb-1"}>FY End</label>
          <DatePicker
            value={fyEndDisplay}
            onChange={() => {}}
            disabled={true}
            variant="amber"
          />
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            Auto-calculated from FY start
          </p>
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
            <label className={labelClass}>
              Invoice Prefix <span className="text-red-500">*</span>
            </label>
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
              <p className={errorMsg}>
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.invoicePrefix}</span>
              </p>
            )}
          </div>

          {/* Starting Number */}
          <div className="space-y-1">
            <label className={labelClass}>
              Starting Number <span className="text-red-500">*</span>
            </label>
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
              <p className={errorMsg}>
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{errors.invoiceStartingNumber}</span>
              </p>
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

      {/* Banking & Payment Details — moved to Settings → Invoice & Numbering */}
    </div>
  );
};
