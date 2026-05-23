import { create } from "zustand";
import { useSettingsStore } from "./settings.store";
import { STORAGE_KEYS } from "@/config";
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

      // 1. Direct query to SQLite as source of truth
      const [persistedCompanies, dbSettings, rawCheck] = await Promise.all([
        dbService.settings.get<CompanyProfile[]>(STORAGE_KEYS.companies),
        dbService.settings.get<{ company?: { name?: string } }>(STORAGE_KEYS.settings),
        // Raw SQL check as a failsafe to confirm table has data
        (async () => {
          try {
             const { getDb } = await import("@/db/client");
             const db = await getDb();
             // Check if app_settings table has any records related to companies
             const result = await db.select(`SELECT * FROM app_settings WHERE key = '${STORAGE_KEYS.companies}' OR key = '${STORAGE_KEYS.settings}'`);
             return result;
          } catch (e) {
             return null;
          }
        })()
      ]);

      const hasDbCompanyList =
        Array.isArray(persistedCompanies) && persistedCompanies.length > 0;
      const hasDbSingleCompany = !!dbSettings?.company?.name;
      
      // Check raw result as well
      const hasRawData = Array.isArray(rawCheck) && rawCheck.length > 0;

      const hasDbCompany = hasDbCompanyList || hasDbSingleCompany || hasRawData;

      if (import.meta.env.DEV) {
        console.info("[CompanyStore] bootstrapFromDb status:", {
          hasDbCompanyList,
          hasDbSingleCompany,
          hasRawData,
          persistedCompaniesCount: persistedCompanies?.length ?? 0,
          dbSettingsCompanyName: dbSettings?.company?.name,
          rawCheckKeys: Array.isArray(rawCheck) ? rawCheck.map((r: any) => r.key) : 'none'
        });
      }

      if (hasDbCompany) {
        // Sync back to settings store if needed
        if (hasDbCompanyList) {
          const { normalizeCompanyProfile } = await import("./settings.store");
          useSettingsStore.setState({
            companies: persistedCompanies.map((c: CompanyProfile) =>
              normalizeCompanyProfile(c),
            ),
          });
        }

        const activeCompanyId = 
          settingsState.activeCompanyId ?? 
          (hasDbCompanyList ? persistedCompanies[0].id : null);

        if (import.meta.env.DEV) {
          console.info("[CompanyStore] Verified company in DB:", { activeCompanyId });
        }

        set({
          hasCompany: true,
          activeCompanyId,
        });
      } else {
        // Fallback: Check localStorage regardless of environment (dual-persistence recovery)
        const savedCompanies = localStorage.getItem(STORAGE_KEYS.companies);
        const savedSettings = localStorage.getItem(STORAGE_KEYS.settings);
        
        if (savedCompanies || savedSettings) {
          try {
            const parsedCompanies = savedCompanies ? JSON.parse(savedCompanies) : [];
            const parsedSettings = savedSettings ? JSON.parse(savedSettings) : {};
            
            const hasLocalData = (Array.isArray(parsedCompanies) && parsedCompanies.length > 0) || !!parsedSettings?.company?.name;
            
            if (hasLocalData) {
              if (import.meta.env.DEV) console.info("[CompanyStore] Verified company in LocalStorage recovery path");
              set({ 
                hasCompany: true, 
                activeCompanyId: parsedCompanies[0]?.id || settingsState.activeCompanyId 
              });
              return;
            }
          } catch (e) {
            // ignore
          }
        }
        
        if (import.meta.env.DEV) console.warn("[CompanyStore] No company found in DB or LocalStorage.");
        set({ hasCompany: false, activeCompanyId: null });
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
