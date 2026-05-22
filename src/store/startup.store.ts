import { create } from "zustand";
import { useAuthStore } from "./auth.store";
import { useCompanyStore } from "./company.store";
import { useLockStore } from "./lock.store";
import { dbService } from "@/db/services";
import { useSettingsStore } from "./settings.store";
import { backupService } from "@/services/backup.service";

interface StartupState {
  phase: "idle" | "initializing" | "ready" | "error";
  message: string;
  initialized: boolean;
  isDbReady: boolean;
  isAppReady: boolean;
  isHydrated: boolean;
  isBootstrapped: boolean;
  isRoutingReady: boolean;
  error: string | null;

  initialize: () => Promise<void>;
}

function logStartup(message: string): void {
  if (import.meta.env.DEV) {
    console.info(`[Startup] ${message}`);
  }
}

export const useStartupStore = create<StartupState>()((set, get) => ({
  phase: "idle",
  message: "Preparing application...",
  initialized: false,
  isDbReady: false,
  isAppReady: false,
  isHydrated: false,
  isBootstrapped: false,
  isRoutingReady: false,
  error: null,

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

    let dbReady = false;

    try {
      dbReady = await dbService.init();
      set({
        isDbReady: dbReady,
        message: dbReady
          ? "Database initialized..."
          : "Database unavailable; continuing startup with fallback state.",
      });
      logStartup(`Database init complete: ${dbReady}`);
    } catch (error) {
      set({
        isDbReady: false,
        message: "Database initialization failed; continuing startup.",
      });
      console.warn("[Startup] DB init failed:", error);
    }

    set({ message: "Syncing application state..." });

    // Run independent restoration tasks in parallel
    try {
      await Promise.all([
        (async () => {
          try {
            await useSettingsStore.getState().loadFromDb();
            logStartup("Settings restored from database");
          } catch (e) {
            console.warn("[Startup] Settings load failed:", e);
          }
        })(),
        (async () => {
          try {
            useCompanyStore.getState().bootstrap();
            await useCompanyStore.getState().bootstrapFromDb();
            logStartup("Company state restored from database");
          } catch (e) {
            console.warn("[Startup] Company bootstrap failed:", e);
          }
        })(),
        (async () => {
          try {
            await useAuthStore.getState().initialize();
            logStartup("Authentication restoration complete");
          } catch (e) {
            console.warn("[Startup] Auth initialization failed:", e);
          }
        })(),
        (async () => {
          try {
            await backupService.init();
            logStartup("Backup metadata initialized");
          } catch (e) {
            console.warn("[Startup] Backup service init failed:", e);
          }
        })(),
      ]);
    } catch (error) {
      console.warn("[Startup] Parallel initialization had errors:", error);
    }

    set({ message: "Applying security checks..." });
    try {
      const isAuthenticated = useAuthStore.getState().isAuthenticated;
      await useLockStore.getState().bootstrapForStartup(isAuthenticated);
      logStartup("Lock store bootstrap complete");
    } catch (error) {
      console.warn("[Startup] Lock bootstrap failed:", error);
    }

    if (import.meta.env.DEV) {
      // Artificial delay to prevent UI flashing and allow the user to see the startup sequence
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

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

    logStartup("Startup complete; application is ready");
  },
}));
