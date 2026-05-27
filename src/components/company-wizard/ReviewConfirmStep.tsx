import React from "react";
import { CompanyFormData, FY_MONTHS, computeFYLabel, fyLabelToDates } from "@/types/company";
import { CURRENCIES, TAX_TYPES } from "@/config";
import {
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Building2,
  Coins,
  ShieldCheck,
  Database,
} from "lucide-react";

interface ReviewConfirmStepProps {
  formData: CompanyFormData;
  onEditStep: (step: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  validationErrors: {
    details: { [key: string]: string };
    financial: { [key: string]: string };
  };
}

export const ReviewConfirmStep: React.FC<ReviewConfirmStepProps> = ({
  formData,
  onEditStep,
  onSubmit,
  isSubmitting,
  validationErrors,
}) => {
  const detailsErrorsCount = Object.keys(validationErrors.details).length;
  const financialErrorsCount = Object.keys(validationErrors.financial).length;
  const totalErrors = detailsErrorsCount + financialErrorsCount;

  const currencyObj = CURRENCIES.find((c) => c.code === formData.financial.currency);
  const taxObj = TAX_TYPES.find((t) => t.id === formData.financial.taxType);

  // Derive FY label and dates from fyStartMonth
  const startMonth = formData.financial.fyStartMonth ?? 4;
  const fyLabel = computeFYLabel(startMonth);
  const fyDates = fyLabelToDates(fyLabel, startMonth);
  const fyMonthName = FY_MONTHS.find((m) => m.value === startMonth)?.label ?? "April";

  const sectionHeader = "bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3";
  const editBtn = "flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-500/10 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 transition-all cursor-pointer";
  const fieldLabel = "text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-0.5";
  const fieldValue = "text-xs font-bold block truncate text-slate-900 dark:text-slate-100";

  return (
    <div className="space-y-4 animate-fadeIn">
      <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
        Review Your Business Setup
      </h2>

      {/* Status banner */}
      {totalErrors > 0 ? (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-3 flex items-start gap-3">
          <div className="p-1.5 bg-red-100 dark:bg-red-500/20 rounded-lg text-red-600 dark:text-red-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-red-900 dark:text-red-300">
              {totalErrors} Missing or Invalid Field{totalErrors > 1 ? "s" : ""}
            </h3>
            <p className="text-[11px] text-red-700 dark:text-red-400 mt-0.5">
              Resolve the issues below before continuing.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl p-3 flex items-center gap-3">
          <div className="p-1.5 bg-white/20 rounded-lg shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-white">Setup Complete — All fields verified</h3>
            <p className="text-[11px] text-amber-50 mt-0.5">Ready to initialize your company.</p>
          </div>
        </div>
      )}

      {/* Company Details review */}
      <div className={`bg-white dark:bg-slate-900 rounded-xl border overflow-hidden ${detailsErrorsCount > 0 ? "border-red-300 dark:border-red-500/40 ring-2 ring-red-50 dark:ring-red-500/10" : "border-slate-200 dark:border-slate-700/60"}`}>
        <div className={sectionHeader}>
          <div className="flex items-center gap-2">
            <div className="p-1 bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 rounded">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-bold text-xs text-slate-900 dark:text-white">1. Company Details</h3>
            {detailsErrorsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                {detailsErrorsCount} Error{detailsErrorsCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <button type="button" onClick={() => onEditStep(1)} className={editBtn}>
            <Edit3 className="w-3 h-3" /><span>Edit</span>
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { label: "Company Name", value: formData.details.companyName || "Missing", error: validationErrors.details.companyName },
            { label: "Legal Name",   value: formData.details.legalName   || "Missing", error: validationErrors.details.legalName },
            { label: "GSTIN",        value: formData.details.gstin       || "N/A",     error: validationErrors.details.gstin,      mono: true },
            { label: "PAN",          value: formData.details.panNumber   || "N/A",     error: validationErrors.details.panNumber,  mono: true },
            {
              label: "Address",
              value: formData.details.address
                ? `${formData.details.address}${formData.details.city ? `, ${formData.details.city}` : ""}${formData.details.state ? `, ${formData.details.state}` : ""}${formData.details.pincode ? ` - ${formData.details.pincode}` : ""}`
                : "Missing",
              error: validationErrors.details.address || validationErrors.details.city || validationErrors.details.state || validationErrors.details.pincode,
            },
            { label: "Country", value: formData.details.country, error: validationErrors.details.country },
            { label: "Phone",   value: formData.details.phone || "Missing", error: validationErrors.details.phone },
          ].map(({ label, value, error, mono }) => (
            <div key={label}>
              <span className={fieldLabel}>{label}</span>
              <span className={`${fieldValue} ${error ? "text-red-500 dark:text-red-400" : ""} ${mono ? "font-mono" : ""}`}>
                {value}
              </span>
              {error && (
                <span className="text-[9px] text-red-500 dark:text-red-400 font-medium block mt-0.5 leading-tight">{error}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Financial review */}
      <div className={`bg-white dark:bg-slate-900 rounded-xl border overflow-hidden ${financialErrorsCount > 0 ? "border-red-300 dark:border-red-500/40 ring-2 ring-red-50 dark:ring-red-500/10" : "border-slate-200 dark:border-slate-700/60"}`}>
        <div className={sectionHeader}>
          <div className="flex items-center gap-2">
            <div className="p-1 bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 rounded">
              <Coins className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-bold text-xs text-slate-900 dark:text-white">2. Financial Configuration</h3>
            {financialErrorsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30">
                {financialErrorsCount} Error{financialErrorsCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <button type="button" onClick={() => onEditStep(2)} className={editBtn}>
            <Edit3 className="w-3 h-3" /><span>Edit</span>
          </button>
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            {
              label: "Financial Year",
              value: `FY ${fyLabel} (${fyMonthName} start)`,
              error: validationErrors.financial.fyStartMonth,
            },
            {
              label: "FY Period",
              value: `${fyDates.start} → ${fyDates.end}`,
            },
            {
              label: "Currency",
              value: currencyObj ? `${currencyObj.name} (${currencyObj.symbol})` : formData.financial.currency,
              error: validationErrors.financial.currency,
            },
            {
              label: "Tax Type",
              value: taxObj ? taxObj.name : formData.financial.taxType,
              error: validationErrors.financial.taxType,
            },
            {
              label: "Invoice Sample",
              value: `${formData.financial.invoicePrefix}/${String(startMonth).padStart(2,"0")}-${String(startMonth === 1 ? 12 : startMonth - 1).padStart(2,"0")}/${formData.financial.invoiceStartingNumber}`,
              error: validationErrors.financial.invoicePrefix || validationErrors.financial.invoiceStartingNumber,
              mono: true,
              amber: true,
            },
          ].map(({ label, value, error, mono, amber }) => (
            <div key={label}>
              <span className={fieldLabel}>{label}</span>
              <span className={`${fieldValue} ${
                error
                  ? "text-red-500 dark:text-red-400"
                  : amber
                    ? "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-200/60 dark:border-amber-500/20"
                    : ""
              } ${mono ? "font-mono" : ""}`}>
                {value}
              </span>
              {error && (
                <span className="text-[9px] text-red-500 dark:text-red-400 font-medium block mt-0.5 leading-tight">{error}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Banking details moved to Settings → Invoice & Numbering */}

      {/* Submit */}
      <div className="bg-slate-900 dark:bg-slate-950 text-white p-4 rounded-xl flex items-center justify-between gap-4 border border-slate-800 dark:border-slate-700">
        <div>
          <h3 className="font-bold text-xs text-white flex items-center gap-1.5">
            <Database className="w-4 h-4 text-amber-500" />
            Finalize Company Setup
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Review your information and continue to your dashboard.
          </p>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={totalErrors > 0 || isSubmitting}
          className={`shrink-0 px-5 py-2 rounded-lg font-bold text-xs tracking-wide shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
            totalErrors > 0
              ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
              : isSubmitting
                ? "bg-amber-500 text-white animate-pulse"
                : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-amber-500/25 hover:scale-[1.02]"
          }`}
        >
          {isSubmitting ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Processing...</span>
            </>
          ) : totalErrors > 0 ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Fix {totalErrors} Error{totalErrors > 1 ? "s" : ""}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Continue to Dashboard</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
