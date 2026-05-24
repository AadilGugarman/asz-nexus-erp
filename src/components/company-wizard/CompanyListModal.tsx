import React from "react";
import { Building2, Plus, ArrowRight, ExternalLink } from "lucide-react";
import { useSettingsStore } from "@/store";
import { useNavigate } from "react-router-dom";

interface CompanyListModalProps {
  isOpen: boolean;
  onClose: () => void; // Return to wizard
  onStartFresh: () => void;
}

export const CompanyListModal: React.FC<CompanyListModalProps> = ({
  isOpen,
  onClose,
  onStartFresh,
}) => {
  const navigate = useNavigate();
  const { companies, activeCompanyId } = useSettingsStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div data-wizard-light className="bg-white rounded-3xl max-w-4xl w-full p-8 shadow-2xl border border-slate-200 animate-scaleUp relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Choose a Company
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a company to continue or create a new one.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer border border-slate-200 flex items-center gap-1.5"
            >
              <span>Back to Setup</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onStartFresh}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Company</span>
            </button>
          </div>
        </div>

        {/* List of existing companies */}
        <div className="py-6 overflow-y-auto space-y-4 flex-1">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Your Companies ({companies.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companies.map((comp) => (
              <div
                key={comp.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-500 hover:shadow-md transition-all flex items-start justify-between gap-4 group cursor-pointer"
                onClick={() => navigate(`/app/${comp.id}/dashboard`)}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200 transition-colors shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {comp.company.name}
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          comp.id === activeCompanyId
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        {comp.id === activeCompanyId ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 space-y-0.5">
                      <div className="truncate font-mono">
                        GSTIN: {comp.company.gstin || "N/A"}
                      </div>
                      <div>
                        {comp.city || "Unknown"}, {comp.state || ""}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Powered by ASZ Nexus ERP</span>
          <button
            onClick={onClose}
            className="text-blue-600 hover:text-blue-700 font-bold cursor-pointer"
          >
            Close & Return
          </button>
        </div>
      </div>
    </div>
  );
};
