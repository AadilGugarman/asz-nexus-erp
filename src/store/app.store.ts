import { create } from 'zustand';
import { useAppearanceStore } from './appearance.store';

type ThemeMode = 'dark' | 'light';

interface AppState {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (t: ThemeMode) => void;
}

export const useAppStore = create<AppState>()(() => ({
  theme: useAppearanceStore.getState().resolvedTheme,
  toggleTheme: () => useAppearanceStore.getState().toggleTheme(),
  setTheme: (t) => useAppearanceStore.getState().setThemePreference(t),
}));

useAppearanceStore.subscribe((state) => {
  useAppStore.setState({ theme: state.resolvedTheme });
});
