/**
 * pages/auth/LoginPage.tsx
 * Login page — wired to the real auth store.
 *
 * On submit: calls authStore.login() → Rust verifies Argon2 hash →
 * issues JWT pair → store saves tokens → ProtectedRoute lets user through.
 *
 * After a successful login:
 *   - If company setup not done → /company-setup
 *   - Otherwise → original destination (or /dashboard)
 *
 * Recovery: A "Force Reset" option is available for cases where the user
 * cannot remember their password or needs a clean slate. It wipes auth.json
 * and the SQLite database, returning the app to first-run state.
 */

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ROUTES } from "@/config";
import {
  useAuthStore,
  useCompanyStore,
  useStartupStore,
  useSettingsStore,
} from "@/store";
import { decidePostStartupRoute } from "@/router/routeDecision";

interface LocationState {
  from?: { pathname: string };
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as LocationState)?.from?.pathname ?? ROUTES.dashboard;

  const login = useAuthStore((s) => s.login);
  const resetApp = useAuthStore((s) => s.resetApp);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  const isSetupDone = useAuthStore((s) => s.isSetupDone);

  const startupReady = useStartupStore((s) => s.phase === "ready");
  const hasCompany = useCompanyStore((s) => s.hasCompany);
  const isSetupComplete = useSettingsStore((s) => s.settings.setupCompleted);

  const [password, setPassword] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Redirect once authenticated
  useEffect(() => {
    if (!isAuth || !startupReady || isLoading) return;

    const target = decidePostStartupRoute({
      startupReady,
      isSetupDone,
      isAuthenticated: true,
      hasCompany,
      isSetupComplete,
    });

    if (!target) return;
    navigate(target === ROUTES.dashboard ? from : target, { replace: true });
  }, [
    isAuth,
    startupReady,
    isLoading,
    isSetupDone,
    from,
    navigate,
    hasCompany,
    isSetupComplete,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    clearError();
    try {
      await login({ password });
    } catch {
      // error is already set in the store
    }
  };

  const handleForceReset = async () => {
    setIsResetting(true);
    try {
      await resetApp();
    } catch {
      // resetApp handles its own errors and reloads the page
      setIsResetting(false);
    }
  };

  // ── Force Reset confirmation dialog ──────────────────────────────────────
  if (showResetConfirm) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Force Reset
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            This will permanently delete all your data — password, company
            settings, invoices, and transactions.
          </p>
          <p className="text-red-500 dark:text-red-400 text-xs font-bold mt-4 uppercase tracking-widest">
            This cannot be undone.
          </p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={handleForceReset}
            disabled={isResetting}
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold transition-all active:scale-[0.98] shadow-lg shadow-red-500/25"
          >
            {isResetting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Resetting…
              </span>
            ) : (
              "Yes, Reset Everything"
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowResetConfirm(false)}
            disabled={isResetting}
            className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 font-bold transition-all active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Normal login form ─────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
            Sign in
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            Enter your password to access the ERP.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearError();
            }}
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00aeef] focus:border-transparent transition-all"
            autoFocus
            autoComplete="current-password"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="text-xs font-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-400/10 border border-red-100 dark:border-red-400/20 rounded-xl px-4 py-3 flex items-center gap-2">
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !password}
          className="w-full py-3 rounded-xl text-white font-bold tracking-wide transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg,#00c896 0%,#00aeef 100%)",
            boxShadow: "0 8px 20px rgba(0,174,239,0.25)",
          }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Verifying…
            </span>
          ) : (
            "Continue"
          )}
        </button>
      </form>

      {/* Force Reset — recovery option for forgotten passwords / clean slate */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="w-full py-2 text-xs font-medium text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          Forgot password? Force Reset
        </button>
      </div>
    </div>
  );
};
