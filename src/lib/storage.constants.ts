/**
 * lib/storage.constants.ts
 * Centralized localStorage key management with `tfc_erp_` namespace.
 *
 * Benefits:
 *   - Single source of truth for all storage keys
 *   - Prevents hardcoded key strings scattered across files
 *   - Simplifies future key migrations
 *   - Type-safe key references
 *   - Easy to track all persisted state
 */

// ── New namespace prefix (production-ready) ───────────────────────────────────
const NS = "tfc_erp_" as const;

// ── All application storage keys (centralized) ────────────────────────────────
export const STORAGE_KEYS = {
  // Appearance & Theme
  appearance: `${NS}appearance` as const,
  theme: `${NS}theme` as const,
  language: `${NS}language` as const,
  fontSize: `${NS}font_size` as const,
  fontFamily: `${NS}font_family` as const,
  density: `${NS}density` as const,
  accentColor: `${NS}accent_color` as const,
  lowStockAlerts: `${NS}low_stock_alerts` as const,
  animationsEnabled: `${NS}animations_enabled` as const,

  // Settings & Company
  settings: `${NS}settings` as const,
  companies: `${NS}companies` as const,
  activeCompany: `${NS}active_company` as const,
  activeFY: `${NS}active_fy` as const,

  // Setup & Onboarding
  setupDone: `${NS}setup_done` as const,
  onboardingDraft: `${NS}onboarding_draft` as const,

  // Security & Auth
  lockState: `${NS}lock_state` as const,
  securityPrefs: `${NS}security_prefs` as const,
  refreshToken: `${NS}refresh_token` as const,
  refreshTokenExpiry: `${NS}refresh_token_expiry` as const,

  // Business Data (temporary — flagged for SQLite migration)
  fruits: `${NS}fruits` as const,
  suppliers: `${NS}suppliers` as const,
  customers: `${NS}customers` as const,
  vehicles: `${NS}vehicles` as const,
  invoices: `${NS}invoices` as const,
  purchaseInvoices: `${NS}purchase_invoices` as const,
  payments: `${NS}payments` as const,

  // UI State
  backupStore: `${NS}backup_store` as const,
} as const;

// ── Legacy namespace keys (for migration) ─────────────────────────────────────
export const LEGACY_KEYS = {
  // Appearance
  theme: "apex_theme",
  appearance: "apex_appearance",
  fontSize: "apex_fontsize",
  density: "apex_compact",
  accentColor: "apex_accent",
  language: "apex_lang",
  lowStockAlerts: "apex_lowstock",
  animationsEnabled: "apex_anims",

  // Settings & Company
  settings: "apex_settings",
  companies: "apex_companies",
  activeCompany: "apex_active_company",
  activeFY: "apex_active_fy",

  // Setup
  setupDone: "apex_setup_done",
  onboardingDraft: "apex_onboarding_company_setup_draft_v1",

  // Security
  lockState: "apex_lock_state_v1",
  securityPrefs: "apex_security_prefs",
  refreshToken: "apex_refresh_token", // hypothetical — verify actual key
  refreshTokenExpiry: "apex_refresh_token_expiry", // hypothetical — verify actual key

  // Business Data
  fruits: "apex_fruits",
  suppliers: "apex_suppliers",
  customers: "apex_customers",
  vehicles: "apex_vehicles",
  invoices: "apex_invoices",
  purchaseInvoices: "apex_purchase_invoices",
  payments: "apex_payments",
} as const;

// ── Type exports for key usage ────────────────────────────────────────────────
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
export type LegacyKey = (typeof LEGACY_KEYS)[keyof typeof LEGACY_KEYS];
