/**
 * store/window.store.ts
 * Reactive window state for the custom titlebar.
 *
 * Syncs with the real Tauri window state on mount and after every
 * control action. In browser dev mode it uses sensible defaults.
 *
 * Usage:
 *   import { useWindowStore } from '@/store';
 *   const { isMaximized, isFullscreen, alwaysOnTop } = useWindowStore();
 */

import { create } from 'zustand';

interface WindowStoreState {
  isMaximized:   boolean;
  isMinimized:   boolean;
  isFullscreen:  boolean;
  isAlwaysOnTop: boolean;
  isFocused:     boolean;
  title:         string;

  setMaximized:   (v: boolean) => void;
  setMinimized:   (v: boolean) => void;
  setFullscreen:  (v: boolean) => void;
  setAlwaysOnTop: (v: boolean) => void;
  setFocused:     (v: boolean) => void;
  setTitle:       (t: string)  => void;

  /** Sync all flags from a WinState snapshot. */
  syncFromState: (s: {
    is_maximized:  boolean;
    is_minimized:  boolean;
    is_fullscreen: boolean;
    is_focused:    boolean;
    title:         string;
  }) => void;
}

export const useWindowStore = create<WindowStoreState>()((set) => ({
  isMaximized:   false,
  isMinimized:   false,
  isFullscreen:  false,
  isAlwaysOnTop: false,
  isFocused:     true,
  title:         'TFC ERP',

  setMaximized:   (v) => set({ isMaximized: v }),
  setMinimized:   (v) => set({ isMinimized: v }),
  setFullscreen:  (v) => set({ isFullscreen: v }),
  setAlwaysOnTop: (v) => set({ isAlwaysOnTop: v }),
  setFocused:     (v) => set({ isFocused: v }),
  setTitle:       (t) => set({ title: t }),

  syncFromState: (s) =>
    set({
      isMaximized:  s.is_maximized,
      isMinimized:  s.is_minimized,
      isFullscreen: s.is_fullscreen,
      isFocused:    s.is_focused,
      title:        s.title,
    }),
}));
