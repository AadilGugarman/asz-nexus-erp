import React from "react";
import { ArrowLeft, CheckCircle2, Database, RefreshCw } from "lucide-react";

interface HeaderProps {
  onBackClick: () => void;
  lastSavedTime: string | null;
  isDirty: boolean;
  onResetForm: () => void;
  onSeedDemo?: () => void;
  title?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onBackClick,
  lastSavedTime,
  isDirty,
  onResetForm,
  onSeedDemo,
  title = "Create New Company",
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-2 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer group focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            title="Return to previous screen"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
            {title}
          </h1>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {import.meta.env.DEV && onSeedDemo && (
            <button
              onClick={onSeedDemo}
              className="text-xs font-semibold bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Fill with professional demo data"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Seed Demo Data</span>
            </button>
          )}

          <button
            onClick={onResetForm}
            className="text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-500/30 transition-all cursor-pointer flex items-center gap-1"
            title="Clear all fields"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          {isDirty ? (
            <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <span className="hidden sm:inline">Unsaved</span>
            </div>
          ) : lastSavedTime ? (
            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span className="hidden sm:inline">Saved {lastSavedTime}</span>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
