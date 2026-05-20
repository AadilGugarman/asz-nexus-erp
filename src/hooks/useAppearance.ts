import { useAppearanceStore } from '@/store/appearance.store';

export const useAppearance = () => {
  const themePreference = useAppearanceStore((s) => s.themePreference);
  const resolvedTheme = useAppearanceStore((s) => s.resolvedTheme);
  const fontFamily = useAppearanceStore((s) => s.fontFamily);
  const fontSize = useAppearanceStore((s) => s.fontSize);
  const density = useAppearanceStore((s) => s.density);
  const accentColor = useAppearanceStore((s) => s.accentColor);
  const language = useAppearanceStore((s) => s.language);
  const lowStockAlerts = useAppearanceStore((s) => s.lowStockAlerts);
  const animationsEnabled = useAppearanceStore((s) => s.animationsEnabled);

  const setThemePreference = useAppearanceStore((s) => s.setThemePreference);
  const setFontFamily = useAppearanceStore((s) => s.setFontFamily);
  const setFontSize = useAppearanceStore((s) => s.setFontSize);
  const setDensity = useAppearanceStore((s) => s.setDensity);
  const setAccentColor = useAppearanceStore((s) => s.setAccentColor);
  const setLanguage = useAppearanceStore((s) => s.setLanguage);
  const setLowStockAlerts = useAppearanceStore((s) => s.setLowStockAlerts);
  const setAnimationsEnabled = useAppearanceStore((s) => s.setAnimationsEnabled);
  const toggleTheme = useAppearanceStore((s) => s.toggleTheme);
  const resetAppearance = useAppearanceStore((s) => s.resetAppearance);

  return {
    themePreference,
    resolvedTheme,
    fontFamily,
    fontSize,
    density,
    accentColor,
    language,
    lowStockAlerts,
    animationsEnabled,
    setThemePreference,
    setFontFamily,
    setFontSize,
    setDensity,
    setAccentColor,
    setLanguage,
    setLowStockAlerts,
    setAnimationsEnabled,
    toggleTheme,
    resetAppearance,
  };
};
