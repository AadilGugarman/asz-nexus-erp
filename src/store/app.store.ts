/**
 * store/app.store.ts
 * Global application-level state (theme, FY, company selection).
 * Mirrors the parts of AppContext that are truly "global" so they can be
 * consumed outside the React tree (e.g. in services or hooks).
 *
 * NOTE: The existing AppContext still owns the data arrays (suppliers,
 * invoices, etc.). This store handles lightweight cross-cutting concerns.
 *
 * Usage:
 *   import { useAppStore } from '@/store';
 *   const { theme, toggleTheme } = useAppStore();
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/config';

type ThemeMode = 'dark' | 'light';

interface AppState {
  theme: ThemeMode;
  activeFY: string;
  activeCompanyId: string;

  toggleTheme: () => void;
  setTheme: (t: ThemeMode) => void;
  setActiveFY: (fy: string) => void;
  setActiveCompanyId: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      activeFY: '',
      activeCompanyId: 'co-default',

      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'dark' ? 'light' : 'dark';
          // Keep DOM in sync
          document.documentElement.classList.toggle('dark', next === 'dark');
          return { theme: next };
        }),

      setTheme: (t) => {
        document.documentElement.classList.toggle('dark', t === 'dark');
        set({ theme: t });
      },

      setActiveFY: (fy) => set({ activeFY: fy }),
      setActiveCompanyId: (id) => set({ activeCompanyId: id }),
    }),
    {
      name: STORAGE_KEYS.theme, // reuse existing key so theme persists
      partialize: (s) => ({
        theme: s.theme,
        activeFY: s.activeFY,
        activeCompanyId: s.activeCompanyId,
      }),
    },
  ),
);
