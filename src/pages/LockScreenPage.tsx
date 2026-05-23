import React, { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ROUTES } from '@/config';
import { useAuthStore, useCompanyStore, useLockStore } from '@/store';

export const LockScreenPage: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompany = useCompanyStore((s) => s.hasCompany);
  const isLocked = useLockStore((s) => s.isLocked);
  const lockReason = useLockStore((s) => s.lockReason);
  const unlock = useLockStore((s) => s.unlock);

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const subtitle = useMemo(() => {
    if (lockReason === 'inactivity') return 'Session locked due to inactivity';
    return 'Enter your app PIN to continue';
  }, [lockReason]);

  if (!isAuthenticated) return <Navigate to={ROUTES.login} replace />;
  if (!hasCompany) return <Navigate to={ROUTES.companySetup} replace />;
  if (!isLocked) return <Navigate to={ROUTES.dashboard} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const ok = await unlock(pin);
      if (!ok) {
        setError('Incorrect PIN. Please try again.');
      }
    } finally {
      setBusy(false);
      setPin('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/95 shadow-2xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300" />

        <div className="p-10">
          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 font-semibold">TFC ERP Security</p>
            <h1 className="text-3xl font-semibold text-slate-100 mt-2">Application Locked</h1>
            <p className="text-slate-400 text-sm mt-2">{subtitle}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label htmlFor="lock-pin" className="text-xs uppercase tracking-wider text-slate-500 block">PIN</label>
            <input
              id="lock-pin"
              type="password"
              autoFocus
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, '').slice(0, 6));
                if (error) setError(null);
              }}
              placeholder="Enter 4-6 digit PIN"
              className="w-full rounded-2xl bg-slate-950 border border-slate-700 px-4 py-3 text-slate-100 tracking-[0.35em] text-center text-2xl font-semibold outline-none focus:border-amber-500"
              disabled={busy}
            />

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={busy || pin.length < 4}
              className="w-full rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 font-semibold transition-colors"
            >
              {busy ? 'Unlocking...' : 'Unlock Workspace'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
