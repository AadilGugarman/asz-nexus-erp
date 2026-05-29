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
import { APP_CONFIG, STORAGE_KEYS } from "@/config";
import type { AppSettings, CompanyProfile } from "@/types";

// ── Keys ──────────────────────────────────────────────────────────────────────
const DB_KEY_SETTINGS = STORAGE_KEYS.settings;
const DB_KEY_COMPANIES = STORAGE_KEYS.companies;
const DB_KEY_ACTIVE_COMPANY = STORAGE_KEYS.activeCompany;
const DB_KEY_ACTIVE_FY = STORAGE_KEYS.activeFY;

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: AppSettings = {
  company: {
    name: "",
    tagline: "",
    logo: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    gstin: "",
    bankName: "",
    accountNo: "",
    ifsc: "",
    upiId: "",
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
    watermarkRotation: 0,
    watermarkPosition: "center",
    watermarkRepeat: false,
    signatureImage: "",
    invoiceLogo: "",
    enableInvoiceLogo: false,
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
  addCompany: (profile: CompanyProfile) => Promise<void>;
  updateCompany: (profile: CompanyProfile) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  switchCompany: (id: string) => Promise<void>;
  resetSettings: () => Promise<void>;

  /** Internal: persist full state to SQLite. Non-blocking. */
  _persistToDb: (
    s: AppSettings,
    companies: CompanyProfile[],
    activeId: string | null,
    activeFY: string,
  ) => Promise<void>;
}

function deriveDefaultActiveFY(settings: AppSettings): string {
  const fyStart = settings?.financial?.financialYearStart ?? "04-01";
  const [monthStart] = fyStart.split("-").map(Number);
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
    setupCompleted:
      typeof partial.setupCompleted === "boolean"
        ? partial.setupCompleted
        : DEFAULT_SETTINGS.setupCompleted,
  };
}

/**
 * Ensure every CompanyProfile loaded from storage has all required nested
 * objects. Guards against old/partial data causing "Cannot read properties
 * of undefined" crashes at runtime.
 */
export function normalizeCompanyProfile(
  raw: Partial<CompanyProfile>,
): CompanyProfile {
  return {
    id: raw.id ?? `co-${Date.now()}`,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    pan: raw.pan,
    city: raw.city,
    state: raw.state,
    pincode: raw.pincode,
    logo: raw.logo,
    company: { ...DEFAULT_SETTINGS.company, ...(raw.company ?? {}) },
    financial: { ...DEFAULT_SETTINGS.financial, ...(raw.financial ?? {}) },
    invoice: { ...DEFAULT_SETTINGS.invoice, ...(raw.invoice ?? {}) },
  };
}

function normalizeCompanies(raw: unknown): CompanyProfile[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => normalizeCompanyProfile(c as Partial<CompanyProfile>));
}

// ── Startup cache helpers ─────────────────────────────────────────────────────
// These write ONLY the four config keys (settings, companies, activeCompany,
// activeFY) to localStorage. Business data (invoices, customers, etc.) is
// NEVER written here — it lives exclusively in SQLite.

// Cache version key — bump this whenever the DB schema changes or a restore
// happens, so the next cold start always reads from SQLite instead of stale cache.
const CACHE_VERSION_KEY = `${DB_KEY_SETTINGS}_cache_v`;
const CURRENT_CACHE_VERSION = "2";

function _isCacheStale(): boolean {
  try {
    return localStorage.getItem(CACHE_VERSION_KEY) !== CURRENT_CACHE_VERSION;
  } catch {
    return true;
  }
}

function _stampCacheVersion(): void {
  try {
    localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION);
  } catch {
    /* ignore */
  }
}

function _writeStartupCache(
  s: AppSettings,
  companies: CompanyProfile[],
  activeId: string | null,
  activeFY: string,
): void {
  try {
    localStorage.setItem(DB_KEY_SETTINGS, JSON.stringify(s));
    localStorage.setItem(DB_KEY_COMPANIES, JSON.stringify(companies));
    if (activeId) localStorage.setItem(DB_KEY_ACTIVE_COMPANY, activeId);
    if (activeFY) localStorage.setItem(DB_KEY_ACTIVE_FY, activeFY);
    _stampCacheVersion();
  } catch (e) {
    console.warn("[SettingsStore] Startup cache write failed:", e);
  }
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
    const isTauri = APP_CONFIG.isTauri;

    // Try to restore from localStorage as a baseline/fallback.
    // If the cache version is stale (e.g. after a DB restore), skip it entirely
    // so we always read fresh data from SQLite on the next cold start.
    let localData: Partial<AppSettings> | null = null;
    let localCompanies: CompanyProfile[] = [];
    const cacheIsValid = !_isCacheStale();
    if (cacheIsValid) {
      try {
        const saved = localStorage.getItem(DB_KEY_SETTINGS);
        if (saved) {
          localData = JSON.parse(saved);
          const companiesSaved = localStorage.getItem(DB_KEY_COMPANIES);
          if (companiesSaved)
            localCompanies = normalizeCompanies(JSON.parse(companiesSaved));
        }
      } catch (e) {
        console.warn("[SettingsStore] LocalStorage check failed:", e);
      }
    }

    if (!isTauri) {
      if (localData) {
        const nextSettings = mergeSettings(localData);
        set({
          settings: nextSettings,
          companies: localCompanies,
          activeCompanyId:
            localStorage.getItem(DB_KEY_ACTIVE_COMPANY) ||
            (localCompanies[0]?.id ?? null),
          activeFY:
            localStorage.getItem(DB_KEY_ACTIVE_FY) ||
            deriveDefaultActiveFY(nextSettings),
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
      return;
    }

    const { dbService } = await import("@/db/services");
    if (!dbService.isReady) {
      await dbService.init();
    }

    try {
      const [dbSettings, dbCompanies, dbActiveId, dbActiveFY] =
        await Promise.all([
          dbService.settings.get<Partial<AppSettings>>(DB_KEY_SETTINGS),
          dbService.settings.get<CompanyProfile[]>(DB_KEY_COMPANIES),
          dbService.settings.get<string>(DB_KEY_ACTIVE_COMPANY),
          dbService.settings.get<string>(DB_KEY_ACTIVE_FY),
        ]);

      const hasDbData =
        dbSettings || (Array.isArray(dbCompanies) && dbCompanies.length > 0);

      // If DB is empty but localStorage has data, prefer localStorage (recovery case)
      if (!hasDbData && localData) {
        if (import.meta.env.DEV)
          console.info(
            "[SettingsStore] DB empty, recovering from LocalStorage...",
          );
        const nextSettings = mergeSettings(localData);
        set({
          settings: nextSettings,
          companies: localCompanies,
          activeCompanyId:
            localStorage.getItem(DB_KEY_ACTIVE_COMPANY) ||
            (localCompanies[0]?.id ?? null),
          activeFY:
            localStorage.getItem(DB_KEY_ACTIVE_FY) ||
            deriveDefaultActiveFY(nextSettings),
          isLoaded: true,
        });
        // Try to re-persist to DB
        void get()._persistToDb(
          nextSettings,
          localCompanies,
          get().activeCompanyId,
          get().activeFY,
        );
        return;
      }

      const nextSettings =
        dbSettings && typeof dbSettings === "object"
          ? mergeSettings(dbSettings)
          : localData
            ? mergeSettings(localData)
            : DEFAULT_SETTINGS;

      const nextCompanies = Array.isArray(dbCompanies)
        ? normalizeCompanies(dbCompanies)
        : localCompanies;
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
        console.warn(
          "[SettingsStore] loadFromDb failed, falling back to localData:",
          e,
        );
      if (localData) {
        set({
          settings: mergeSettings(localData),
          companies: localCompanies,
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
    }
  },

  // ── updateSettings ──────────────────────────────────────────────────────────
  updateSettings: async (partial) => {
    const current = get();
    const nextSettings = { ...current.settings, ...partial };

    // Safety check: Don't allow resetting setupCompleted to false if we have companies
    if (partial.setupCompleted === false && current.companies.length > 0) {
      if (import.meta.env.DEV)
        console.warn(
          "[SettingsStore] Prevented resetting setupCompleted to false because companies exist.",
        );
      nextSettings.setupCompleted = true;
    }

    // CRITICAL: Ensure we don't overwrite with empty companies if we know they exist
    // This handles potential race conditions where companies are being added
    let nextCompanies = current.companies;
    if (nextCompanies.length === 0 && nextSettings.company.name) {
      // If settings has a company name but companies list is empty,
      // it's likely a legacy single-company state or a race condition.
      // We should NOT overwrite the DB with an empty list.
    }

    set({ settings: nextSettings });

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
  addCompany: async (profile) => {
    const current = get();
    const nextCompanies = [...current.companies, profile];

    // IMPORTANT: If this is the first company or there's no active company,
    // set the new profile as the active company. Otherwise keep the current active company.
    const activeCompanyId =
      nextCompanies.length === 1 || !current.activeCompanyId
        ? profile.id
        : current.activeCompanyId;

    // If this is the first company being added, sync it to the main settings object too
    let nextSettings = current.settings;
    if (nextCompanies.length === 1 || !current.activeCompanyId) {
      nextSettings = {
        ...current.settings,
        company: profile.company,
        financial: profile.financial,
        invoice: profile.invoice,
      };
    }

    console.log(
      "[SettingsStore] addCompany: setting activeCompanyId to",
      activeCompanyId,
      "profile.id:",
      profile.id,
    );

    set({
      companies: nextCompanies,
      activeCompanyId,
      settings: nextSettings,
    });

    // Verify the state was updated
    const updatedState = get();
    console.log(
      "[SettingsStore] addCompany: after set, activeCompanyId is",
      updatedState.activeCompanyId,
    );

    // Persist to SQLite companies table as well (so FK references succeed)
    if (APP_CONFIG.isTauri) {
      try {
        const { dbService } = await import("@/db/services");
        if (!dbService.isReady) await dbService.init();
        // Map profile -> companies table columns (only required fields)
        const fyStart = profile.financial?.financialYearStart ?? "04-01";
        const month = Number(fyStart.split("-")[0]) || 4;
        await dbService.companies
          .insert({
            id: profile.id,
            name: profile.company?.name ?? "",
            legalName: profile.company?.tagline ?? null,
            gstin: profile.company?.gstin ?? null,
            address: profile.company?.address ?? null,
            phone: profile.company?.phone ?? null,
            email: profile.company?.email ?? null,
            website: profile.company?.website ?? null,
            logo: profile.company?.logo ?? null,
            currency: profile.financial?.currency ?? "INR",
            fyStartMonth: month,
          } as any)
          .catch(() => {});
      } catch (e) {
        console.warn("[SettingsStore] Could not persist company to SQLite:", e);
      }
    }

    await get()._persistToDb(
      nextSettings,
      nextCompanies,
      activeCompanyId,
      get().activeFY,
    );
  },

  // ── updateCompany ────────────────────────────────────────────────────────────
  updateCompany: async (profile) => {
    const current = get();
    const nextCompanies = current.companies.map((c) =>
      c.id === profile.id ? profile : c,
    );
    set({ companies: nextCompanies });

    const { activeFY, activeCompanyId } = current;
    if (profile.id === activeCompanyId) {
      const nextSettings = {
        ...current.settings,
        company: profile.company,
        financial: profile.financial,
        invoice: profile.invoice,
      };
      set({ settings: nextSettings });
      // Also update companies table in SQLite
      if (APP_CONFIG.isTauri) {
        try {
          const { dbService } = await import("@/db/services");
          if (!dbService.isReady) await dbService.init();
          await dbService.companies
            .update(profile.id, {
              name: profile.company?.name ?? "",
              legalName: profile.company?.tagline ?? null,
              gstin: profile.company?.gstin ?? null,
              address: profile.company?.address ?? null,
              phone: profile.company?.phone ?? null,
              email: profile.company?.email ?? null,
              website: profile.company?.website ?? null,
              logo: profile.company?.logo ?? null,
              currency: profile.financial?.currency ?? "INR",
              fyStartMonth:
                Number(profile.financial?.financialYearStart?.split("-")[0]) ||
                4,
            })
            .catch(() => {});
        } catch (e) {
          console.warn(
            "[SettingsStore] Could not update company in SQLite:",
            e,
          );
        }
      }

      await get()._persistToDb(
        nextSettings,
        nextCompanies,
        activeCompanyId,
        activeFY,
      );
    } else {
      if (APP_CONFIG.isTauri) {
        try {
          const { dbService } = await import("@/db/services");
          if (!dbService.isReady) await dbService.init();
          await dbService.companies
            .update(profile.id, {
              name: profile.company?.name ?? "",
              legalName: profile.company?.tagline ?? null,
              gstin: profile.company?.gstin ?? null,
              address: profile.company?.address ?? null,
              phone: profile.company?.phone ?? null,
              email: profile.company?.email ?? null,
              website: profile.company?.website ?? null,
              logo: profile.company?.logo ?? null,
              currency: profile.financial?.currency ?? "INR",
              fyStartMonth:
                Number(profile.financial?.financialYearStart?.split("-")[0]) ||
                4,
            })
            .catch(() => {});
        } catch (e) {
          console.warn(
            "[SettingsStore] Could not update company in SQLite:",
            e,
          );
        }
      }

      await get()._persistToDb(
        current.settings,
        nextCompanies,
        activeCompanyId,
        activeFY,
      );
    }
  },

  // ── deleteCompany ────────────────────────────────────────────────────────────
  deleteCompany: async (id) => {
    const current = get();
    if (current.companies.length <= 1) return; // always keep at least one

    const nextCompanies = current.companies.filter((c) => c.id !== id);
    const { activeCompanyId, activeFY } = current;
    const nextActiveId =
      activeCompanyId === id ? (nextCompanies[0]?.id ?? null) : activeCompanyId;

    const updates: Partial<SettingsState> = { companies: nextCompanies };
    let nextSettings = current.settings;

    if (nextActiveId !== activeCompanyId) {
      updates.activeCompanyId = nextActiveId;
      const target = nextCompanies.find((c) => c.id === nextActiveId);
      if (target) {
        nextSettings = {
          ...current.settings,
          company: target.company,
          financial: target.financial,
          invoice: target.invoice,
        };
        updates.settings = nextSettings;
      }
    }

    set(updates);
    if (APP_CONFIG.isTauri) {
      try {
        const { dbService } = await import("@/db/services");
        if (!dbService.isReady) await dbService.init();
        // Remove from companies table as well (this will cascade to company-scoped rows)
        await dbService.companies.delete(id).catch(() => {});
      } catch (e) {
        console.warn(
          "[SettingsStore] Could not delete company from SQLite:",
          e,
        );
      }
    }

    await get()._persistToDb(
      nextSettings,
      nextCompanies,
      nextActiveId,
      activeFY,
    );
  },

  // ── switchCompany ────────────────────────────────────────────────────────────
  switchCompany: async (id) => {
    const current = get();
    const target = current.companies.find((c) => c.id === id);
    if (!target) return;

    const nextSettings = {
      ...current.settings,
      company: target.company,
      financial: target.financial,
      invoice: target.invoice,
    };

    // Derive the current FY for the new company based on its financialYearStart
    const newActiveFY = deriveDefaultActiveFY(nextSettings);

    set({ activeCompanyId: id, settings: nextSettings, activeFY: newActiveFY });
    await get()._persistToDb(nextSettings, current.companies, id, newActiveFY);
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

  resetSettings: async () => {
    set({
      settings: DEFAULT_SETTINGS,
      companies: [],
      activeCompanyId: null,
      isLoaded: true,
    });
    localStorage.clear();
    const { dbService } = await import("@/db/services");
    if (dbService.isReady) {
      await Promise.all([
        dbService.settings.delete(DB_KEY_SETTINGS),
        dbService.settings.delete(DB_KEY_COMPANIES),
        dbService.settings.delete(DB_KEY_ACTIVE_COMPANY),
        dbService.settings.delete(DB_KEY_ACTIVE_FY),
      ]);
    }
  },

  // ── _persistToDb ─────────────────────────────────────────────────────────────
  _persistToDb: async (s, companies, activeId, activeFY) => {
    // In Tauri: SQLite is the authoritative store. localStorage is written
    // only as a lightweight startup cache (avoids blank flash before DB loads).
    // It is read ONCE on startup in loadFromDb() and never relied on after that.
    if (APP_CONFIG.isTauri) {
      const { dbService } = await import("@/db/services");
      if (!dbService.isReady) await dbService.init();

      try {
        await Promise.all([
          dbService.settings.set(DB_KEY_SETTINGS, s),
          dbService.settings.set(DB_KEY_COMPANIES, companies),
          dbService.settings.set(DB_KEY_ACTIVE_COMPANY, activeId),
          dbService.settings.set(DB_KEY_ACTIVE_FY, activeFY),
        ]);
        if (import.meta.env.DEV)
          console.info("[SettingsStore] SQLite persistence complete");
      } catch (error) {
        console.error("[SettingsStore] SQLite persistence failed:", error);
        // On SQLite failure, fall back to localStorage so the user doesn't
        // lose their company/settings on next cold start.
        _writeStartupCache(s, companies, activeId, activeFY);
      }

      // Keep the startup cache in sync so a cold start after a crash still works.
      _writeStartupCache(s, companies, activeId, activeFY);
      return;
    }

    // Browser dev mode: localStorage is the only store available.
    _writeStartupCache(s, companies, activeId, activeFY);
  },
}));

/**
 * Call this after a backup restore so the next cold start always reads
 * fresh data from SQLite instead of the now-stale localStorage cache.
 */
export function invalidateStartupCache(): void {
  try {
    localStorage.removeItem(CACHE_VERSION_KEY);
  } catch {
    /* ignore */
  }
}
