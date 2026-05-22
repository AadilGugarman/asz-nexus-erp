/// <reference types="vite/client" />
/**
 * app.config.ts
 * Central application configuration.
 * All environment-specific values live here — never scattered across files.
 */

// Re-export storage keys from centralized location
export { STORAGE_KEYS, LEGACY_KEYS } from "@/lib/storage.constants";

export const APP_CONFIG = {
  name: "TFC ERP",
  version: "1.0.0",

  /** Base URL for external REST API calls (if any).
   *  In a pure Tauri app this may stay empty; axios will still work for
   *  any third-party endpoints (e.g. GST verification, bank APIs). */
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? "",

  /** Request timeout in milliseconds */
  apiTimeout: 15_000,

  /** Tauri environment detection */
  isTauri: typeof window !== "undefined" && "__TAURI__" in window,
} as const;
