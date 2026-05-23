/**
 * pages/auth/LoginPage.tsx
 * Login page � wired to the real auth store.
 *
 * On submit: calls authStore.login() ? Rust verifies Argon2 hash ?
 * issues JWT pair ? store saves tokens ? ProtectedRoute lets user through.
 *
 * After a successful login:
 *   - If company setup not done ? /company-setup
 *   - Otherwise ? original destination (or /dashboard)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '@/config';
import { useAuthStore, useCompanyStore, useLockStore, useStartupStore } from '@/store';
import { decidePostStartupRoute } from '@/router/routeDecision';

interface LocationState {
  from?: { pathname: string };
}

export const LoginPage: React.FC = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = (location.state as LocationState)?.from?.pathname ?? ROUTES.dashboard;

  const login      = useAuthStore((s) => s.login);
  const isLoading  = useAuthStore((s) => s.isLoading);
  const error      = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const isAuth     = useAuthStore((s) => s.isAuthenticated);
  const isSetupDone = useAuthStore((s) => s.isSetupDone);

  const startupReady = useStartupStore((s) => s.phase === 'ready');
  const hasCompany = useCompanyStore((s) => s.hasCompany);
  const isLocked = useLockStore((s) => s.isLocked);

  const [password, setPassword] = useState('');

  // Redirect once authenticated � check company setup first
  useEffect(() => {
    if (!isAuth || !startupReady) return;

    const target = decidePostStartupRoute({
      startupReady,
      isSetupDone,
      isAuthenticated: true,
      hasCompany,
      isLocked,
    });

    if (!target) return;
    navigate(target === ROUTES.dashboard ? from : target, { replace: true });
  }, [isAuth, startupReady, isSetupDone, isLocked, from, navigate, hasCompany]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login({ password });
    } catch {
      // error is already set in the store
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-100 mb-1">Sign in</h2>
        <p className="text-slate-500 text-sm">Enter your password to access the ERP.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-slate-300">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); clearError(); }}
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
            Verifying�
          </span>
        ) : 'Continue'}
      </button>
    </form>
  );
};
