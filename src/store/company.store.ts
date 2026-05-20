import { create } from 'zustand';

const COMPANIES_KEY = 'apex_companies';
const ACTIVE_COMPANY_KEY = 'apex_active_company';
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
    const raw = localStorage.getItem(COMPANIES_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
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

function readActiveCompanyId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_COMPANY_KEY);
  } catch {
    return null;
  }
}

export const useCompanyStore = create<CompanyState>()((set) => ({
  hasCompany: false,
  activeCompanyId: null,
  initialized: false,

  bootstrap: () => {
    // Fix: was `> 1`, should be `> 0` — one company is enough
    const hasCompany = readCompanyReadyFlag() || readCompaniesCount() > 0;
    set({
      hasCompany,
      activeCompanyId: readActiveCompanyId(),
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
        // DB confirms company exists — update localStorage cache and state
        try { localStorage.setItem(COMPANY_READY_KEY, '1'); } catch { /* ignore */ }
        set({ hasCompany: true });
      }
    } catch {
      // Non-fatal — localStorage state already applied by bootstrap()
    }
  },

  markCompanyCreated: (companyId) => {
    try {
      localStorage.setItem(COMPANY_READY_KEY, '1');
    } catch {
      // no-op if storage unavailable
    }

    if (companyId) {
      try {
        localStorage.setItem(ACTIVE_COMPANY_KEY, companyId);
      } catch {
        // no-op if storage unavailable
      }
    }

    set({
      hasCompany: true,
      activeCompanyId: companyId ?? readActiveCompanyId(),
      initialized: true,
    });
  },
}));
