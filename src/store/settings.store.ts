/**
 * store/settings.store.ts
 * Zustand store owning all AppSettings (company, financial, invoice, security)
 * and the multi-company list.
 *
 * Strategy:
 *   loadFromDb()   → async load from SQLite (source of truth, called after db init)
 *   updateSettings → sync state + SQLite persistence
 *
 * AppContext reads from this store instead of managing its own localStorage state.
 * Business state is restored from SQLite and not bootstrapped from localStorage.
 */

import { create } from "zustand";
import type { AppSettings, CompanyProfile } from "@/types";

// ── SQLite keys (stored in app_settings table) ────────────────────────────────
const DB_KEY_SETTINGS = "app_settings";
const DB_KEY_COMPANIES = "companies";
const DB_KEY_ACTIVE_COMPANY = "active_company_id";
const DB_KEY_ACTIVE_FY = "active_fy";

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
  company: {
    name: "",
    tagline: "",
    address: "",
    phone: "",
    email: "",
    gstin: "",
    bankName: "",
    accountNo: "",
    ifsc: "",
    upiId: "",
    logo: "",
  },
  financial: {
    financialYearStart: "04-01",
    currency: "INR",
    commissionRate: 8,
    defaultHamali: 0,
    defaultFreight: 0,
  },
  invoice: {
    salesPrefix: "INV",
    purchasePrefix: "PUR",
    arrivalPrefix: "ARR",
    salesNextNo: 1001,
    purchaseNextNo: 101,
    arrivalNextNo: 1,
    termsText:
      "Subject to APMC market yard rules. Goods once sold will not be taken back.",
    footerNote: "Thank you for your business",
    showUPI: true,
    showBankDetails: true,
    templateStyle: "modern",
    brandColor: "#6366f1",
    enableQR: true,
    autoInvoiceNo: true,
    invoiceNumberMode: "sequential",
    businessPrefix: "TF",
    defaultTaxRate: 0,
    paymentDueDays: 15,
    showCompanyDetails: true,
    showPaymentDetails: true,
    watermarkType: "none",
    watermarkText: "",
    watermarkImage: "",
    watermarkOpacity: 0.08,
    watermarkSize: 110,
    watermarkPosition: "center",
    watermarkRepeat: false,
    signatureImage: "",
    invoiceLogo: "",
    enableInvoiceLogo: false,
  },
  security: {
    appPin: "",
    autoLockMinutes: 0,
    pinEnabled: false,
  },
  setupCompleted: false,
};

interface SettingsState {
  settings: AppSettings;
  companies: CompanyProfile[];
  activeCompanyId: string | null;
  activeFY: string;
  isLoaded: boolean;

  setActiveFY: (fy: string) => void;

  /** Authoritative async load from SQLite — call after dbService.init(). */
  loadFromDb: () => Promise<void>;
  /** Update settings in state and persist to SQLite. */
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;

  // Company management — mirrors AppContext API
  addCompany: (profile: CompanyProfile) => void;
  updateCompany: (profile: CompanyProfile) => void;
  deleteCompany: (id: string) => void;
  switchCompany: (id: string) => void;

  /** Internal: persist full state to SQLite. Non-blocking. */
  _persistToDb: (
    s: AppSettings,
    companies: CompanyProfile[],
    activeId: string | null,
    activeFY: string,
  ) => void;
}

function deriveDefaultActiveFY(settings: AppSettings): string {
  const [monthStart] = settings.financial.financialYearStart
    .split("-")
    .map(Number);
  const now = new Date();
  const currentYear = now.getFullYear();
  const baseYear =
    now.getMonth() + 1 >= monthStart ? currentYear : currentYear - 1;
  return `${baseYear}-${String(baseYear + 1).slice(-2)}`;
}

function mergeSettings(partial: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...partial,
    company: { ...DEFAULT_SETTINGS.company, ...(partial.company ?? {}) },
    financial: { ...DEFAULT_SETTINGS.financial, ...(partial.financial ?? {}) },
    invoice: { ...DEFAULT_SETTINGS.invoice, ...(partial.invoice ?? {}) },
    security: { ...DEFAULT_SETTINGS.security, ...(partial.security ?? {}) },
    setupCompleted:
      typeof partial.setupCompleted === "boolean"
        ? partial.setupCompleted
        : DEFAULT_SETTINGS.setupCompleted,
  };
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: DEFAULT_SETTINGS,
  companies: [],
  activeCompanyId: null,
  activeFY: deriveDefaultActiveFY(DEFAULT_SETTINGS),
  isLoaded: false,

  // ── loadFromDb ──────────────────────────────────────────────────────────────
  loadFromDb: async () => {
    const { dbService } = await import("@/db/services");
    if (!dbService.isReady) {
      if (import.meta.env.DEV)
        console.warn(
          "[SettingsStore] Database is not ready. Skipping SQLite restore.",
        );
      set({ isLoaded: true });
      return;
    }

    try {
      const [dbSettings, dbCompanies, dbActiveId, dbActiveFY] =
        await Promise.all([
          dbService.settings.get<Partial<AppSettings>>(DB_KEY_SETTINGS),
          dbService.settings.get<CompanyProfile[]>(DB_KEY_COMPANIES),
          dbService.settings.get<string>(DB_KEY_ACTIVE_COMPANY),
          dbService.settings.get<string>(DB_KEY_ACTIVE_FY),
        ]);

      const nextSettings =
        dbSettings && typeof dbSettings === "object"
          ? mergeSettings(dbSettings)
          : DEFAULT_SETTINGS;
      const nextCompanies = Array.isArray(dbCompanies) ? dbCompanies : [];
      const nextActiveCompanyId =
        typeof dbActiveId === "string" && dbActiveId
          ? dbActiveId
          : (nextCompanies[0]?.id ?? null);
      const nextActiveFY =
        typeof dbActiveFY === "string" && dbActiveFY
          ? dbActiveFY
          : deriveDefaultActiveFY(nextSettings);

      set({
        settings: nextSettings,
        companies: nextCompanies,
        activeCompanyId: nextActiveCompanyId,
        activeFY: nextActiveFY,
        isLoaded: true,
      });
    } catch (e) {
      if (import.meta.env.DEV)
        console.warn("[SettingsStore] loadFromDb failed:", e);
      set({ isLoaded: true });
    }
  },

  // ── updateSettings ──────────────────────────────────────────────────────────
  updateSettings: async (partial) => {
    const current = get();
    const nextSettings = { ...current.settings, ...partial };
    set({ settings: nextSettings });

    let nextCompanies = current.companies;
    const activeCompanyId = current.activeCompanyId;

    if (partial.company || partial.financial || partial.invoice) {
      nextCompanies = current.companies.map((c) => {
        if (c.id !== activeCompanyId) return c;
        return {
          ...c,
          company: partial.company
            ? { ...c.company, ...partial.company }
            : c.company,
          financial: partial.financial
            ? { ...c.financial, ...partial.financial }
            : c.financial,
          invoice: partial.invoice
            ? { ...c.invoice, ...partial.invoice }
            : c.invoice,
        };
      });

      if (!nextCompanies.length && nextSettings.company.name) {
        nextCompanies = [
          {
            id: activeCompanyId ?? `co-${Date.now()}`,
            company: nextSettings.company,
            financial: nextSettings.financial,
            invoice: nextSettings.invoice,
            createdAt: new Date().toISOString(),
          },
        ];
      }

      set({ companies: nextCompanies });
    }

    const activeFY = current.activeFY;
    await get()._persistToDb(
      nextSettings,
      nextCompanies,
      activeCompanyId,
      activeFY,
    );
  },

  // ── addCompany ──────────────────────────────────────────────────────────────
  addCompany: (profile) => {
    const next = [...get().companies, profile];
    const activeCompanyId = get().activeCompanyId ?? profile.id;
    set({ companies: next, activeCompanyId });
    void get()._persistToDb(
      get().settings,
      next,
      activeCompanyId,
      get().activeFY,
    );
  },

  // ── updateCompany ────────────────────────────────────────────────────────────
  updateCompany: (profile) => {
    const next = get().companies.map((c) =>
      c.id === profile.id ? profile : c,
    );
    set({ companies: next });
    const { activeFY } = get();
    if (profile.id === get().activeCompanyId) {
      const nextSettings = {
        ...get().settings,
        company: profile.company,
        financial: profile.financial,
        invoice: profile.invoice,
      };
      set({ settings: nextSettings });
      void get()._persistToDb(
        nextSettings,
        next,
        get().activeCompanyId,
        activeFY,
      );
    } else {
      void get()._persistToDb(
        get().settings,
        next,
        get().activeCompanyId,
        activeFY,
      );
    }
  },

  // ── deleteCompany ────────────────────────────────────────────────────────────
  deleteCompany: (id) => {
    if (get().companies.length <= 1) return; // always keep at least one
    const next = get().companies.filter((c) => c.id !== id);
    const { settings, activeCompanyId, activeFY } = get();
    const nextActiveId =
      activeCompanyId === id ? (next[0]?.id ?? null) : activeCompanyId;
    const updates: Partial<SettingsState> = { companies: next };
    if (nextActiveId !== activeCompanyId) {
      updates.activeCompanyId = nextActiveId;
    }
    set(updates);
    void get()._persistToDb(settings, next, nextActiveId, activeFY);
  },

  // ── switchCompany ────────────────────────────────────────────────────────────
  switchCompany: (id) => {
    const target = get().companies.find((c) => c.id === id);
    if (!target) return;
    const nextSettings = {
      ...get().settings,
      company: target.company,
      financial: target.financial,
      invoice: target.invoice,
    };
    set({ activeCompanyId: id, settings: nextSettings });
    void get()._persistToDb(nextSettings, get().companies, id, get().activeFY);
  },

  setActiveFY: (fy) => {
    set({ activeFY: fy });
    void get()._persistToDb(
      get().settings,
      get().companies,
      get().activeCompanyId,
      fy,
    );
  },

  // ── _persistToDb ─────────────────────────────────────────────────────────────
  _persistToDb: async (settings, companies, activeId, activeFY) => {
    try {
      const { dbService } = await import("@/db/services");
      if (!dbService.isReady) {
        const initialized = await dbService.init();
        if (!initialized) {
          if (import.meta.env.DEV)
            console.warn(
              "[SettingsStore] DB init failed, skipping persistence",
            );
          return;
        }
      }

      if (import.meta.env.DEV) {
        console.info(
          "[SettingsStore] Persisting settings and companies to SQLite",
          {
            activeId,
            activeFY,
            companyCount: companies.length,
          },
        );
      }

      await Promise.all([
        dbService.settings.set(DB_KEY_SETTINGS, settings),
        dbService.settings.set(DB_KEY_COMPANIES, companies),
        dbService.settings.set(DB_KEY_ACTIVE_COMPANY, activeId),
        dbService.settings.set(DB_KEY_ACTIVE_FY, activeFY),
      ]);
    } catch (e) {
      if (import.meta.env.DEV)
        console.warn("[SettingsStore] _persistToDb failed:", e);
    }
  },
}));
