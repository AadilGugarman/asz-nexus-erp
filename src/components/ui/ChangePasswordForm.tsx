/**
 * components/ui/ChangePasswordForm.tsx
 * Reusable change-password form — drop into any settings page.
 *
 * Usage:
 *   <ChangePasswordForm onSuccess={() => toast.success('Password updated')} />
 */

import React, { useState } from 'react';
import { useAuth } from '@/hooks';

interface Props {
  onSuccess?: () => void;
  onCancel?:  () => void;
}

export const ChangePasswordForm: React.FC<Props> = ({ onSuccess, onCancel }) => {
  const { changePassword, isLoading, error, clearError } = useAuth();

  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [localErr, setLocalErr] = useState('');
  const [success,  setSuccess]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalErr('');
    clearError();

    if (next.length < 4) {
      setLocalErr('New password must be at least 4 characters.');
      return;
    }
    if (next !== confirm) {
      setLocalErr('New passwords do not match.');
      return;
    }

    try {
      await changePassword({ current_password: current, new_password: next });
      setSuccess(true);
      onSuccess?.();
    } catch {
      // error in store
    }
  };

  const displayError = localErr || error;

  if (success) {
    return (
      <div className="text-center py-4 space-y-2">
        <p className="text-emerald-400 font-medium">Password changed successfully.</p>
        <p className="text-slate-500 text-sm">Please log in again with your new password.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-300">Current Password</label>
        <input
          type="password"
          value={current}
          onChange={(e) => { setCurrent(e.target.value); setLocalErr(''); clearError(); }}
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          autoComplete="current-password"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-300">New Password</label>
        <input
          type="password"
          value={next}
          onChange={(e) => { setNext(e.target.value); setLocalErr(''); clearError(); }}
          placeholder="Min. 4 characters"
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          autoComplete="new-password"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-300">Confirm New Password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => { setConfirm(e.target.value); setLocalErr(''); clearError(); }}
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          autoComplete="new-password"
          disabled={isLoading}
        />
      </div>

      {displayError && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          {displayError}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={isLoading || !current || !next || !confirm}
          className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Updating…
            </span>
          ) : 'Update Password'}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};
