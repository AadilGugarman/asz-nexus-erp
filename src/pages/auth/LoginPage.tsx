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
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-red-400 mb-1">
            Force Reset
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            This will permanently delete all your data — password, company
            settings, invoices, and transactions. The app will restart as if it
            was never used.
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
            ) : (
              "Yes, Reset Everything"
            )}
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
          <h2 className="text-lg font-semibold text-slate-100 mb-1">Sign in</h2>
          <p className="text-slate-500 text-sm">
            Enter your password to access the ERP.
          </p>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-300"
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
            className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            autoFocus
            autoComplete="current-password"
            disabled={isLoading}
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading || !password}
          className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
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
      <div className="pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="w-full py-2 text-xs text-slate-600 hover:text-red-400 transition-colors"
        >
          Forgot password? Force Reset
        </button>
      </div>
    </div>
  );
};
