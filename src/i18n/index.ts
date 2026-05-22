import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { APP_CONFIG, STORAGE_KEYS, LEGACY_KEYS } from "@/config";
import { ipc } from "@/ipc";
import { useAppearanceStore } from "@/store";
import {
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  type AppLanguage,
} from "@/types/language";

import { namespaces, resources } from "./resources";

const LEGACY_LANGUAGE_KEY = LEGACY_KEYS.language;

let isInitialized = false;
let hasLanguageSync = false;

function readLanguageFromStorageValue(raw: string | null): string | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;

    if (
      "state" in parsed &&
      typeof parsed.state === "object" &&
      parsed.state !== null
    ) {
      const state = parsed.state as { language?: unknown };
      return typeof state.language === "string" ? state.language : null;
    }

    const flattened = parsed as { language?: unknown };
    return typeof flattened.language === "string" ? flattened.language : null;
  } catch {
    return null;
  }
}

function hasExplicitLanguagePreference(): boolean {
  if (typeof window === "undefined") return false;

  const nextStoreRaw = window.localStorage.getItem(STORAGE_KEYS.appearance);
  const nextStoreLanguage = readLanguageFromStorageValue(nextStoreRaw);
  if (nextStoreLanguage) return true;

  return Boolean(window.localStorage.getItem(LEGACY_LANGUAGE_KEY));
}

function getLanguageFromRuntime(): AppLanguage {
  if (typeof navigator === "undefined") return DEFAULT_LANGUAGE;
  return normalizeLanguage(navigator.language);
}

async function detectDesktopLanguage(): Promise<AppLanguage> {
  if (!APP_CONFIG.isTauri) return getLanguageFromRuntime();

  try {
    const info = await ipc.system.getSystemInfo();
    return normalizeLanguage(info.locale);
  } catch {
    return getLanguageFromRuntime();
  }
}

export function initI18n(): void {
  if (isInitialized) return;
  isInitialized = true;

  const fromStore = normalizeLanguage(useAppearanceStore.getState().language);

  void i18n.use(initReactI18next).init({
    resources,
    ns: namespaces,
    defaultNS: "common",
    lng: fromStore,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });
}

export function initI18nLanguageSync(): void {
  if (hasLanguageSync) return;
  hasLanguageSync = true;

  const applyLanguageToI18n = (language: string) => {
    const normalized = normalizeLanguage(language);
    if (i18n.resolvedLanguage !== normalized) {
      void i18n.changeLanguage(normalized);
    }
  };

  applyLanguageToI18n(useAppearanceStore.getState().language);

  useAppearanceStore.subscribe((next, prev) => {
    if (next.language !== prev.language) {
      applyLanguageToI18n(next.language);
    }
  });

  i18n.on("languageChanged", (language) => {
    const normalized = normalizeLanguage(language);
    const state = useAppearanceStore.getState();

    if (normalizeLanguage(state.language) !== normalized) {
      state.setLanguage(normalized);
    }

    if (typeof document !== "undefined") {
      document.documentElement.lang = normalized;
    }
  });
}

export async function applyDesktopLanguagePreference(): Promise<void> {
  if (hasExplicitLanguagePreference()) return;

  const detected = await detectDesktopLanguage();
  const state = useAppearanceStore.getState();

  if (normalizeLanguage(state.language) !== detected) {
    state.setLanguage(detected);
  }
}

export { i18n };
