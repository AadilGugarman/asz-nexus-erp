import { create } from 'zustand';

const COMPANIES_KEY = 'apex_companies';
const ACTIVE_COMPANY_KEY = 'apex_active_company';
const COMPANY_READY_KEY = 'apex_setup_done';

interface CompanyState {
  hasCompany: boolean;
  activeCompanyId: string | null;
  initialized: boolean;

  bootstrap: () => void;
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
    const hasCompany = readCompanyReadyFlag() || readCompaniesCount() > 1;
    set({
      hasCompany,
      activeCompanyId: readActiveCompanyId(),
      initialized: true,
    });
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
