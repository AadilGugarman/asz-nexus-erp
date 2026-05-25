/**
 * router/PublicRoute.tsx
 * Guards routes that should NOT be accessible once authenticated.
 * (e.g. /login — redirect already-logged-in users to the dashboard)
 */

import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { ROUTES } from "@/config";
import {
  useAuthStore,
  useCompanyStore,
  useLockStore,
  useSettingsStore,
  useStartupStore,
} from "@/store";
import { StartupScreen } from "@/components/router/StartupScreen";
import { decidePostStartupRoute } from "./routeDecision";

export const PublicRoute: React.FC = () => {
  const uiReady        = useStartupStore((s) => s.uiReady);
  const startupPhase   = useStartupStore((s) => s.phase);
  const settingsLoaded = useSettingsStore((s) => s.isLoaded);
  const companyReady   = useCompanyStore((s) => s.initialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isSetupDone    = useAuthStore((s) => s.isSetupDone);
  const isSetupComplete = useSettingsStore((s) => s.settings.setupCompleted);
  const hasCompany     = useCompanyStore((s) => s.hasCompany);
  const isLocked       = useLockStore((s) => s.isLocked);

  if (startupPhase === 'error') return <StartupScreen />;
  if (!uiReady || !settingsLoaded || !companyReady) return <StartupScreen />;

  if (isAuthenticated) {
    const target = decidePostStartupRoute({
      startupReady: true,
      isSetupDone,
      isSetupComplete,
      isAuthenticated,
      hasCompany,
      isLocked,
    });
    return <Navigate to={target ?? ROUTES.dashboard} replace />;
  }

  return <Outlet />;
};
