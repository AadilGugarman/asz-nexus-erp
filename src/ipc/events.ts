/**
 * ipc/events.ts
 * Frontend listener helpers for Tauri backend events.
 *
 * Mirrors src-tauri/src/events/mod.rs — event name constants must match exactly.
 *
 * Usage:
 *   import { AppEvents } from '@/ipc';
 *
 *   // In a component or hook:
 *   useEffect(() => {
 *     const unlisten = AppEvents.onDataChanged((payload) => {
 *       if (payload.domain === 'suppliers') refetchSuppliers();
 *     });
 *     return () => { unlisten.then(fn => fn()); };
 *   }, []);
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { APP_CONFIG } from '@/config';
import type {
  TaskProgressPayload,
  TaskCompletePayload,
  TaskErrorPayload,
  DataChangedPayload,
} from './types';

// ── Event name constants (must match Rust names::* in events/mod.rs) ──────────
export const EVENT_NAMES = {
  APP_READY:       'app://ready',
  TASK_PROGRESS:   'task://progress',
  TASK_COMPLETE:   'task://complete',
  TASK_ERROR:      'task://error',
  DATA_CHANGED:    'data://changed',
  EXPORT_PROGRESS: 'export://progress',
} as const;

export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];

// ── Unlisten function type ────────────────────────────────────────────────────
type UnlistenFn = () => void;

// ── Core listen helper ────────────────────────────────────────────────────────

/**
 * Listen for a Tauri backend event.
 * Returns a Promise<UnlistenFn> — call the returned function to stop listening.
 * Safe in browser dev mode (no-op, returns a no-op unlisten).
 */
async function listenEvent<T>(
  event: string,
  handler: (payload: T) => void,
): Promise<UnlistenFn> {
  if (!APP_CONFIG.isTauri) {
    if (import.meta.env.DEV) {
      console.info(`[events] DEV — listen("${event}") skipped (no Tauri runtime)`);
    }
    return () => {};
  }

  // Use the real Tauri event plugin via __TAURI_INTERNALS__ to avoid
  // the Vite dev alias that maps @tauri-apps/api/event to the mock shim.
  const tauriInternals = (window as any).__TAURI_INTERNALS__;
  if (!tauriInternals?.invoke) {
    console.warn(`[events] Tauri IPC not available for event "${event}"`);
    return () => {};
  }
  // Register the callback and get its ID
  const callbackId: number = tauriInternals.transformCallback(
    (e: { payload: T }) => handler(e.payload),
    false,
  );
  await tauriInternals.invoke('plugin:event|listen', {
    event,
    target: { kind: 'Any' },
    handler: callbackId,
  });
  return () => {
    tauriInternals.invoke('plugin:event|unlisten', {
      event,
      eventId: callbackId,
    }).catch(() => {});
  };
}

// ── Typed event listeners ─────────────────────────────────────────────────────

export const AppEvents = {
  /**
   * Fires once when the Rust backend finishes initialisation.
   */
  onAppReady(handler: () => void): Promise<UnlistenFn> {
    return listenEvent<void>(EVENT_NAMES.APP_READY, handler);
  },

  /**
   * Fires during long-running background tasks with progress updates.
   * payload.percent is 0–100.
   */
  onTaskProgress(handler: (payload: TaskProgressPayload) => void): Promise<UnlistenFn> {
    return listenEvent<TaskProgressPayload>(EVENT_NAMES.TASK_PROGRESS, handler);
  },

  /**
   * Fires when a background task completes successfully.
   */
  onTaskComplete(handler: (payload: TaskCompletePayload) => void): Promise<UnlistenFn> {
    return listenEvent<TaskCompletePayload>(EVENT_NAMES.TASK_COMPLETE, handler);
  },

  /**
   * Fires when a background task fails.
   */
  onTaskError(handler: (payload: TaskErrorPayload) => void): Promise<UnlistenFn> {
    return listenEvent<TaskErrorPayload>(EVENT_NAMES.TASK_ERROR, handler);
  },

  /**
   * Fires when backend data changes (create/update/delete).
   * Use this to trigger refetches without polling.
   *
   * Example:
   *   AppEvents.onDataChanged((p) => {
   *     if (p.domain === 'invoices' && p.action === 'created') refetch();
   *   });
   */
  onDataChanged(handler: (payload: DataChangedPayload) => void): Promise<UnlistenFn> {
    return listenEvent<DataChangedPayload>(EVENT_NAMES.DATA_CHANGED, handler);
  },
};
