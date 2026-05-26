/**
 * main.tsx — application entry point.
 *
 * Startup sequence:
 *  1. Inline <script> in index.html applies theme/font before this runs
 *  2. runStorageMigration()          — migrate legacy localStorage keys
 *  3. initAppearanceSystem() etc.    — apply persisted preferences
 *  4. useStartupStore.initialize()   — DB + auth + settings warm-up (non-blocking)
 *  5. createRoot() / render()        — mount React
 *  6. requestAnimationFrame callback — fade out HTML loader, show Tauri window,
 *                                      schedule idle-time chunk preloads
 *
 * StrictMode is enabled in dev (double-renders catch side-effect bugs) and
 * disabled in production (halves the number of renders on mount).
 */

import "./index.css";

import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App";
import { startup } from "./services/startup";
import { perf } from "./lib/perf";
import { runStorageMigration, purgeBusinessDataFromLocalStorage } from "./lib/storage.migration";
import { initAppearanceSystem } from "./store/appearance.store";
import { useStartupStore } from "./store/startup.store";
import {
  applyDesktopLanguagePreference,
  initI18n,
  initI18nLanguageSync,
} from "./i18n";

perf.mark("script-start");

// Migrate storage from apex_* to tfc_erp_* namespace before any other initialization
const migrationStats = runStorageMigration();
if (import.meta.env.DEV) console.info("[Init] Storage migration:", migrationStats);

// In Tauri/production: purge any business data that was previously written to
// localStorage. Business data lives exclusively in SQLite — localStorage is
// only used for UI preferences and the startup config cache.
if (typeof window !== "undefined" && "__TAURI__" in window) {
  purgeBusinessDataFromLocalStorage();
}

// Apply persisted/system appearance settings before first render.
initAppearanceSystem();
initI18n();
initI18nLanguageSync();
void applyDesktopLanguagePreference();

// Launch background tasks immediately — they run while React is mounting
void useStartupStore.getState().initialize();

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

const app = import.meta.env.DEV ? (
  <StrictMode>
    <App />
  </StrictMode>
) : (
  <App />
);

perf.mark("before-render");

createRoot(root).render(app);

// After React commits the first frame, show the window and schedule preloads
requestAnimationFrame(() => {
  // Remove the initial HTML loader — fade it out over 500ms
  const loader = document.getElementById("initial-loader");
  if (loader) {
    loader.style.transition = "opacity 0.5s ease-out";
    loader.style.opacity = "0";
    setTimeout(() => loader.remove(), 500);
  }

  // Show the window immediately on the first paint
  startup.afterFirstPaint();
  perf.mark("after-first-paint");
});
