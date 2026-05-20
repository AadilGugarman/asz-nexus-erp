/**
 * router/LazyRoutes.ts
 * Central registry of all lazy-loaded route components.
 *
 * Rules:
 * - Every page that is route-level goes here.
 * - Use named re-exports so tree-shaking works correctly.
 * - Never import these directly in components — use them only in routes.tsx.
 */

import { lazy } from 'react';

// ── Layouts ──────────────────────────────────────────────────────────────────
export const LazyAppLayout = lazy(() =>
  import('@/layouts/AppLayout').then((m) => ({ default: m.AppLayout })),
);

export const LazyAuthLayout = lazy(() =>
  import('@/layouts/AuthLayout').then((m) => ({ default: m.AuthLayout })),
);

// ── App pages (protected) ────────────────────────────────────────────────────
// AppShell renders all existing module tabs — one lazy chunk for the whole app.
export const LazyAppShell = lazy(() =>
  import('@/app/AppShell').then((m) => ({ default: m.AppShell })),
);

// ── Auth pages (public) ──────────────────────────────────────────────────────
export const LazyLoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);

export const LazySetupPage = lazy(() =>
  import('@/pages/auth/SetupPage').then((m) => ({ default: m.SetupPage })),
);

// ── Utility pages ────────────────────────────────────────────────────────────
export const LazyNotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

// ── Onboarding pages (authenticated) ────────────────────────────────────────
export const LazyCompanySetupPage = lazy(() =>
  import('@/pages/CompanySetupPage').then((m) => ({ default: m.CompanySetupPage })),
);

export const LazyLockScreenPage = lazy(() =>
  import('@/pages/LockScreenPage').then((m) => ({ default: m.LockScreenPage })),
);
