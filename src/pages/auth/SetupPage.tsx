/**
 * pages/auth/SetupPage.tsx
 * First-run setup page — creates the app password on first launch.
 *
 * Flow:
 *   1. User enters + confirms a password (min 4 chars)
 *   2. authStore.setup() → Rust hashes with Argon2id, issues JWT pair
 *   3. SetupRoute guard redirects to /company-setup
 *
 * Recovery: Force Reset is available here for a clean slate.
 */

import React, { useState } from "react";
import { useAuthStore } from "@/store";

export const SetupPage: React.FC = () => {
  const setup          = useAuthStore((s) => s.setup);
  const resetApp       = useAuthStore((s) => s.resetApp);
  const isLoading      = useAuthStore((s) => s.isLoading);
  const error          = useAuthStore((s) => s.error);
  const clearError     = useAuthStore((s) => s.clearError);

  const [password, setPassword]               = useState("");
  const [confirm, setConfirm]                 = useState("");
  const [localErr, setLocalErr]               = useState("");
  const [showSuccess, setShowSuccess]         = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting]         = useState(false);

  // NOTE: Navigation away from this page is handled entirely by the
  // SetupRoute guard in routes.tsx — it redirects when isSetupDone becomes
  // true. Do NOT add useEffect navigations here; they race with the guard
  // and cause infinite update loops.

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalErr("");
    clearError();

    if (password.length < 4) {
      setLocalErr("Password must be at least 4 characters.");
      return;
    }
    if (password !== confirm) {
      setLocalErr("Passwords do not match.");
      return;
    }

    try {
      await setup({ password });
      setShowSuccess(true);
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setShowSuccess(false);
    } catch (err) {
      console.error("[SetupPage] Setup failed:", err);
    }
  };

  const handleForceReset = async () => {
    setIsResetting(true);
    try {
      await resetApp();
    } catch {
      setIsResetting(false);
    }
  };

  const displayError = localErr || error;

  // ── Success state ─────────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-100">Password Created!</h2>
        <p className="text-slate-400 mt-2">Initializing your workspace...</p>
      </div>
    );
  }

  // ── Force Reset confirmation ───────────────────────────────────────────────
  if (showResetConfirm) {
    return (
      <div className="space-y-5">
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
    );
  }

  // ── Normal setup form ─────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 mb-1">
            Welcome to ASZ Nexus ERP
          </h2>
          <p className="text-slate-500 text-sm">
            Create a password to secure your data. You'll use this every time you open the app.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-slate-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setLocalErr(""); clearError(); }}
            placeholder="Min. 4 characters"
            className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            autoFocus
            autoComplete="new-password"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirm" className="block text-sm font-medium text-slate-300">
            Confirm Password
          </label>
          <input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setLocalErr(""); clearError(); }}
            placeholder="Re-enter password"
            className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            autoComplete="new-password"
            disabled={isLoading}
          />
        </div>

        {displayError && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            {displayError}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading || !password || !confirm}
          className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Setting up…
            </span>
          ) : "Continue"}
        </button>
      </form>

      {/* Force Reset — recovery option */}
      <div className="pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="w-full py-2 text-xs text-slate-600 hover:text-red-400 transition-colors"
        >
          Force Reset (clear all data)
        </button>
      </div>
    </div>
  );
};
