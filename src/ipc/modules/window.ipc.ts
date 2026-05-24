/**
 * ipc/modules/window.ipc.ts
 * Frontend IPC module for window management.
 *
 * All commands default to the "main" window when no label is supplied.
 *
 * Usage:
 *   import { ipc } from '@/ipc';
 *
 *   await ipc.win.minimize();
 *   await ipc.win.maximize();
 *   await ipc.win.close();
 *   await ipc.win.startDrag();          // call on titlebar mousedown
 *
 *   const state = await ipc.win.getState();
 *   console.log(state.is_maximized);
 *
 *   // Open a child window
 *   await ipc.win.open({
 *     label: 'invoice-preview',
 *     title: 'Invoice Preview',
 *     url:   '/invoice-preview',
 *     width: 900, height: 700,
 *   });
 */

import { ipcInvoke } from '../invoke';
import { CMD } from '../commands';
import type {
  WinState,
  WinOpenRequest,
  WinSetSizeRequest,
  WinSetPositionRequest,
  WinSetTitleRequest,
  WinSetAlwaysOnTopRequest,
} from '../types';

// ── Browser-mode fallback state ───────────────────────────────────────────────

const FALLBACK_STATE: WinState = {
  label: 'main', title: 'ASZ Nexus ERP',
  is_visible: true, is_focused: true,
  is_maximized: false, is_minimized: false, is_fullscreen: false,
  width: 1280, height: 800, x: 0, y: 0,
};

// ── Module ────────────────────────────────────────────────────────────────────

export const windowIpc = {
  /** Minimise a window (default: main). */
  minimize(label?: string): Promise<boolean> {
    return ipcInvoke<boolean>(CMD.win.minimize, { payload: { label } }, false);
  },

  /**
   * Toggle maximise/restore on a window (default: main).
   * If the window is already maximised, it will be restored.
   */
  maximize(label?: string): Promise<boolean> {
    return ipcInvoke<boolean>(CMD.win.maximize, { payload: { label } }, false);
  },

  /** Restore a maximised window to its previous size (default: main). */
  unmaximize(label?: string): Promise<boolean> {
    return ipcInvoke<boolean>(CMD.win.unmaximize, { payload: { label } }, false);
  },

  /** Close a window (default: main). */
  close(label?: string): Promise<boolean> {
    return ipcInvoke<boolean>(CMD.win.close, { payload: { label } }, false);
  },

  /** Hide a window without closing it (default: main). */
  hide(label?: string): Promise<boolean> {
    return ipcInvoke<boolean>(CMD.win.hide, { payload: { label } }, false);
  },

  /** Show and focus a hidden window (default: main). */
  show(label?: string): Promise<boolean> {
    return ipcInvoke<boolean>(CMD.win.show, { payload: { label } }, false);
  },

  /**
   * Toggle fullscreen on a window (default: main).
   * Returns the new fullscreen state (true = now fullscreen).
   */
  toggleFullscreen(label?: string): Promise<boolean> {
    return ipcInvoke<boolean>(CMD.win.toggleFullscreen, { payload: { label } }, false);
  },

  /** Pin/unpin a window above all others (default: main). */
  setAlwaysOnTop(req: WinSetAlwaysOnTopRequest): Promise<boolean> {
    return ipcInvoke<boolean>(CMD.win.setAlwaysOnTop, { payload: req }, false);
  },

  /** Update the OS window title (default: main). */
  setTitle(req: WinSetTitleRequest): Promise<boolean> {
    return ipcInvoke<boolean>(CMD.win.setTitle, { payload: req }, false);
  },

  /** Resize a window in logical pixels (default: main). */
  setSize(req: WinSetSizeRequest): Promise<boolean> {
    return ipcInvoke<boolean>(CMD.win.setSize, { payload: req }, false);
  },

  /** Move a window to a logical position (default: main). */
  setPosition(req: WinSetPositionRequest): Promise<boolean> {
    return ipcInvoke<boolean>(CMD.win.setPosition, { payload: req }, false);
  },

  /** Centre a window on the current monitor (default: main). */
  center(label?: string): Promise<boolean> {
    return ipcInvoke<boolean>(CMD.win.center, { payload: { label } }, false);
  },

  /**
   * Get the current state of a window (default: main).
   * Returns size, position, and boolean flags.
   */
  getState(label?: string): Promise<WinState> {
    return ipcInvoke<WinState>(
      CMD.win.getState,
      { payload: { label } },
      FALLBACK_STATE,
    );
  },

  /**
   * Open a new child window (or focus it if already open).
   * Returns the window label.
   */
  open(req: WinOpenRequest): Promise<string> {
    return ipcInvoke<string>(CMD.win.open, { payload: req }, req.label);
  },

  /** List all open window labels. */
  list(): Promise<string[]> {
    return ipcInvoke<string[]>(CMD.win.list, undefined, ['main']);
  },

  /**
   * Begin a native window drag from the custom titlebar.
   * Call this inside a mousedown handler on the drag region.
   *
   * @example
   *   <div onMouseDown={() => ipc.win.startDrag()} data-tauri-drag-region />
   */
  startDrag(label?: string): Promise<boolean> {
    return ipcInvoke<boolean>(CMD.win.startDrag, { payload: { label } }, false);
  },
};
