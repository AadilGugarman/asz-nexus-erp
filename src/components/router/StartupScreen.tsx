import React from 'react';

interface StartupScreenProps {
  message?: string;
}

export const StartupScreen: React.FC<StartupScreenProps> = ({ message }) => {
  const handleForceReset = () => {
    localStorage.removeItem("tfc_erp_setup_done");
    localStorage.removeItem("tfc_erp_authenticated");
    localStorage.removeItem("tfc_erp_settings");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <div className="h-5 w-5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          </div>
          <div>
            <h1 className="text-slate-100 text-lg font-semibold">Preparing TFC ERP</h1>
            <p className="text-slate-400 text-sm mt-0.5">{message ?? 'Initializing application...'}</p>
          </div>
        </div>
      </div>

      {import.meta.env.DEV && (
        <button
          onClick={handleForceReset}
          className="mt-8 px-4 py-2 rounded-lg border border-slate-700 text-slate-500 text-xs hover:text-slate-300 hover:border-slate-500 transition-colors cursor-pointer"
        >
          [Dev] Reset Auth & Setup State
        </button>
      )}
    </div>
  );
};
