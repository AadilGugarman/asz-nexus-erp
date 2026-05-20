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
import { useAuthStore, useCompanyStore, useLockStore, useStartupStore } from '@/store';
import { StartupScreen } from '@/components/router/StartupScreen';

export const ProtectedRoute: React.FC = () => {
  const startupPhase = useStartupStore((s) => s.phase);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompany = useCompanyStore((s) => s.hasCompany);
  const isLocked = useLockStore((s) => s.isLocked);
  const location        = useLocation();

  if (startupPhase !== 'ready') return <StartupScreen message="Preparing workspace..." />;

  if (!isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.login}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!hasCompany) {
    return <Navigate to={ROUTES.companySetup} replace />;
  }

  if (isLocked) {
    return <Navigate to={ROUTES.lock} replace />;
  }

  return <Outlet />;
};
