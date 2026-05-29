import { create } from "zustand";
import { useAuthStore } from "./auth.store";
import { useCompanyStore } from "./company.store";
import { dbService } from "@/db/services";
import { useSettingsStore } from "./settings.store";

// Module-level lock — prevents double-invocation in React StrictMode where
// useEffect fires twice in dev. The Zustand state check alone has a TOCTOU
// gap between the read and the set; this flag closes it.
let _initInFlight = false;

/** Exported so resetApp() in auth.store can clear the flag before page reload. */
export function _resetInitFlag(): void {
  _initInFlight = false;
}

/** Maximum time (ms) the startup sequence is allowed to run before we
 *  surface an error to the user instead of hanging on the splash screen.
 *  30s gives first-run DB migration enough headroom on slow hardware. */
const STARTUP_TIMEOUT_MS = 30_000;

/**
 * Minimum time (ms) the splash screen stays visible.
 * The actual startup work usually finishes in ~300–600ms on a warm machine.
 * This floor ensures the user sees the splash long enough to register it,
 * and gives the icon animation time to complete before routing kicks in.
 * At 40%/s the bar needs ~2.4s to travel 0→95% — the store steps push it
 * forward quickly, so in practice it reaches 90%+ well within 2s.
 */
const SPLASH_MIN_DISPLAY_MS = 2_000;

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
    _initInFlight = false; // Allow re-run after error
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
    // Double-guard: Zustand state check + module-level flag.
    // The module flag closes the TOCTOU gap that exists between reading
    // `initialized`/`phase` and setting `phase = "initializing"` — this
    // matters in React StrictMode where effects fire twice in dev.
    if (get().initialized || get().phase === "initializing" || _initInFlight)
      return;
    _initInFlight = true;

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
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during startup.";
      console.error("[Startup] Fatal error:", error);
      set({
        phase: "error",
        error: message,
        message: "Startup failed.",
      });
      _initInFlight = false;
      return;
    } finally {
      if (timeoutId !== null) clearTimeout(timeoutId);
    }
    _initInFlight = false;
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
    set({
      isDbReady: false,
      message: "Database unavailable; using local storage.",
    });
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

  // ── Final validation (dev only) ───────────────────────────────────────────
  if (import.meta.env.DEV) {
    console.group("[Startup] Final State for Routing");
    console.table({
      isSetupDone: useAuthStore.getState().isSetupDone,
      setupCompleted: useSettingsStore.getState().settings.setupCompleted,
      isAuthenticated: useAuthStore.getState().isAuthenticated,
      hasCompany: useCompanyStore.getState().hasCompany,
    });
    console.groupEnd();
  }
  // _runStartupSequence sets phase → "ready" after the min-display timer
}
