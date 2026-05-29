import { create } from "zustand";
import { useSettingsStore } from "./settings.store";
import type { CompanyProfile } from "@/types";

interface CompanyState {
  hasCompany: boolean;
  activeCompanyId: string | null;
  initialized: boolean;

  /** Fast synchronous bootstrap from local cache. */
  bootstrap: () => void;
  /**
   * Async reconciliation — checks SQLite as source of truth.
   * Call after dbService.init() resolves.
   */
  bootstrapFromDb: () => Promise<void>;
  markCompanyCreated: (companyId?: string) => void;
}

function readCompaniesCount(): number {
  try {
    const settings = useSettingsStore.getState();
    return settings.companies.length;
  } catch {
    return 0;
  }
}

export const useCompanyStore = create<CompanyState>()((set, get) => ({
  hasCompany: false,
  activeCompanyId: null,
  initialized: false,

  bootstrap: () => {
    const settings = useSettingsStore.getState();
    const hasCompany =
      readCompaniesCount() > 0 || !!settings.settings.company?.name;
    if (import.meta.env.DEV) {
      console.info("[CompanyStore] bootstrap local state:", {
        hasCompany,
        activeCompanyId: settings.activeCompanyId,
      });
    }
    set({
      hasCompany,
      activeCompanyId:
        settings.activeCompanyId ?? settings.companies[0]?.id ?? null,
      initialized: true,
    });
  },

  bootstrapFromDb: async () => {
    try {
      const { dbService } = await import("@/db/services");
      if (!dbService.isReady) {
        await dbService.init();
      }

      const settingsState = useSettingsStore.getState();

      // Query SQLite for companies
      const persistedCompanies = await dbService.companies.findAll();

      const hasDbCompany = persistedCompanies && persistedCompanies.length > 0;

      if (import.meta.env.DEV) {
        console.info("[CompanyStore] bootstrapFromDb:", {
          hasDbCompany,
          count: persistedCompanies?.length ?? 0,
        });
      }

      if (hasDbCompany) {
        // Prefer the persisted active company from settings store if it exists in DB.
        // Fall back to the first company only if the persisted ID is not found.
        const settingsActiveId = settingsState.activeCompanyId;
        const resolvedActiveId =
          settingsActiveId && persistedCompanies.some((c: { id: string }) => c.id === settingsActiveId)
            ? settingsActiveId
            : persistedCompanies[0].id;
        set({
          hasCompany: true,
          activeCompanyId: resolvedActiveId,
          initialized: true,
        });
      } else {
        // Fallback to settings store if DB is empty
        const hasSettingsCompany =
          settingsState.companies.length > 0 ||
          !!settingsState.settings.company?.name;
        set({
          hasCompany: hasSettingsCompany,
          activeCompanyId: settingsState.activeCompanyId,
          initialized: true,
        });
      }
    } catch (error) {
      console.error("[CompanyStore] bootstrapFromDb failed:", error);
      // Ensure we don't stay in uninitialized state
      set({ initialized: true });
    }
  },

  markCompanyCreated: (companyId?: string) => {
    set({
      hasCompany: true,
      activeCompanyId: companyId ?? get().activeCompanyId,
    });
  },
}));
