/**
 * router/PublicRoute.tsx
 * Guards routes that should NOT be accessible once authenticated.
 * (e.g. /login — redirect already-logged-in users to the dashboard)
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '@/config';
import { useAuthStore, useCompanyStore, useLockStore, useStartupStore } from '@/store';
import { StartupScreen } from '@/components/router/StartupScreen';
import { decidePostStartupRoute } from './routeDecision';

export const PublicRoute: React.FC = () => {
  const startupReady = useStartupStore((s) => s.phase === 'ready');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isSetupDone = useAuthStore((s) => s.isSetupDone);
  const hasCompany = useCompanyStore((s) => s.hasCompany);
  const isLocked = useLockStore((s) => s.isLocked);

  if (!startupReady) return <StartupScreen message="Initializing startup flow..." />;

  if (isAuthenticated) {
    const target = decidePostStartupRoute({
      startupReady,
      isSetupDone,
      isAuthenticated,
      hasCompany,
      isLocked,
    });
    return <Navigate to={target ?? ROUTES.dashboard} replace />;
  }

  return <Outlet />;
};