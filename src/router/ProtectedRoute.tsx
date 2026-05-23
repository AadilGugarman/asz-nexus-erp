/**
 * router/ProtectedRoute.tsx
 * Guards routes that require authentication.
 *
 * Reads auth state from useAuthStore — no props needed.
 * Shows a full-screen spinner while the auth store is initialising
 * (the initialize() call on app launch).
 */

import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
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

export const ProtectedRoute: React.FC = () => {
  const startupPhase = useStartupStore((s) => s.phase);
  const isSetupDone = useAuthStore((s) => s.isSetupDone);
  const isSetupComplete = useSettingsStore((s) => s.settings.setupCompleted);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompany = useCompanyStore((s) => s.hasCompany);
  const isLocked = useLockStore((s) => s.isLocked);
  const location = useLocation();

  if (startupPhase !== "ready")
    return <StartupScreen message="Preparing workspace..." />;

  const target = decidePostStartupRoute({
    startupReady: true,
    isSetupDone,
    isSetupComplete,
    isAuthenticated,
    hasCompany,
    isLocked,
  });

  // If the target is NOT dashboard, and we are trying to access dashboard, redirect
  if (target && target !== ROUTES.dashboard && location.pathname !== target) {
    return <Navigate to={target} state={{ from: location }} replace />;
  }

  // If we are authenticated and everything is ready, show the module
  return <Outlet />;
};
