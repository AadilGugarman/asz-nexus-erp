/**
 * router/routes.tsx
 * Declarative route tree — wired to the real auth store.
 *
 * Structure:
 *   /                → redirect: setup-not-done → /setup, else → /dashboard
 *   /login           → PublicRoute > AuthLayout > LoginPage
 *   /setup           → SetupRoute  > AuthLayout > SetupPage
 *   /dashboard …     → ProtectedRoute > AppLayout > AppShell
 *   /404             → NotFoundPage
 *   *                → redirect to /404
 */
/**
 * Full startup routing flow:
 *   /   → if !setupDone → /setup
 *       → if !authenticated → /login
 *       → if !hasCompany → /company-setup
 *       → /dashboard
 *
 *   /company-setup → CompanySetupRoute (auth required, no-company guard)
 */

import React, { Suspense } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ROUTES } from "@/config";
import {
  useAuthStore,
  useCompanyStore,
  useLockStore,
  useSettingsStore,
  useStartupStore,
} from "@/store";

import { ProtectedRoute } from "./ProtectedRoute";
import { PublicRoute } from "./PublicRoute";
import { PageLoader } from "@/components/router/PageLoader";
import { StartupScreen } from "@/components/router/StartupScreen";
import { decidePostStartupRoute } from "./routeDecision";

import {
  LazyAppLayout,
  LazyAuthLayout,
  LazyAppShell,
  LazyLoginPage,
  LazySetupPage,
  LazyNotFoundPage,
  LazyCompanySetupPage,
  LazyLockScreenPage,
} from "./LazyRoutes";

/** Root redirect — send to /setup on first run, /dashboard otherwise. */
const RootRedirect: React.FC = () => {
  const startupReady = useStartupStore((s) => s.phase === "ready");
  const isSetupDone = useAuthStore((s) => s.isSetupDone);
  const isSetupComplete = useSettingsStore((s) => s.settings.setupCompleted);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompany = useCompanyStore((s) => s.hasCompany);
  const isLocked = useLockStore((s) => s.isLocked);

  if (!startupReady)
    return <StartupScreen message="Preparing application..." />;

  const target = decidePostStartupRoute({
    startupReady,
    isSetupDone,
    isSetupComplete,
    isAuthenticated,
    hasCompany,
    isLocked,
  });

  return <Navigate to={target ?? ROUTES.login} replace />;
};

/** Setup route — only accessible when setup is NOT done yet. */
const SetupRoute: React.FC = () => {
  const startupReady = useStartupStore((s) => s.phase === "ready");
  const isSetupDone = useAuthStore((s) => s.isSetupDone);
  const isSetupComplete = useSettingsStore((s) => s.settings.setupCompleted);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompany = useCompanyStore((s) => s.hasCompany);
  const isLocked = useLockStore((s) => s.isLocked);

  if (!startupReady)
    return <StartupScreen message="Checking setup status..." />;

  // If password setup is already done, we shouldn't be here.
  // Unless we are moving to company onboarding.
  if (isSetupDone) {
    const target = decidePostStartupRoute({
      startupReady,
      isSetupDone,
      isSetupComplete,
      isAuthenticated,
      hasCompany,
      isLocked,
    });

    if (target && target !== ROUTES.setup) {
      return <Navigate to={target} replace />;
    }
  }
  return <LazyAuthLayout />;
};

/** Company-setup route — must be authenticated, must NOT have a company yet. */
const CompanySetupRoute: React.FC = () => {
  const startupReady = useStartupStore((s) => s.phase === "ready");
  const isSetupDone = useAuthStore((s) => s.isSetupDone);
  const isSetupComplete = useSettingsStore((s) => s.settings.setupCompleted);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompany = useCompanyStore((s) => s.hasCompany);
  const isLocked = useLockStore((s) => s.isLocked);

  if (!startupReady)
    return <StartupScreen message="Checking onboarding status..." />;

  const target = decidePostStartupRoute({
    startupReady,
    isSetupDone,
    isSetupComplete,
    isAuthenticated,
    hasCompany,
    isLocked,
  });

  if (target && target !== ROUTES.companySetup) {
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
};

const LockRoute: React.FC = () => {
  const startupReady = useStartupStore((s) => s.phase === "ready");
  const isSetupDone = useAuthStore((s) => s.isSetupDone);
  const isSetupComplete = useSettingsStore((s) => s.settings.setupCompleted);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompany = useCompanyStore((s) => s.hasCompany);
  const isLocked = useLockStore((s) => s.isLocked);

  if (!startupReady)
    return <StartupScreen message="Applying security policies..." />;

  const target = decidePostStartupRoute({
    startupReady,
    isSetupDone,
    isSetupComplete,
    isAuthenticated,
    hasCompany,
    isLocked,
  });

  if (target && target !== ROUTES.lock) {
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Root redirect ──────────────────────────────────────────── */}
        <Route path={ROUTES.root} element={<RootRedirect />} />

        {/* ── Setup (first-run only) ─────────────────────────────────── */}
        <Route element={<SetupRoute />}>
          <Route path={ROUTES.setup} element={<LazySetupPage />} />
        </Route>

        {/* ── Public routes (unauthenticated only) ───────────────────── */}
        <Route element={<PublicRoute />}>
          <Route element={<LazyAuthLayout />}>
            <Route path={ROUTES.login} element={<LazyLoginPage />} />
          </Route>
        </Route>

        {/* ── Company setup (authenticated, no-company guard) ─────────── */}
        <Route element={<CompanySetupRoute />}>
          <Route
            path={ROUTES.companySetup}
            element={<LazyCompanySetupPage />}
          />
        </Route>

        {/* ── Lock screen (authenticated + company + locked) ───────────── */}
        <Route element={<LockRoute />}>
          <Route path={ROUTES.lock} element={<LazyLockScreenPage />} />
        </Route>

        {/* ── Protected routes (authenticated only) ──────────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<LazyAppLayout />}>
            <Route path={ROUTES.dashboard} element={<LazyAppShell />} />
            <Route path={ROUTES.arrival} element={<LazyAppShell />} />
            <Route path={ROUTES.purchase} element={<LazyAppShell />} />
            <Route path={ROUTES.sales} element={<LazyAppShell />} />
            <Route path={ROUTES.inventory} element={<LazyAppShell />} />
            <Route path={ROUTES.parties} element={<LazyAppShell />} />
            <Route path={ROUTES.payments} element={<LazyAppShell />} />
            <Route path={ROUTES.reports} element={<LazyAppShell />} />
            <Route path={ROUTES.suppliers} element={<LazyAppShell />} />
            <Route path={ROUTES.customers} element={<LazyAppShell />} />
            <Route path={ROUTES.settings} element={<LazyAppShell />} />
          </Route>
        </Route>

        {/* ── Utility ────────────────────────────────────────────────── */}
        <Route path={ROUTES.notFound} element={<LazyNotFoundPage />} />
        <Route
          path={ROUTES.wildcard}
          element={<Navigate to={ROUTES.notFound} replace />}
        />
      </Routes>
    </Suspense>
  );
};
