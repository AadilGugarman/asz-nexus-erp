/**
 * hooks/useWindow.ts
 * Reusable hook for window management.
 *
 * Syncs the Zustand window store with the real Tauri window state on mount,
 * and subscribes to Tauri window events (resize, focus, blur, move) so the
 * titlebar always reflects the true state without polling.
 *
 * Usage:
 *   const win = useWindow();
 *
 *   // Titlebar controls
 *   <button onMouseDown={win.startDrag} />
 *   <button onClick={win.minimize} />
 *   <button onClick={win.toggleMaximize} />
 *   <button onClick={win.close} />
 *
 *   // Read state
 *   win.isMaximized   // boolean
 *   win.isFullscreen  // boolean
 *   win.alwaysOnTop   // boolean
 *
 *   // Open a child window
 *   await win.openWindow({ label: 'preview', title: 'Preview', url: '/preview' });
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect } from 'react';
import { APP_CONFIG } from '@/config';
import { ipc } from '@/ipc';
import { useWindowStore } from '@/store';
import type { WinOpenRequest } from '@/ipc';

export interface UseWindowReturn {
  // ── State (from store) ──────────────────────────────────────────────────────
  isMaximized:   boolean;
  isMinimized:   boolean;
  isFullscreen:  boolean;
  isAlwaysOnTop: boolean;
  isFocused:     boolean;
  title:         string;

  // ── Controls ────────────────────────────────────────────────────────────────
  /** Begin native window drag — call on mousedown of the drag region. */
  startDrag:       () => void;
  minimize:        () => Promise<void>;
  toggleMaximize:  () => Promise<void>;
  close:           () => Promise<void>;
  toggleFullscreen:() => Promise<void>;
  toggleAlwaysOnTop:() => Promise<void>;
  center:          () => Promise<void>;
  setTitle:        (title: string) => Promise<void>;

  // ── Multi-window ─────────────────────────────────────────────────────────────
  openWindow:  (req: WinOpenRequest) => Promise<void>;
  closeWindow: (label: string) => Promise<void>;
  listWindows: () => Promise<string[]>;
}

export function useWindow(): UseWindowReturn {
  const store = useWindowStore();

  // ── Sync state from Tauri on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!APP_CONFIG.isTauri) return;

    ipc.win.getState().then((s) => store.syncFromState(s)).catch(() => {});

    // Subscribe to Tauri window events for live updates.
    let unlisten: (() => void)[] = [];

    (async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window' as any);
        const win = getCurrentWindow();

        unlisten.push(
          await win.onResized(() => {
            ipc.win.getState().then((s) => store.syncFromState(s)).catch(() => {});
          }),
          await win.onFocusChanged(({ payload: focused }: { payload: boolean }) => {
            store.setFocused(focused);
          }),
          await win.onMoved(() => {
            // No state change needed for position, but keep in sync if needed.
          }),
        );
      } catch {
        // Tauri API not available — dev browser mode.
      }
    })();

    return () => {
      unlisten.forEach((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Controls ────────────────────────────────────────────────────────────────

  const startDrag = useCallback(() => {
    ipc.win.startDrag().catch(() => {});
  }, []);

  const minimize = useCallback(async () => {
    await ipc.win.minimize();
    store.setMinimized(true);
  }, [store]);

  const toggleMaximize = useCallback(async () => {
    await ipc.win.maximize();
    // Re-query because maximize() toggles — we don't know the new state.
    const s = await ipc.win.getState();
    store.syncFromState(s);
  }, [store]);

  const close = useCallback(async () => {
    await ipc.win.close();
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const isNowFull = await ipc.win.toggleFullscreen();
    store.setFullscreen(isNowFull);
  }, [store]);

  const toggleAlwaysOnTop = useCallback(async () => {
    const next = !store.isAlwaysOnTop;
    await ipc.win.setAlwaysOnTop({ on_top: next });
    store.setAlwaysOnTop(next);
  }, [store]);

  const center = useCallback(async () => {
    await ipc.win.center();
  }, []);

  const setTitle = useCallback(async (title: string) => {
    await ipc.win.setTitle({ title });
    store.setTitle(title);
  }, [store]);

  // ── Multi-window ─────────────────────────────────────────────────────────────

  const openWindow = useCallback(async (req: WinOpenRequest) => {
    await ipc.win.open(req);
  }, []);

  const closeWindow = useCallback(async (label: string) => {
    await ipc.win.close(label);
  }, []);

  const listWindows = useCallback(async () => {
    return ipc.win.list();
  }, []);

  return {
    isMaximized:    store.isMaximized,
    isMinimized:    store.isMinimized,
    isFullscreen:   store.isFullscreen,
    isAlwaysOnTop:  store.isAlwaysOnTop,
    isFocused:      store.isFocused,
    title:          store.title,
    startDrag,
    minimize,
    toggleMaximize,
    close,
    toggleFullscreen,
    toggleAlwaysOnTop,
    center,
    setTitle,
    openWindow,
    closeWindow,
    listWindows,
  };
}
