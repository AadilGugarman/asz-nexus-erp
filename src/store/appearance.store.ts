import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_KEYS, LEGACY_KEYS } from "@/config";
import {
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  type AppLanguage,
} from "@/types/language";

const APPEARANCE_STORAGE_KEY = STORAGE_KEYS.appearance;

type ResolvedTheme = "light" | "dark";
export type ThemePreference = ResolvedTheme | "system";
export type FontFamilyOption = "inter" | "roboto" | "segoe";
export type FontSizeOption = "small" | "medium" | "large";

interface AppearancePersistedState {
  themePreference: ThemePreference;
  fontFamily: FontFamilyOption;
  fontSize: FontSizeOption;
  accentColor: string;
  language: AppLanguage;
}

interface AppearanceState extends AppearancePersistedState {
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;

  setThemePreference: (value: ThemePreference) => void;
  setFontFamily: (value: FontFamilyOption) => void;
  setFontSize: (value: FontSizeOption) => void;
  setAccentColor: (value: string) => void;
  setLanguage: (value: AppLanguage) => void;
  toggleTheme: () => void;
  setSystemTheme: (value: ResolvedTheme) => void;
  resetAppearance: () => void;
}

const DEFAULT_APPEARANCE: AppearancePersistedState = {
  themePreference: "system",
  fontFamily: "inter",
  fontSize: "large",
  accentColor: "#fbbf24", // Mango / Amber 400
  language: DEFAULT_LANGUAGE,
};

const FONT_MAP: Record<FontFamilyOption, string> = {
  inter: "'Inter', 'Segoe UI', 'Roboto', Arial, sans-serif",
  roboto: "'Roboto', 'Segoe UI', 'Inter', Arial, sans-serif",
  segoe: "'Segoe UI', 'Inter', 'Roboto', Arial, sans-serif",
};

const FONT_SIZE_MAP: Record<FontSizeOption, string> = {
  small: "13px",
  medium: "14px",
  large: "16px",
};

const isBrowser = typeof window !== "undefined";

interface RGB {
  r: number;
  g: number;
  b: number;
}

function getSystemTheme(): ResolvedTheme {
  if (!isBrowser) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function normalizeHexColor(input: string, fallback = "#6366f1"): string {
  const value = input.trim();
  const hex = value.startsWith("#") ? value.slice(1) : value;

  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    const [r, g, b] = hex.split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return `#${hex}`.toLowerCase();
  }

  return fallback;
}

function hexToRgb(hexColor: string): RGB {
  const hex = normalizeHexColor(hexColor).slice(1);
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function rgbToHex(rgb: RGB): string {
  const toHex = (n: number) => clampByte(n).toString(16).padStart(2, "0");
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function mixColors(base: RGB, target: RGB, ratio: number): RGB {
  const t = Math.max(0, Math.min(1, ratio));
  return {
    r: clampByte(base.r + (target.r - base.r) * t),
    g: clampByte(base.g + (target.g - base.g) * t),
    b: clampByte(base.b + (target.b - base.b) * t),
  };
}

function relativeLuminance({ r, g, b }: RGB): number {
  const toLinear = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };

  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function resolveTheme(
  preference: ThemePreference,
  systemTheme: ResolvedTheme,
): ResolvedTheme {
  return preference === "system" ? systemTheme : preference;
}

function parseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getLegacyBoolean(key: string, fallback: boolean): boolean {
  if (!isBrowser) return fallback;
  const value = window.localStorage.getItem(key);
  if (value === null) return fallback;
  return value !== "false";
}

function getInitialAppearanceState(): AppearancePersistedState {
  if (!isBrowser) return DEFAULT_APPEARANCE;

  const persisted = parseJSON<Partial<AppearancePersistedState>>(
    window.localStorage.getItem(APPEARANCE_STORAGE_KEY),
  );
  if (persisted) {
    return {
      ...DEFAULT_APPEARANCE,
      ...persisted,
    };
  }

  const legacyTheme = window.localStorage.getItem(LEGACY_KEYS.theme);
  const legacyFontSize = window.localStorage.getItem(LEGACY_KEYS.fontSize);
  const legacyAccent = window.localStorage.getItem(LEGACY_KEYS.accentColor);
  const legacyLang = window.localStorage.getItem(LEGACY_KEYS.language);

  return {
    themePreference:
      legacyTheme === "light" || legacyTheme === "dark"
        ? legacyTheme
        : DEFAULT_APPEARANCE.themePreference,
    fontFamily: DEFAULT_APPEARANCE.fontFamily,
    fontSize:
      legacyFontSize === "small" ||
      legacyFontSize === "medium" ||
      legacyFontSize === "large"
        ? legacyFontSize
        : DEFAULT_APPEARANCE.fontSize,
    accentColor: legacyAccent || DEFAULT_APPEARANCE.accentColor,
    language: normalizeLanguage(legacyLang) || DEFAULT_APPEARANCE.language,
    lowStockAlerts: getLegacyBoolean(LEGACY_KEYS.lowStockAlerts, true),
    animationsEnabled: getLegacyBoolean(LEGACY_KEYS.animationsEnabled, true),
  };
}

function applyAppearanceToDom(
  state: Pick<
    AppearanceState,
    | "resolvedTheme"
    | "fontFamily"
    | "fontSize"
    | "accentColor"
    | "animationsEnabled"
  >,
) {
  if (!isBrowser) return;

  const root = document.documentElement;
  const normalizedAccent = normalizeHexColor(state.accentColor);
  const accentRgb = hexToRgb(normalizedAccent);
  const lightMixTarget =
    state.resolvedTheme === "dark"
      ? { r: 203, g: 213, b: 225 }
      : { r: 255, g: 255, b: 255 };
  const darkMixTarget =
    state.resolvedTheme === "dark"
      ? { r: 15, g: 23, b: 42 }
      : { r: 30, g: 41, b: 59 };

  const primaryLight = rgbToHex(
    mixColors(
      accentRgb,
      lightMixTarget,
      state.resolvedTheme === "dark" ? 0.3 : 0.2,
    ),
  );
  const primaryDark = rgbToHex(
    mixColors(
      accentRgb,
      darkMixTarget,
      state.resolvedTheme === "dark" ? 0.28 : 0.18,
    ),
  );
  const primaryContrast =
    relativeLuminance(accentRgb) > 0.45 ? "#0f172a" : "#ffffff";

  root.classList.toggle("dark", state.resolvedTheme === "dark");
  root.dataset.theme = state.resolvedTheme;
  root.dataset.density = "comfortable";

  root.style.setProperty("--app-font-family", FONT_MAP[state.fontFamily]);
  root.style.setProperty("--font-size-base", FONT_SIZE_MAP[state.fontSize]);
  root.style.setProperty("--table-row-height", "40px");
  root.style.setProperty("--input-height", "38px");
  // Accent color variables are intentionally NOT written to the DOM.
  // The accent color setting is persisted in state for future use but has
  // no visual effect — all UI colours are fixed and independent of accent.
  root.style.setProperty(
    "--motion-factor",
    state.animationsEnabled ? "1" : "0",
  );
}

const initialPersisted = getInitialAppearanceState();
const initialSystemTheme = getSystemTheme();
const initialResolvedTheme = resolveTheme(
  initialPersisted.themePreference,
  initialSystemTheme,
);

export const useAppearanceStore = create<AppearanceState>()(
  persist(
    (set, get) => ({
      ...initialPersisted,
      systemTheme: initialSystemTheme,
      resolvedTheme: initialResolvedTheme,

      setThemePreference: (themePreference) =>
        set((state) => {
          const resolvedTheme = resolveTheme(
            themePreference,
            state.systemTheme,
          );
          const next = { themePreference, resolvedTheme };
          applyAppearanceToDom({ ...state, ...next });
          return next;
        }),

      setFontFamily: (fontFamily) =>
        set((state) => {
          const next = { fontFamily };
          applyAppearanceToDom({ ...state, ...next });
          return next;
        }),

      setFontSize: (fontSize) =>
        set((state) => {
          const next = { fontSize };
          applyAppearanceToDom({ ...state, ...next });
          return next;
        }),

      setAccentColor: (accentColor) =>
        set((state) => {
          const next = { accentColor };
          applyAppearanceToDom({ ...state, ...next });
          return next;
        }),

      setLanguage: (language) => set({ language: normalizeLanguage(language) }),

      toggleTheme: () => {
        const state = get();
        const nextPreference: ThemePreference =
          state.resolvedTheme === "dark" ? "light" : "dark";
        get().setThemePreference(nextPreference);
      },

      setSystemTheme: (systemTheme) =>
        set((state) => {
          const resolvedTheme = resolveTheme(
            state.themePreference,
            systemTheme,
          );
          const next = { systemTheme, resolvedTheme };
          applyAppearanceToDom({ ...state, ...next });
          return next;
        }),

      resetAppearance: () =>
        set((state) => {
          const reset = {
            ...DEFAULT_APPEARANCE,
            systemTheme: state.systemTheme,
            resolvedTheme: resolveTheme(
              DEFAULT_APPEARANCE.themePreference,
              state.systemTheme,
            ),
          };
          applyAppearanceToDom(reset);
          return reset;
        }),
    }),
    {
      name: APPEARANCE_STORAGE_KEY,
      partialize: (state) => ({
        themePreference: state.themePreference,
        fontFamily: state.fontFamily,
        fontSize: state.fontSize,
        accentColor: state.accentColor,
        language: state.language,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const resolvedTheme = resolveTheme(
          state.themePreference,
          state.systemTheme,
        );
        state.resolvedTheme = resolvedTheme;
        applyAppearanceToDom({ ...state, resolvedTheme });
      },
    },
  ),
);

export function initAppearanceSystem() {
  const state = useAppearanceStore.getState();
  applyAppearanceToDom(state);

  if (!isBrowser) return;

  const darkMedia = window.matchMedia("(prefers-color-scheme: dark)");
  const reduceMotionMedia = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );
  const contrastMedia = window.matchMedia(
    "(forced-colors: active), (prefers-contrast: more)",
  );

  const handleThemeChange = (e: MediaQueryListEvent) => {
    useAppearanceStore.getState().setSystemTheme(e.matches ? "dark" : "light");
  };

  const applyAccessibilityFlags = () => {
    document.documentElement.dataset.reducedMotion = reduceMotionMedia.matches
      ? "true"
      : "false";
    document.documentElement.dataset.highContrast = contrastMedia.matches
      ? "true"
      : "false";
  };

  const handleReducedMotion = () => applyAccessibilityFlags();
  const handleContrast = () => applyAccessibilityFlags();

  darkMedia.addEventListener("change", handleThemeChange);
  reduceMotionMedia.addEventListener("change", handleReducedMotion);
  contrastMedia.addEventListener("change", handleContrast);

  applyAccessibilityFlags();
}
