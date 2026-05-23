import React from 'react';

interface StartupScreenProps {
  message?: string;
}

export const StartupScreen: React.FC<StartupScreenProps> = ({ message }) => {
  const handleForceReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-100/50 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-100/50 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Logo/Icon */}
        <div className="mb-8 relative">
          <div className="h-20 w-20 rounded-3xl bg-white border border-slate-200 shadow-xl flex items-center justify-center transform rotate-12 transition-transform hover:rotate-0 duration-500">
            <div className="h-10 w-10 bg-amber-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span className="text-white font-bold text-xl">T</span>
            </div>
          </div>
          <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-white border border-slate-100 shadow-md flex items-center justify-center">
            <div className="h-3 w-3 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-2 mb-12">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Talha Fruit Co.</h1>
          <p className="text-slate-500 font-medium">ERP System</p>
        </div>

        {/* Progress/Message */}
        <div className="w-full space-y-4">
          <div className="flex justify-between items-end mb-1 px-1">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider animate-pulse">
              {message ?? 'Initializing...'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
              v1.0.0
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-amber-500 rounded-full animate-progress-indeterminate" />
          </div>
        </div>
      </div>

      {import.meta.env.DEV && (
        <button
          onClick={handleForceReset}
          className="fixed bottom-8 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-slate-400 text-[10px] font-bold uppercase tracking-widest hover:text-amber-500 hover:border-amber-200 hover:shadow-md transition-all cursor-pointer z-20"
        >
          Force Reset App
        </button>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%); width: 30%; }
          50% { transform: translateX(100%); width: 60%; }
          100% { transform: translateX(250%); width: 30%; }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 2s infinite ease-in-out;
        }
      `}} />
    </div>
  );
};
