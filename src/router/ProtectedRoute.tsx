/**
 * router/ProtectedRoute.tsx
 * Guards routes that require authentication.
 *
 * Reads auth state from useAuthStore — no props needed.
 * Shows a full-screen spinner while the auth store is initialising
 * (the initialize() call on app launch).
 */

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '@/config';
import { useAuthStore } from '@/store';

export const ProtectedRoute: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading       = useAuthStore((s) => s.isLoading);
  const location        = useLocation();

  // Still initialising — don't redirect yet
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.login}
        state={{ from: location }}
        replace
      />
    );
  }

  return <Outlet />;
};
