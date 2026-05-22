/**
 * services/startup.ts
 * Parallel startup orchestrator.
 *
 * Runs non-blocking startup tasks (DB warm-up, window show, chunk preloads)
 * so the app is interactive as fast as possible.
 *
 * Usage (called once from main.tsx before rendering):
 *   await startup.run();
 *
 * The window is hidden in tauri.conf.json ("visible": false) and shown here
 * only after the first React paint, eliminating the white-flash on startup.
 */

import { APP_CONFIG } from "@/config";
import { useProductionStartup } from "./production.service";

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
  if (typeof requestIdleCallback === "undefined") return;

  requestIdleCallback(
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

  requestIdleCallback(
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
   * Run all startup tasks in parallel.
   * Call this before ReactDOM.createRoot() so tasks start immediately.
   */
  async run(): Promise<void> {
    log("starting");
    log("parallel tasks launched");
  },

  /**
   * Called after the user has logged in and the app is fully interactive.
   * Backup init is deferred until here so the pool is ready.
   */
  async afterLogin(): Promise<void> {
    try {
      const { backupService } = await import("./backup.service");
      await backupService.init();
    } catch (e) {
      if (import.meta.env.DEV) console.warn("[startup] afterLogin failed:", e);
    }
    log("post-login tasks launched");
  },

  /**
   * Called after the first React render completes.
   * Shows the window and schedules idle-time preloads.
   */
  afterFirstPaint(): void {
    // Show window on next microtask so React has committed the DOM
    void showWindow();
    schedulePreloads();
    useProductionStartup();
    log("first paint complete");
  },
};
