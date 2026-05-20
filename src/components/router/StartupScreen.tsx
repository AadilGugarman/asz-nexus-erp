import React from 'react';

interface StartupScreenProps {
  message?: string;
}

export const StartupScreen: React.FC<StartupScreenProps> = ({ message }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
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
    </div>
  );
};
