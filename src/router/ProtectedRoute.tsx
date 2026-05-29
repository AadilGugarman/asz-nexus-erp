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
import { ROUTES, APP_ROUTES } from "@/config";
import {
  useAuthStore,
  useCompanyStore,
  useSettingsStore,
  useStartupStore,
} from "@/store";
import { StartupScreen } from "@/components/router/StartupScreen";
import { decidePostStartupRoute } from "./routeDecision";

export const ProtectedRoute: React.FC = () => {
  const startupPhase = useStartupStore((s) => s.phase);
  const uiReady = useStartupStore((s) => s.uiReady);
  const isSetupDone = useAuthStore((s) => s.isSetupDone);
  const isSetupComplete = useSettingsStore((s) => s.settings.setupCompleted);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompany = useCompanyStore((s) => s.hasCompany);
  const location = useLocation();

  if (startupPhase === "error") return <StartupScreen />;
  // Block routing until bar animation completes
  if (!uiReady) return <StartupScreen />;

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />;
  }

  // Only redirect if the decision points somewhere other than the current page.
  // This prevents redirect loops when the user is already on the correct route.
  const target = decidePostStartupRoute({
    startupReady: true,
    isSetupDone,
    isSetupComplete,
    isAuthenticated,
    hasCompany,
    isLocked: false,
  });

  // Only redirect if target is a non-app route (login, setup, company-setup, lock).
  // If target is an app route, the user is already in the right place.
  if (target && !(APP_ROUTES as readonly string[]).includes(target)) {
    return <Navigate to={target} state={{ from: location }} replace />;
  }

  return <Outlet />;
};
