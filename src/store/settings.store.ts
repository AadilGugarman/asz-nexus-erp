/**
 * store/settings.store.ts
 * Zustand store owning all AppSettings (company, financial, invoice, security)
 * and the multi-company list.
 *
 * Strategy:
 *   bootstrap()    → sync load from localStorage cache (fast, blocks no render)
 *   loadFromDb()   → async load from SQLite (source of truth, called after db init)
 *   updateSettings → sync state + localStorage update, fire-and-forget DB write
 *
 * AppContext reads from this store instead of managing its own localStorage state.
 * All components that call useApp().settings / updateSettings continue to work
 * with zero changes.
 */

import { create } from 'zustand';
import type { AppSettings, CompanyProfile } from '@/types';

// ── localStorage keys ─────────────────────────────────────────────────────────
const LS_SETTINGS_KEY       = 'apex_settings';
const LS_COMPANIES_KEY      = 'apex_companies';
const LS_ACTIVE_COMPANY_KEY = 'apex_active_company';

// ── SQLite keys (stored in app_settings table) ────────────────────────────────
const DB_KEY_SETTINGS       = 'app_settings';
const DB_KEY_COMPANIES      = 'companies';
const DB_KEY_ACTIVE_COMPANY = 'active_company_id';

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
  company: {
    name:       '',
    tagline:    '',
    address:    '',
    phone:      '',
    email:      '',
    gstin:      '',
    bankName:   '',
    accountNo:  '',
    ifsc:       '',
    upiId:      '',
    logo:       '',
  },
  financial: {
    financialYearStart: '04-01',
    currency:           'INR',
    commissionRate:     8,
    defaultHamali:      0,
    defaultFreight:     0,
  },
  invoice: {
    salesPrefix:         'INV',
    purchasePrefix:      'PUR',
    arrivalPrefix:       'ARR',
    salesNextNo:         1001,
    purchaseNextNo:      101,
    arrivalNextNo:       1,
    termsText:           'Subject to APMC market yard rules. Goods once sold will not be taken back.',
    footerNote:          'Thank you for your business',
    showUPI:             true,
    showBankDetails:     true,
    templateStyle:       'modern',
    brandColor:          '#6366f1',
    enableQR:            true,
    autoInvoiceNo:       true,
    invoiceNumberMode:   'sequential',
    businessPrefix:      'TF',
    defaultTaxRate:      0,
    paymentDueDays:      15,
    showCompanyDetails:  true,
    showPaymentDetails:  true,
    watermarkType:       'none',
    watermarkText:       '',
    watermarkImage:      '',
    watermarkOpacity:    0.08,
    watermarkSize:       110,
    watermarkPosition:   'center',
    watermarkRepeat:     false,
    signatureImage:      '',
    invoiceLogo:         '',
    enableInvoiceLogo:   false,
  },
  security: {
    appPin:           '',
    autoLockMinutes:  0,
    pinEnabled:       false,
  },
};

// ── State shape ───────────────────────────────────────────────────────────────

interface SettingsState {
  settings:        AppSettings;
  companies:       CompanyProfile[];
  activeCompanyId: string;
  isLoaded:        boolean;

  /** Fast sync bootstrap from localStorage — call before first render. */
  bootstrap:       () => void;
  /** Authoritative async load from SQLite — call after dbService.init(). */
  loadFromDb:      () => Promise<void>;
  /** Update settings in state + localStorage, fire-and-forget DB write. */
  updateSettings:  (partial: Partial<AppSettings>) => void;

  // Company management — mirrors AppContext API
  addCompany:    (profile: CompanyProfile) => void;
  updateCompany: (profile: CompanyProfile) => void;
  deleteCompany: (id: string) => void;
  switchCompany: (id: string) => void;

  /** Internal: persist full state to SQLite. Non-blocking. */
  _persistToDb: (s: AppSettings, companies: CompanyProfile[], activeId: string) => void;
}

// ── localStorage helpers ──────────────────────────────────────────────────────

function readLsSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return mergeSettings(parsed);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeLsSettings(s: AppSettings): void {
  try { localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

function readLsCompanies(fallbackSettings: AppSettings): CompanyProfile[] {
  try {
    const raw = localStorage.getItem(LS_COMPANIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CompanyProfile[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch { /* fall through */ }
  // Seed default company from current settings when no saved list
  return [{
    id:        'co-default',
    company:   fallbackSettings.company,
    financial: fallbackSettings.financial,
    invoice:   fallbackSettings.invoice,
    createdAt: new Date().toISOString(),
  }];
}

function writeLsCompanies(companies: CompanyProfile[]): void {
  try { localStorage.setItem(LS_COMPANIES_KEY, JSON.stringify(companies)); } catch { /* ignore */ }
}

function mergeSettings(partial: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...partial,
    company:   { ...DEFAULT_SETTINGS.company,   ...(partial.company   ?? {}) },
    financial: { ...DEFAULT_SETTINGS.financial, ...(partial.financial ?? {}) },
    invoice:   { ...DEFAULT_SETTINGS.invoice,   ...(partial.invoice   ?? {}) },
    security:  { ...DEFAULT_SETTINGS.security,  ...(partial.security  ?? {}) },
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings:        DEFAULT_SETTINGS,
  companies:       [],
  activeCompanyId: 'co-default',
  isLoaded:        false,

  // ── bootstrap ───────────────────────────────────────────────────────────────
  bootstrap: () => {
    const settings        = readLsSettings();
    const companies       = readLsCompanies(settings);
    const activeCompanyId = localStorage.getItem(LS_ACTIVE_COMPANY_KEY) || companies[0]?.id || 'co-default';
    set({ settings, companies, activeCompanyId, isLoaded: true });
  },

  // ── loadFromDb ──────────────────────────────────────────────────────────────
  loadFromDb: async () => {
    try {
      const { dbService } = await import('@/db/services');
      if (!dbService.isReady) return;

      const [dbSettings, dbCompanies, dbActiveId] = await Promise.all([
        dbService.settings.get<Partial<AppSettings>>(DB_KEY_SETTINGS),
        dbService.settings.get<CompanyProfile[]>(DB_KEY_COMPANIES),
        dbService.settings.get<string>(DB_KEY_ACTIVE_COMPANY),
      ]);

      const current = get();
      const updates: Partial<SettingsState> = {};

      // If DB has settings, they win (source of truth)
      if (dbSettings && typeof dbSettings === 'object') {
        const merged = mergeSettings(dbSettings);
        writeLsSettings(merged);
        updates.settings = merged;
      }

      if (Array.isArray(dbCompanies) && dbCompanies.length) {
        writeLsCompanies(dbCompanies);
        updates.companies = dbCompanies;
      }

      if (typeof dbActiveId === 'string' && dbActiveId) {
        try { localStorage.setItem(LS_ACTIVE_COMPANY_KEY, dbActiveId); } catch { /* ignore */ }
        updates.activeCompanyId = dbActiveId;
      }

      if (Object.keys(updates).length) {
        set(updates);
      } else if (current.settings.company.name) {
        // Settings are in memory/localStorage but not in DB yet — write them up
        get()._persistToDb(current.settings, current.companies, current.activeCompanyId);
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[SettingsStore] loadFromDb failed:', e);
    }
  },

  // ── updateSettings ──────────────────────────────────────────────────────────
  updateSettings: (partial) => {
    const nextSettings = { ...get().settings, ...partial };
    set({ settings: nextSettings });
    writeLsSettings(nextSettings);

    // Sync active company entry in the companies array when company/financial/invoice change
    if (partial.company || partial.financial || partial.invoice) {
      const { companies, activeCompanyId } = get();
      let nextCompanies = companies.map((c) => {
        if (c.id !== activeCompanyId) return c;
        return {
          ...c,
          company:   partial.company   ? { ...c.company,   ...partial.company   } : c.company,
          financial: partial.financial ? { ...c.financial, ...partial.financial } : c.financial,
          invoice:   partial.invoice   ? { ...c.invoice,   ...partial.invoice   } : c.invoice,
        };
      });

      // If no companies exist yet (first setup), create the default entry
      if (!nextCompanies.length && nextSettings.company.name) {
        nextCompanies = [{
          id:        activeCompanyId,
          company:   nextSettings.company,
          financial: nextSettings.financial,
          invoice:   nextSettings.invoice,
          createdAt: new Date().toISOString(),
        }];
      }
      writeLsCompanies(nextCompanies);
      set({ companies: nextCompanies });
      get()._persistToDb(nextSettings, nextCompanies, activeCompanyId);
    } else {
      const { companies, activeCompanyId } = get();
      get()._persistToDb(nextSettings, companies, activeCompanyId);
    }
  },

  // ── addCompany ──────────────────────────────────────────────────────────────
  addCompany: (profile) => {
    const next = [...get().companies, profile];
    set({ companies: next });
    writeLsCompanies(next);
    get()._persistToDb(get().settings, next, get().activeCompanyId);
  },

  // ── updateCompany ────────────────────────────────────────────────────────────
  updateCompany: (profile) => {
    const next = get().companies.map((c) => (c.id === profile.id ? profile : c));
    set({ companies: next });
    writeLsCompanies(next);
    if (profile.id === get().activeCompanyId) {
      const nextSettings = {
        ...get().settings,
        company:   profile.company,
        financial: profile.financial,
        invoice:   profile.invoice,
      };
      set({ settings: nextSettings });
      writeLsSettings(nextSettings);
      get()._persistToDb(nextSettings, next, get().activeCompanyId);
    } else {
      get()._persistToDb(get().settings, next, get().activeCompanyId);
    }
  },

  // ── deleteCompany ────────────────────────────────────────────────────────────
  deleteCompany: (id) => {
    if (get().companies.length <= 1) return; // always keep at least one
    const next = get().companies.filter((c) => c.id !== id);
    set({ companies: next });
    writeLsCompanies(next);
    const { settings, activeCompanyId } = get();
    const nextActiveId = activeCompanyId === id ? (next[0]?.id ?? 'co-default') : activeCompanyId;
    if (nextActiveId !== activeCompanyId) {
      try { localStorage.setItem(LS_ACTIVE_COMPANY_KEY, nextActiveId); } catch { /* ignore */ }
      set({ activeCompanyId: nextActiveId });
    }
    get()._persistToDb(settings, next, nextActiveId);
  },

  // ── switchCompany ────────────────────────────────────────────────────────────
  switchCompany: (id) => {
    const target = get().companies.find((c) => c.id === id);
    if (!target) return;
    const nextSettings = {
      ...get().settings,
      company:   target.company,
      financial: target.financial,
      invoice:   target.invoice,
    };
    try { localStorage.setItem(LS_ACTIVE_COMPANY_KEY, id); } catch { /* ignore */ }
    writeLsSettings(nextSettings);
    set({ activeCompanyId: id, settings: nextSettings });
    get()._persistToDb(nextSettings, get().companies, id);
  },

  // ── _persistToDb ─────────────────────────────────────────────────────────────
  _persistToDb: (settings, companies, activeId) => {
    // Fire-and-forget — never block the UI
    (async () => {
      try {
        const { dbService } = await import('@/db/services');
        if (!dbService.isReady) return;
        await Promise.all([
          dbService.settings.set(DB_KEY_SETTINGS,       settings),
          dbService.settings.set(DB_KEY_COMPANIES,      companies),
          dbService.settings.set(DB_KEY_ACTIVE_COMPANY, activeId),
        ]);
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[SettingsStore] _persistToDb failed:', e);
      }
    })();
  },
}));
