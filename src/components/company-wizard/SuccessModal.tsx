import React, { useState } from "react";
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
  // Seed functionality removed — keep modal UI for success actions only

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div
        data-wizard-light
        className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl border border-slate-200 animate-scaleUp relative overflow-hidden"
      >
        {/* Background glow */}
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center space-y-4 mb-6 relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
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
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 mb-5 space-y-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm overflow-hidden shrink-0">
              {formData.details.logoUrl ? (
                <img
                  src={formData.details.logoUrl}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-900 truncate">
                {formData.details.companyName || "Your Company"}
              </h4>
              <p className="text-xs text-slate-500 truncate">
                {formData.details.legalName || formData.details.companyName}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700">
              {formData.financial.currency} ({formData.financial.currencySymbol}
              )
            </span>
          </div>
        </div>

        {/* Seed demo removed */}

        {/* Action Buttons */}
        <div className="space-y-3 relative z-10">
          <button
            type="button"
            onClick={onDashboardClick}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-blue-500/25 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Go to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCreateAnother}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
            >
              <PlusCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>Create Another</span>
            </button>
            <button
              type="button"
              onClick={onConfigureTemplates}
              className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
            >
              <Palette className="w-3.5 h-3.5 text-slate-500" />
              <span>Invoice Templates</span>
            </button>
          </div>
        </div>

        <div className="text-center mt-5 relative z-10">
          <span className="text-[11px] text-slate-400">
            Secure Session • Configuration Saved
          </span>
        </div>
      </div>
    </div>
  );
};
