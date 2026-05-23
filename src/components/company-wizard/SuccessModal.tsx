import React from "react";
import {
  CheckCircle2,
  Sparkles,
  Building,
  ArrowRight,
  PlusCircle,
  Palette,
} from "lucide-react";
import { CompanyFormData } from "@/types/company";

interface SuccessModalProps {
  isOpen: boolean;
  formData: CompanyFormData;
  onDashboardClick: () => void;
  onCreateAnother: () => void;
  onConfigureTemplates: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  isOpen,
  formData,
  onDashboardClick,
  onCreateAnother,
  onConfigureTemplates,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div data-wizard-light className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl border border-slate-200 animate-scaleUp relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center space-y-4 mb-8 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30 mx-auto animate-bounce-subtle">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin-hover" />
              Business Setup Verified
            </span>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Company Created Successfully!
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your business profile, financial settings, and tax configurations
              have been saved successfully.
            </p>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/80 mb-8 space-y-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-2xs overflow-hidden shrink-0">
              {formData.details.logoUrl ? (
                <img
                  src={formData.details.logoUrl}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-bold text-slate-900 truncate">
                {formData.details.companyName || "Acme Corporation"}
              </h4>
              <p className="text-xs text-slate-500 truncate">
                {formData.details.legalName || "Acme Corporation Pvt Ltd"}
              </p>
            </div>
            <span className="px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
              {formData.financial.currency} ({formData.financial.currencySymbol}
              )
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200/60 text-xs">
            <div>
              <span className="font-medium text-slate-400 block mb-0.5">
                Statutory Tax ID:
              </span>
              <span className="font-bold text-slate-800 font-mono">
                {formData.details.gstin || "Unregistered / None"}
              </span>
            </div>
            <div>
              <span className="font-medium text-slate-400 block mb-0.5">
                Fiscal Period:
              </span>
              <span className="font-bold text-slate-800">
                {formData.financial.fyStart} to {formData.financial.fyEnd}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 relative z-10">
          <button
            type="button"
            onClick={onDashboardClick}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Go to Company Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCreateAnother}
              className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
            >
              <PlusCircle className="w-4 h-4 text-slate-500" />
              <span>Create Another Company</span>
            </button>

            <button
              type="button"
              onClick={onConfigureTemplates}
              className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
            >
              <Palette className="w-4 h-4 text-slate-500" />
              <span>Configure Invoice Templates</span>
            </button>
          </div>
        </div>

        <div className="text-center mt-6 relative z-10">
          <span className="text-[11px] text-slate-400">
            Secure Session • Configuration Saved
          </span>
        </div>
      </div>
    </div>
  );
};
