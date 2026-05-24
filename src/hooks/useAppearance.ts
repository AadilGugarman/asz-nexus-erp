import { useAppearanceStore } from '@/store/appearance.store';

export const useAppearance = () => {
  const themePreference = useAppearanceStore((s) => s.themePreference);
  const resolvedTheme = useAppearanceStore((s) => s.resolvedTheme);
  const fontFamily = useAppearanceStore((s) => s.fontFamily);
  const fontSize = useAppearanceStore((s) => s.fontSize);
  const accentColor = useAppearanceStore((s) => s.accentColor);
  const language = useAppearanceStore((s) => s.language);

  const setThemePreference = useAppearanceStore((s) => s.setThemePreference);
  const setFontFamily = useAppearanceStore((s) => s.setFontFamily);
  const setFontSize = useAppearanceStore((s) => s.setFontSize);
  const setAccentColor = useAppearanceStore((s) => s.setAccentColor);
  const setLanguage = useAppearanceStore((s) => s.setLanguage);
  const toggleTheme = useAppearanceStore((s) => s.toggleTheme);
  const resetAppearance = useAppearanceStore((s) => s.resetAppearance);

  return {
    themePreference,
    resolvedTheme,
    fontFamily,
    fontSize,
    accentColor,
    language,
    setThemePreference,
    setFontFamily,
    setFontSize,
    setAccentColor,
    setLanguage,
    toggleTheme,
    resetAppearance,
  };
};
