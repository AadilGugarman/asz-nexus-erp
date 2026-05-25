/**
 * services/startup.ts
 * Startup orchestrator.
 *
 * Responsibilities:
 *   - afterFirstPaint(): show the Tauri window, schedule idle preloads,
 *     wire production side-effects.
 *   - afterLogin(): run post-authentication tasks (backup service init).
 *
 * The heavy lifting (DB, auth, settings, company) is done by
 * useStartupStore.initialize() which is called from main.tsx before
 * createRoot() so it runs in parallel with React mounting.
 *
 * The window is hidden in tauri.conf.json ("visible": false) and shown
 * here only after the first React paint, eliminating the white-flash.
 */

import { APP_CONFIG } from "@/config";
import { initProductionStartup } from "./production.service";

// ── Timing helpers ────────────────────────────────────────────────────────────

const t0 = performance.now();

function elapsed(): string {
  return `${(performance.now() - t0).toFixed(1)}ms`;
}

function log(msg: string): void {
  if (import.meta.env.DEV) {
    console.info(`[startup ${elapsed()}] ${msg}`);
  }
}

// ── Individual startup tasks ──────────────────────────────────────────────────

/** Show the Tauri window — called after first React paint to avoid white flash. */
async function showWindow(): Promise<void> {
  if (!APP_CONFIG.isTauri) return;
  try {
    // Dynamic import keeps this out of the critical path bundle
    const { getCurrentWindow } = (await import(
      "@tauri-apps/api/window" as never as string
    )) as {
      getCurrentWindow: () => {
        show: () => Promise<void>;
        setFocus: () => Promise<void>;
      };
    };
    const win = getCurrentWindow();
    await win.show();
    await win.setFocus();
    log("window shown");
  } catch (e) {
    // Non-fatal — window may already be visible
    if (import.meta.env.DEV) console.warn("[startup] showWindow failed:", e);
  }
}

/** Preload the most-visited chunk (dashboard) during idle time. */
function schedulePreloads(): void {
  // Fallback for environments without requestIdleCallback (e.g. Safari < 16)
  const idle =
    typeof requestIdleCallback !== "undefined"
      ? requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 1);

  idle(
    () => {
      // Preload dashboard — the first screen after login
      import("@/components/ExecutiveDashboard").catch((err) => {
        if (import.meta.env.DEV)
          console.warn("[startup] Failed to preload ExecutiveDashboard:", err);
      });
      log("dashboard preloaded");
    },
    { timeout: 3000 },
  );

  idle(
    () => {
      // Preload the two most-used billing modules
      void import("@/components/SalesBillingModule").catch((err) => {
        if (import.meta.env.DEV)
          console.warn("[startup] Failed to preload SalesBillingModule:", err);
      });
      void import("@/components/PurchaseBillingModule").catch((err) => {
        if (import.meta.env.DEV)
          console.warn(
            "[startup] Failed to preload PurchaseBillingModule:",
            err,
          );
      });
      log("billing modules preloaded");
    },
    { timeout: 5000 },
  );
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export const startup = {
  /**
   * Called after the user has logged in and the app is fully interactive.
   * Runs post-authentication tasks that should not block the startup sequence.
   */
  async afterLogin(): Promise<void> {
    try {
      const { backupService } = await import("./backup.service");
      await backupService.init();
      log("backup service ready (post-login)");
    } catch (e) {
      // Non-fatal — backup failing should never block the user
      if (import.meta.env.DEV) console.warn("[startup] afterLogin failed:", e);
    }
  },

  /**
   * Called after the first React render completes (requestAnimationFrame in main.tsx).
   * Shows the Tauri window and schedules idle-time chunk preloads.
   */
  afterFirstPaint(): void {
    // Show window on next microtask so React has committed the DOM
    void showWindow();
    schedulePreloads();
    // Wire production side-effects (hydration event, memory trim, etc.)
    initProductionStartup();
    log("first paint complete");
  },
};
