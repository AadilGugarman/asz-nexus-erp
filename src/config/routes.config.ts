/**
 * routes.config.ts
 * Single source of truth for all route paths.
 * Import ROUTES wherever you need to navigate — no magic strings.
 */

export const ROUTES = {
  // ── Root ──────────────────────────────────────────────────────────────────
  root: '/',

  // ── App (protected) ───────────────────────────────────────────────────────
  dashboard: '/dashboard',
  arrival: '/arrival',
  purchase: '/purchase',
  sales: '/sales',
  inventory: '/inventory',
  parties: '/parties',
  payments: '/payments',
  reports: '/reports',
  suppliers: '/suppliers',
  customers: '/customers',
  settings: '/settings',

  // ── Auth (public) ─────────────────────────────────────────────────────────
  login: '/login',
  setup: '/setup',

  // ── Fallback ──────────────────────────────────────────────────────────────
  notFound: '/404',
  wildcard: '*',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

/** All routes that belong to the authenticated app shell */
export const APP_ROUTES = [
  ROUTES.dashboard,
  ROUTES.arrival,
  ROUTES.purchase,
  ROUTES.sales,
  ROUTES.inventory,
  ROUTES.parties,
  ROUTES.payments,
  ROUTES.reports,
  ROUTES.suppliers,
  ROUTES.customers,
  ROUTES.settings,
] as const;

/** All routes accessible without authentication */
export const PUBLIC_ROUTES = [
  ROUTES.login,
  ROUTES.setup,
] as const;
