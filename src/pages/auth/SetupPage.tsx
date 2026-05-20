/**
 * pages/auth/SetupPage.tsx
 * First-run setup page — creates the app password on first launch.
 *
 * Flow:
 *   1. User enters + confirms a password (min 4 chars)
 *   2. authStore.setup() → Rust hashes with Argon2id, issues JWT pair
 *   3. On success, ProtectedRoute lets user through to dashboard
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config';
import { useAuthStore } from '@/store';

export const SetupPage: React.FC = () => {
  const navigate     = useNavigate();
  const setup        = useAuthStore((s) => s.setup);
  const isLoading    = useAuthStore((s) => s.isLoading);
  const error        = useAuthStore((s) => s.error);
  const clearError   = useAuthStore((s) => s.clearError);
  const isAuth       = useAuthStore((s) => s.isAuthenticated);
  const isSetupDone  = useAuthStore((s) => s.isSetupDone);

  const [password, setPassword]   = useState('');
  const [confirm,  setConfirm]    = useState('');
  const [localErr, setLocalErr]   = useState('');

  // Already set up — go to login
  useEffect(() => {
    if (isSetupDone) navigate(ROUTES.login, { replace: true });
  }, [isSetupDone, navigate]);

  // Authenticated after setup — go to dashboard
  useEffect(() => {
    if (isAuth) navigate(ROUTES.dashboard, { replace: true });
  }, [isAuth, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalErr('');
    clearError();

    if (password.length < 4) {
      setLocalErr('Password must be at least 4 characters.');
      return;
    }
    if (password !== confirm) {
      setLocalErr('Passwords do not match.');
      return;
    }

    try {
      await setup({ password });
    } catch {
      // error already in store
    }
  };

  const displayError = localErr || error;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-100 mb-1">
          Welcome to TFC ERP
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
          onChange={(e) => { setPassword(e.target.value); setLocalErr(''); clearError(); }}
          placeholder="Min. 4 characters"
          className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
          onChange={(e) => { setConfirm(e.target.value); setLocalErr(''); clearError(); }}
          placeholder="Re-enter password"
          className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
        className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Setting up…
          </span>
        ) : 'Create Password & Continue'}
      </button>
    </form>
  );
};
