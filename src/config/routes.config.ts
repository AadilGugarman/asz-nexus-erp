/**
 * routes.config.ts
 * Single source of truth for all route paths.
 * Import ROUTES wherever you need to navigate — no magic strings.
 */

export const ROUTES = {
  // ── Root ──────────────────────────────────────────────────────────────────
  root: "/",

  // ── App (protected) ───────────────────────────────────────────────────────
  dashboard: "/dashboard",
  arrival: "/arrival",
  purchase: "/purchase",
  sales: "/sales",
  inventory: "/inventory",
  parties: "/parties",
  payments: "/payments",
  reports: "/reports",
  suppliers: "/suppliers",
  customers: "/customers",
  settings: "/settings",

  carets: "/carets",

  // ── Auth (public) ─────────────────────────────────────────────────────────
  login: "/login",
  setup: "/setup",
  lock: "/lock",

  // ── Onboarding (authenticated, no-company guard) ──────────────────────────
  companySetup: "/company-setup",

  // ── Fallback ──────────────────────────────────────────────────────────────
  notFound: "/404",
  wildcard: "*",
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
  ROUTES.carets,
  ROUTES.settings,
] as const;

/** All routes accessible without authentication */
export const PUBLIC_ROUTES = [ROUTES.login, ROUTES.setup] as const;

export function makeSettingsRoute(options?: {
  section?:
    | "COMPANIES"
    | "FINANCIAL"
    | "INVOICE"
    | "MASTERS"
    | "BACKUP"
    | "APPEARANCE"
    | "SECURITY";
  action?: "create" | "edit";
  companyId?: string;
}) {
  const params = new URLSearchParams();
  if (options?.section) {
    params.set("section", options.section.toLowerCase());
  }
  if (options?.action) {
    params.set("action", options.action);
  }
  if (options?.companyId) {
    params.set("companyId", options.companyId);
  }
  const query = params.toString();
  return query ? `${ROUTES.settings}?${query}` : ROUTES.settings;
}
