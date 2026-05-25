/**
 * services/production.service.ts
 * Production-only startup helpers.
 *
 * - Emits "app_fully_hydrated" once after first React paint.
 * - Adds a background visibility listener and performs a best-effort
 *   native memory trim request when app becomes hidden/minimized.
 */

import { APP_CONFIG } from '@/config';

let listenersAttached = false;
let hydratedEmitted = false;
let nativeTrimUnsupported = false;

function log(msg: string, err?: unknown): void {
  if (!import.meta.env.DEV) return;
  if (err) {
    console.warn(`[production] ${msg}`, err);
    return;
  }
  console.info(`[production] ${msg}`);
}

async function emitHydratedEvent(): Promise<void> {
  if (hydratedEmitted) return;
  hydratedEmitted = true;

  // Always emit a browser event for local observability/tools.
  window.dispatchEvent(new CustomEvent('app_fully_hydrated'));

  if (!APP_CONFIG.isTauri) return;

  try {
    const { emit } = await import('@tauri-apps/api/event' as never as string) as {
      emit: (event: string, payload?: Record<string, unknown>) => Promise<void>;
    };
    await emit('app_fully_hydrated', { ts: Date.now() });
  } catch (err) {
    // Non-fatal by design.
    log('failed to emit Tauri hydrated event', err);
  }
}

async function requestNativeMemoryTrim(reason: string): Promise<void> {
  if (!APP_CONFIG.isTauri || nativeTrimUnsupported) return;

  try {
    const { invoke } = await import('@tauri-apps/api/core' as never as string) as {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
    };

    // Best-effort optional command. If backend has no implementation,
    // we mark unsupported and silently stop retrying.
    await invoke('app_trim_memory', { payload: { reason } });
  } catch (err) {
    nativeTrimUnsupported = true;
    log('native memory trim not available (safe no-op)', err);
  }
}

async function maybeTrimOnBackground(reason: string): Promise<void> {
  if (document.visibilityState === 'hidden') {
    await requestNativeMemoryTrim(reason);
    return;
  }

  if (!APP_CONFIG.isTauri) return;

  try {
    const { ipc } = await import('@/ipc');
    const state = await ipc.win.getState();
    if (state.is_minimized || !state.is_visible) {
      await requestNativeMemoryTrim(reason);
    }
  } catch (err) {
    // Non-fatal; window state may be unavailable during very early startup.
    log('window state unavailable for memory trim check', err);
  }
}

/**
 * Wires production startup side-effects in a singleton-safe way.
 * Safe to call multiple times — guards with listenersAttached flag.
 *
 * Named initProductionStartup (not useProductionStartup) because this is
 * called from a service, not from a React component or hook.
 */
export function initProductionStartup(): void {
  void emitHydratedEvent();

  if (listenersAttached) return;
  listenersAttached = true;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void maybeTrimOnBackground('document_hidden');
    }
  });

  window.addEventListener('blur', () => {
    void maybeTrimOnBackground('window_blur');
  });
}
