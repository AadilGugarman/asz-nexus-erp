import { create } from 'zustand';
import { useSettingsStore } from './settings.store';

const COMPANY_READY_KEY = 'apex_setup_done';

interface CompanyState {
  hasCompany: boolean;
  activeCompanyId: string | null;
  initialized: boolean;

  /** Fast synchronous bootstrap from localStorage cache. */
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

function readCompanyReadyFlag(): boolean {
  try {
    const value = localStorage.getItem(COMPANY_READY_KEY);
    return value === '1' || value === 'true';
  } catch {
    return false;
  }
}

export const useCompanyStore = create<CompanyState>()((set, get) => ({
  hasCompany: false,
  activeCompanyId: null,
  initialized: false,

  bootstrap: () => {
    const settings = useSettingsStore.getState();
    const hasCompany = readCompanyReadyFlag() || readCompaniesCount() > 0 || !!settings.settings.company.name;
    set({
      hasCompany,
      activeCompanyId: settings.activeCompanyId ?? settings.companies[0]?.id ?? null,
      initialized: true,
    });
  },

  bootstrapFromDb: async () => {
    try {
      // Lazy import to avoid circular deps and keep startup fast
      const { dbService } = await import('@/db/services');
      if (!dbService.isReady) return;

      // Check both the granular 'company' key (written by SetupWizard)
      // and the canonical 'app_settings' blob (written by useSettingsStore)
      const [company, appSettings] = await Promise.all([
        dbService.settings.get<{ name: string }>('company'),
        dbService.settings.get<{ company?: { name?: string } }>('app_settings'),
      ]);

      const hasDbCompany =
        !!company?.name ||
        !!appSettings?.company?.name;

      if (hasDbCompany) {
        set({
          hasCompany: true,
          activeCompanyId: useSettingsStore.getState().activeCompanyId ?? get().activeCompanyId,
        });
      }
    } catch {
      // Non-fatal — localStorage state already applied by bootstrap()
    }
  },

  markCompanyCreated: (companyId) => {
    const activeCompanyId = companyId ?? useSettingsStore.getState().activeCompanyId ?? get().activeCompanyId;
    set({
      hasCompany: true,
      activeCompanyId,
      initialized: true,
    });
  },
}));
