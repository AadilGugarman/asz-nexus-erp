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
  const setup = useAuthStore((s) => s.setup);
  const resetApp = useAuthStore((s) => s.resetApp);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localErr, setLocalErr] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

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
      <div className="flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-lg rotate-12"
          style={{
            background: "linear-gradient(135deg,#00c896 0%,#00aeef 100%)",
            boxShadow: "0 10px 25px rgba(0,174,239,0.3)",
          }}
        >
          <svg
            className="w-10 h-10 text-white animate-in zoom-in duration-700 delay-300 fill-none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Security Setup!
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">
          Your master password is ready.
        </p>
        <div className="mt-8 flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#00aeef] animate-bounce" />
          <div
            className="w-2 h-2 rounded-full bg-[#00aeef] animate-bounce"
            style={{ animationDelay: "0.2s" }}
          />
          <div
            className="w-2 h-2 rounded-full bg-[#00aeef] animate-bounce"
            style={{ animationDelay: "0.4s" }}
          />
        </div>
      </div>
    );
  }

  // ── Force Reset confirmation ───────────────────────────────────────────────
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
            This will permanently delete all data — password, company settings,
            invoices, and transactions.
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

  // ── Password setup form ──────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
            Create Password
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            Set a master password to secure your ERP data.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >
              Master Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setLocalErr("");
              }}
              placeholder="Min. 4 characters"
              className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00aeef] focus:border-transparent transition-all"
              autoFocus
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirm"
              className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
            >
              Confirm Password
            </label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setLocalErr("");
              }}
              placeholder="Repeat password"
              className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#00aeef] focus:border-transparent transition-all"
              disabled={isLoading}
            />
          </div>
        </div>

        {displayError && (
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
            {displayError}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !password || !confirm}
          className="w-full py-3 rounded-xl text-white font-bold tracking-wide transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg,#00c896 0%,#00aeef 100%)",
            boxShadow: "0 8px 20px rgba(0,174,239,0.25)",
          }}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Initializing…
            </span>
          ) : (
            "Start My Workspace"
          )}
        </button>
      </form>

      {/* Force Reset — recovery option */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="w-full py-2 text-xs font-medium text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
        >
          Start over? Reset App
        </button>
      </div>
    </div>
  );
};
