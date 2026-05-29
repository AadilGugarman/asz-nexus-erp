import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore, useCompanyStore, useSettingsStore } from "@/store";
import { ROUTES } from "@/config";

const SetupWizard = lazy(() =>
  import("@/components/SetupWizard").then((m) => ({ default: m.SetupWizard })),
);

export const CompanySetupPage: React.FC = () => {
  const navigate           = useNavigate();
  const hasCompany         = useCompanyStore((s) => s.hasCompany);
  const setupCompleted     = useSettingsStore((s) => s.settings.setupCompleted);
  const markCompanyCreated = useCompanyStore((s) => s.markCompanyCreated);
  const updateSettings     = useSettingsStore((s) => s.updateSettings);
  const resetApp           = useAuthStore((s) => s.resetApp);

  // Prevent double-navigation from both the useEffect and handleComplete
  const navigatingRef = useRef(false);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting]           = useState(false);

  // Failsafe: already has a company AND setup is complete → go to dashboard.
  // Only redirect when BOTH are true to avoid redirecting mid-wizard-completion.
  useEffect(() => {
    if (hasCompany && setupCompleted && !navigatingRef.current) {
      navigatingRef.current = true;
      navigate(ROUTES.dashboard, { replace: true });
    }
  }, [hasCompany, setupCompleted, navigate]);

  const handleComplete = async () => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    // 1. Persist setupCompleted to store + DB (synchronous store update)
    await updateSettings({ setupCompleted: true });
    // 2. Navigate to dashboard
    navigate(ROUTES.dashboard, { replace: true });
    // 3. Mark company in store so ProtectedRoute sees hasCompany=true
    markCompanyCreated();
  };

  const handleForceReset = async () => {
    setIsResetting(true);
    try {
      await resetApp();
    } catch {
      setIsResetting(false);
    }
  };

  // ── Force Reset confirmation ───────────────────────────────────────────────
  if (showResetConfirm) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={() => setShowResetConfirm(false)}
      >
        <div
          className="bg-[#131e30] border border-[#1e3048] rounded-2xl p-8 w-full max-w-sm shadow-2xl space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            <h2 className="text-lg font-semibold text-red-400 mb-1">Force Reset</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              This will permanently delete all data — password, company settings,
              invoices, and transactions. The app restarts as if never used.
            </p>
            <p className="text-red-400 text-xs font-semibold mt-3 uppercase tracking-wide">
              This cannot be undone.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowResetConfirm(false)}
              disabled={isResetting}
              className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50 font-medium transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleForceReset}
              disabled={isResetting}
              className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium transition-colors text-sm"
            >
              {isResetting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Resetting…
                </span>
              ) : "Yes, Reset Everything"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={null}>
        <SetupWizard onComplete={handleComplete} />
      </Suspense>

      {/* Force Reset — accessible during company setup */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="px-4 py-1.5 text-xs text-slate-600 hover:text-red-400 transition-colors rounded-full border border-slate-800 bg-slate-950/80 backdrop-blur-sm"
        >
          Force Reset
        </button>
      </div>
    </>
  );
};
