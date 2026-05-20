/**
 * store/ui.store.ts
 * Global UI state managed by Zustand.
 * Handles sidebar, active tab, modals — anything that multiple components share.
 *
 * Usage:
 *   import { useUIStore } from '@/store';
 *   const { activeTab, setActiveTab } = useUIStore();
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TabId =
  | 'dashboard'
  | 'arrival'
  | 'purchase'
  | 'sales'
  | 'inventory'
  | 'parties'
  | 'payments'
  | 'reports'
  | 'suppliers'
  | 'customers'
  | 'settings';

interface UIState {
  activeTab: TabId;
  sidebarCollapsed: boolean;
  isShortcutsOpen: boolean;

  setActiveTab: (tab: TabId) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  openShortcuts: () => void;
  closeShortcuts: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeTab: 'dashboard',
      sidebarCollapsed: false,
      isShortcutsOpen: false,

      setActiveTab: (tab) => set({ activeTab: tab }),
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      openShortcuts: () => set({ isShortcutsOpen: true }),
      closeShortcuts: () => set({ isShortcutsOpen: false }),
    }),
    {
      name: 'tfc-ui-store', // localStorage key
      partialize: (s) => ({
        activeTab: s.activeTab,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    },
  ),
);
