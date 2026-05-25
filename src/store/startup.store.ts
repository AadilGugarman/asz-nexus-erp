import { create } from "zustand";
import { useAuthStore } from "./auth.store";
import { useCompanyStore } from "./company.store";
import { useLockStore } from "./lock.store";
import { dbService } from "@/db/services";
import { useSettingsStore } from "./settings.store";

/** Maximum time (ms) the startup sequence is allowed to run before we
 *  surface an error to the user instead of hanging on the splash screen. */
const STARTUP_TIMEOUT_MS = 15_000;

/**
 * Minimum time (ms) the splash screen stays visible.
 * The actual startup work usually finishes in ~300–600ms on a warm machine.
 * This floor ensures the user sees the splash long enough to register it,
 * and gives the icon animation time to complete before routing kicks in.
 * At minimum 4%/s the bar needs ~24s to travel 0→95% — but the store steps
 * push it forward quickly, so in practice it reaches 90%+ well within 2.8s.
 */
const SPLASH_MIN_DISPLAY_MS = 2_800;

interface StartupState {
  phase: "idle" | "initializing" | "ready" | "error";
  /**
   * uiReady — separate from phase.
   * phase = "ready" means real work is done.
   * uiReady = true means the splash animation has completed and routing is allowed.
   * Route guards check uiReady, not phase, so the bar always finishes visually.
   */
  uiReady: boolean;
  message: string;
  initialized: boolean;
  isDbReady: boolean;
  isAppReady: boolean;
  isHydrated: boolean;
  isBootstrapped: boolean;
  isRoutingReady: boolean;
  error: string | null;

  initialize: () => Promise<void>;
  retry: () => Promise<void>;
  /** Called by StartupScreen once the bar animation reaches 100% */
  signalUiReady: () => void;
}

function logStartup(message: string): void {
  if (import.meta.env.DEV) {
    console.info(`[Startup] ${message}`);
  }
}

export const useStartupStore = create<StartupState>()((set, get) => ({
  phase: "idle",
  uiReady: false,
  message: "Preparing application...",
  initialized: false,
  isDbReady: false,
  isAppReady: false,
  isHydrated: false,
  isBootstrapped: false,
  isRoutingReady: false,
  error: null,

  signalUiReady: () => {
    if (!get().uiReady) set({ uiReady: true });
  },

  retry: async () => {
    set({
      phase: "idle",
      uiReady: false,
      initialized: false,
      error: null,
      isDbReady: false,
      isAppReady: false,
      isHydrated: false,
      isBootstrapped: false,
      isRoutingReady: false,
    });
    await get().initialize();
  },

  initialize: async () => {
    if (get().initialized || get().phase === "initializing") return;

    set({
      phase: "initializing",
      message: "Initializing database...",
      error: null,
      isDbReady: false,
      isAppReady: false,
      isHydrated: false,
      isBootstrapped: false,
      isRoutingReady: false,
    });

    logStartup("Startup sequence beginning");

    // ── Timeout watchdog ────────────────────────────────────────────────────
    // If the sequence hangs (e.g. DB never resolves), surface an error so the
    // user is not stuck on the splash screen forever.
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new Error(
            `Startup timed out after ${STARTUP_TIMEOUT_MS / 1000}s. ` +
              "The database may be locked or the app data directory is unavailable.",
          ),
        );
      }, STARTUP_TIMEOUT_MS);
    });

    try {
      await Promise.race([_runStartupSequence(set), timeoutPromise]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred during startup.";
      console.error("[Startup] Fatal error:", error);
      set({
        phase: "error",
        error: message,
        message: "Startup failed.",
      });
      return;
    } finally {
      if (timeoutId !== null) clearTimeout(timeoutId);
    }
  },
}));

// ── Private startup sequence ──────────────────────────────────────────────────

type SetFn = (
  partial:
    | Partial<StartupState>
    | ((state: StartupState) => Partial<StartupState>),
) => void;

async function _runStartupSequence(set: SetFn): Promise<void> {
  // Run the real work AND a minimum-display timer in parallel.
  // The splash stays visible until both resolve — whichever takes longer.
  const minDisplayTimer = new Promise<void>((resolve) =>
    setTimeout(resolve, SPLASH_MIN_DISPLAY_MS),
  );

  await Promise.all([_doStartupWork(set), minDisplayTimer]);

  set({
    phase: "ready",
    initialized: true,
    isAppReady: true,
    isHydrated: true,
    isBootstrapped: true,
    isRoutingReady: true,
    message: "Ready",
    error: null,
  });

  logStartup("Startup complete; application is ready");
}

async function _doStartupWork(set: SetFn): Promise<void> {
  // ── Step 0: Database ──────────────────────────────────────────────────────
  let dbReady = false;
  try {
    dbReady = await dbService.init();
    set({
      isDbReady: dbReady,
      message: dbReady
        ? "Database connected..."
        : "Database unavailable; using local storage.",
    });
    logStartup(`Database init complete: ${dbReady}`);
  } catch (error) {
    // DB failure is non-fatal — app can still run from localStorage cache
    set({ isDbReady: false, message: "Database unavailable; using local storage." });
    console.warn("[Startup] DB init failed:", error);
  }

  // ── Step 1: Settings (foundation for everything else) ─────────────────────
  set({ message: "Restoring preferences..." });
  try {
    await useSettingsStore.getState().loadFromDb();
    logStartup("Settings restored");
  } catch (e) {
    console.warn("[Startup] Settings load failed:", e);
  }

  // ── Step 2: Company state ─────────────────────────────────────────────────
  set({ message: "Verifying company data..." });
  try {
    useCompanyStore.getState().bootstrap();
    await useCompanyStore.getState().bootstrapFromDb();
    logStartup("Company state reconciled");
  } catch (e) {
    console.warn("[Startup] Company bootstrap failed:", e);
  }

  // ── Step 3: Auth restoration ──────────────────────────────────────────────
  set({ message: "Checking security session..." });
  try {
    await useAuthStore.getState().initialize();
    logStartup("Authentication checked");
  } catch (e) {
    console.warn("[Startup] Auth initialization failed:", e);
  }

  // ── Step 4: Lock store (depends on auth) ──────────────────────────────────
  set({ message: "Applying security policies..." });
  try {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    await useLockStore.getState().bootstrapForStartup(isAuthenticated);
    logStartup("Lock store initialized");
  } catch (error) {
    console.warn("[Startup] Lock bootstrap failed:", error);
  }

  // ── Final validation (dev only) ───────────────────────────────────────────
  if (import.meta.env.DEV) {
    console.group("[Startup] Final State for Routing");
    console.table({
      isSetupDone: useAuthStore.getState().isSetupDone,
      setupCompleted: useSettingsStore.getState().settings.setupCompleted,
      isAuthenticated: useAuthStore.getState().isAuthenticated,
      hasCompany: useCompanyStore.getState().hasCompany,
      isLocked: useLockStore.getState().isLocked,
    });
    console.groupEnd();
  }
  // _runStartupSequence sets phase → "ready" after the min-display timer
}