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
      if (!dbService.isReady) return;

      const settingsState = useSettingsStore.getState();
      let hasDbCompany =
        settingsState.companies.length > 0 ||
       !!settingsState.settings.company?.name;
      let persistedCompanies: CompanyProfile[] | undefined;
      let activeCompanyId = settingsState.activeCompanyId;

      if (!hasDbCompany) {
        persistedCompanies =
          await dbService.settings.get<CompanyProfile[]>("companies");
        if (
          Array.isArray(persistedCompanies) &&
          persistedCompanies.length > 0
        ) {
          hasDbCompany = true;
        }
      }

      if (!hasDbCompany) {
        const appSettings = await dbService.settings.get<{
          company?: { name?: string };
        }>("app_settings");
        hasDbCompany = !!appSettings?.company?.name;
      }

      if (hasDbCompany) {
        if (persistedCompanies && persistedCompanies.length > 0) {
          useSettingsStore.setState({ companies: persistedCompanies });
          activeCompanyId =
            activeCompanyId ?? persistedCompanies[0]?.id ?? null;
        }

        const computedActiveCompanyId =
          activeCompanyId ??
          settingsState.companies[0]?.id ??
          get().activeCompanyId ??
          null;

        if (import.meta.env.DEV) {
          console.info("[CompanyStore] bootstrapFromDb detected DB company", {
            computedActiveCompanyId,
            persistedCompaniesCount: persistedCompanies?.length ?? 0,
          });
        }

        set({
          hasCompany: true,
          activeCompanyId: computedActiveCompanyId,
        });
      }
    } catch (error) {
      if (import.meta.env.DEV)
        console.warn("[CompanyStore] bootstrapFromDb failed:", error);
    } finally {
      set({ initialized: true });
    }
  },

  markCompanyCreated: (companyId) => {
    const activeCompanyId =
      companyId ??
      useSettingsStore.getState().activeCompanyId ??
      get().activeCompanyId;
    set({
      hasCompany: true,
      activeCompanyId,
      initialized: true,
    });
  },
}));
