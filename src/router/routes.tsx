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
} from "./LazyRoutes";

/** Root redirect — send to /setup on first run, /dashboard otherwise. */
const RootRedirect: React.FC = () => {
  const startupPhase = useStartupStore((s) => s.phase);
  const uiReady = useStartupStore((s) => s.uiReady);
  const isSetupDone = useAuthStore((s) => s.isSetupDone);
  const isSetupComplete = useSettingsStore((s) => s.settings.setupCompleted);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompany = useCompanyStore((s) => s.hasCompany);

  if (startupPhase === "error") return <StartupScreen />;
  // Wait for both real work AND bar animation to complete
  if (!uiReady) return <StartupScreen />;

  const target = decidePostStartupRoute({
    startupReady: true,
    isSetupDone,
    isSetupComplete,
    isAuthenticated,
    hasCompany,
  });

  return <Navigate to={target ?? ROUTES.login} replace />;
};

/** Setup route — only accessible when setup is NOT done yet. */
const SetupRoute: React.FC = () => {
  const startupPhase = useStartupStore((s) => s.phase);
  const uiReady = useStartupStore((s) => s.uiReady);
  const isSetupDone = useAuthStore((s) => s.isSetupDone);
  const isSetupComplete = useSettingsStore((s) => s.settings.setupCompleted);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompany = useCompanyStore((s) => s.hasCompany);

  if (startupPhase === "error") return <StartupScreen />;
  if (!uiReady) return <StartupScreen />;

  if (isSetupDone) {
    const target = decidePostStartupRoute({
      startupReady: true,
      isSetupDone,
      isSetupComplete,
      isAuthenticated,
      hasCompany,
    });
    if (target && target !== ROUTES.setup)
      return <Navigate to={target} replace />;
  }
  return <LazyAuthLayout />;
};

/** Company-setup route — must be authenticated, must NOT have a company yet.
 *  Once the wizard completes and hasCompany becomes true, the page itself
 *  navigates to /dashboard. This guard only blocks entry from outside. */
const CompanySetupRoute: React.FC = () => {
  const startupPhase = useStartupStore((s) => s.phase);
  const uiReady = useStartupStore((s) => s.uiReady);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasCompany = useCompanyStore((s) => s.hasCompany);
  const isSetupDone = useAuthStore((s) => s.isSetupDone);
  const isSetupComplete = useSettingsStore((s) => s.settings.setupCompleted);

  if (startupPhase === "error") return <StartupScreen />;
  if (!uiReady) return <StartupScreen />;

  // Not authenticated at all — go to login
  if (!isAuthenticated) return <Navigate to={ROUTES.login} replace />;

  // Not set up — go to setup
  if (!isSetupDone) return <Navigate to={ROUTES.setup} replace />;

  // Already has a company — go to dashboard (but only on initial entry,
  // not while the wizard is completing — the page handles that itself).
  // We use isSetupComplete as the signal: if setup is already complete AND
  // hasCompany is true, this is a stale navigation, redirect away.
  if (hasCompany && isSetupComplete)
    return <Navigate to={ROUTES.dashboard} replace />;

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
            <Route path={ROUTES.carets} element={<LazyAppShell />} />
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
