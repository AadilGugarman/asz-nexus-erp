import { create } from "zustand";
import { useAuthStore } from "./auth.store";
import { useCompanyStore } from "./company.store";
import { useLockStore } from "./lock.store";
import { dbService } from "@/db/services";
import { useSettingsStore } from "./settings.store";
import { backupService } from "@/services/backup.service";
import { toast } from "sonner";

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
      if (dbReady && import.meta.env.DEV) {
        toast.success("Database connection established.");
      }
      set({
        isDbReady: dbReady,
        message: dbReady
          ? "Database connected..."
          : "Database unavailable; using local storage.",
      });
      logStartup(`Database init complete: ${dbReady}`);
    } catch (error) {
      set({
        isDbReady: false,
        message: "Database connection failed.",
      });
      console.warn("[Startup] DB init failed:", error);
    }

    // 1. First, load settings (this is the foundation for everything else)
    set({ message: "Restoring preferences..." });
    try {
      await useSettingsStore.getState().loadFromDb();
      logStartup("Settings restored");
    } catch (e) {
      console.warn("[Startup] Settings load failed:", e);
    }

    // 2. Load Company State (Definitive check)
    set({ message: "Verifying company data..." });
    try {
      // Sync bootstrap from settings store first
      useCompanyStore.getState().bootstrap();
      // Then async reconciliation from SQLite
      await useCompanyStore.getState().bootstrapFromDb();
      logStartup("Company state reconciled");
    } catch (e) {
      console.warn("[Startup] Company bootstrap failed:", e);
    }

    // 3. Auth Restoration
    set({ message: "Checking security session..." });
    try {
      await useAuthStore.getState().initialize();
      logStartup("Authentication checked");
    } catch (e) {
      console.warn("[Startup] Auth initialization failed:", e);
    }

    // 4. Lock Store (depends on auth)
    set({ message: "Applying security policies..." });
    try {
      const isAuthenticated = useAuthStore.getState().isAuthenticated;
      await useLockStore.getState().bootstrapForStartup(isAuthenticated);
      logStartup("Lock store initialized");
    } catch (error) {
      console.warn("[Startup] Lock bootstrap failed:", error);
    }

    // 5. Backup Service
    try {
      await backupService.init();
      logStartup("Backup service ready");
    } catch (e) {
      console.warn("[Startup] Backup service init failed:", e);
    }

    // FINAL VALIDATION: Ensure we have a consistent view of the world
    const finalHasCompany = useCompanyStore.getState().hasCompany;
    const finalSetupComplete =
      useSettingsStore.getState().settings.setupCompleted;
    const finalIsAuthenticated = useAuthStore.getState().isAuthenticated;

    if (import.meta.env.DEV) {
      console.info("[Startup] Final Validation:", {
        finalHasCompany,
        finalSetupComplete,
        finalIsAuthenticated,
        companiesCount: useSettingsStore.getState().companies.length,
      });
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
