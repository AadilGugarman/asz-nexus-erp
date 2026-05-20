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

import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@/config';
import { useAuthStore } from '@/store';

import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute }    from './PublicRoute';
import { PageLoader }     from '@/components/router/PageLoader';

import {
  LazyAppLayout,
  LazyAuthLayout,
  LazyAppShell,
  LazyLoginPage,
  LazySetupPage,
  LazyNotFoundPage,
} from './LazyRoutes';

/** Root redirect — send to /setup on first run, /dashboard otherwise. */
const RootRedirect: React.FC = () => {
  const isSetupDone = useAuthStore((s) => s.isSetupDone);
  const isLoading   = useAuthStore((s) => s.isLoading);

  if (isLoading) return null; // wait for initialize()
  return <Navigate to={isSetupDone ? ROUTES.dashboard : ROUTES.setup} replace />;
};

/** Setup route — only accessible when setup is NOT done yet. */
const SetupRoute: React.FC = () => {
  const isSetupDone = useAuthStore((s) => s.isSetupDone);
  const isLoading   = useAuthStore((s) => s.isLoading);

  if (isLoading) return null;
  if (isSetupDone) return <Navigate to={ROUTES.login} replace />;
  return <LazyAuthLayout />;
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

        {/* ── Protected routes (authenticated only) ──────────────────── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<LazyAppLayout />}>
            <Route path={ROUTES.dashboard} element={<LazyAppShell />} />
            <Route path={ROUTES.arrival}   element={<LazyAppShell />} />
            <Route path={ROUTES.purchase}  element={<LazyAppShell />} />
            <Route path={ROUTES.sales}     element={<LazyAppShell />} />
            <Route path={ROUTES.inventory} element={<LazyAppShell />} />
            <Route path={ROUTES.parties}   element={<LazyAppShell />} />
            <Route path={ROUTES.payments}  element={<LazyAppShell />} />
            <Route path={ROUTES.reports}   element={<LazyAppShell />} />
            <Route path={ROUTES.suppliers} element={<LazyAppShell />} />
            <Route path={ROUTES.customers} element={<LazyAppShell />} />
            <Route path={ROUTES.settings}  element={<LazyAppShell />} />
          </Route>
        </Route>

        {/* ── Utility ────────────────────────────────────────────────── */}
        <Route path={ROUTES.notFound} element={<LazyNotFoundPage />} />
        <Route path={ROUTES.wildcard} element={<Navigate to={ROUTES.notFound} replace />} />
      </Routes>
    </Suspense>
  );
};
