/**
 * ipc/invoke.ts
 * Core typed invoke helper.
 *
 * This is the single function all IPC modules call.
 * It handles:
 *   - Tauri environment detection (safe in browser dev mode)
 *   - Unwrapping the IpcResponse<T> envelope
 *   - Normalising errors into IpcCallError
 *   - Dev-mode logging
 *
 * You should NOT call this directly in components.
 * Use the domain modules (ipc.app, ipc.system, ipc.file) instead.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { APP_CONFIG } from '@/config';
import type { IpcResponse, IpcError } from './types';

// ── Error class ───────────────────────────────────────────────────────────────

/**
 * Thrown by ipcInvoke when the backend returns success: false
 * or when the invoke itself throws (e.g. command not found).
 */
export class IpcCallError extends Error {
  public readonly code: string;
  public readonly details?: string;

  constructor(error: IpcError | { code: string; message: string; details?: string }) {
    super(error.message);
    this.name = 'IpcCallError';
    this.code = error.code;
    this.details = error.details;
  }
}

// ── Core invoke ───────────────────────────────────────────────────────────────

/**
 * Typed Tauri invoke that unwraps IpcResponse<T>.
 *
 * @param command  - Rust command name (use CMD constants)
 * @param args     - Arguments passed to the command
 * @param fallback - Returned in browser dev mode (no Tauri runtime)
 * @throws IpcCallError on backend error or invoke failure
 */
export async function ipcInvoke<T>(
  command: string,
  args?: Record<string, unknown> | object,
  fallback?: T,
): Promise<T> {
  // ── Browser dev mode ──────────────────────────────────────────────────────
  if (!APP_CONFIG.isTauri) {
    if (import.meta.env.DEV) {
      console.info(
        `[ipc] DEV — invoke("${command}") skipped, returning fallback.`,
        args,
      );
      // Artificial delay in dev mode to simulate backend latency and allow UI state changes to be visible
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    if (fallback === undefined) {
      throw new IpcCallError({
        code: 'NOT_IN_TAURI',
        message: `Command "${command}" requires Tauri runtime. No fallback provided.`,
      });
    }
    return fallback as T;
  }

  // ── Tauri invoke ──────────────────────────────────────────────────────────
  if (import.meta.env.DEV) {
    console.debug(`[ipc] invoke("${command}")`, args);
  }

  try {
    // Use window.__TAURI_INTERNALS__.invoke directly instead of importing
    // @tauri-apps/api/core. In `npm run tauri dev`, Vite aliases that package
    // to a mock shim (tauri-mock.ts) which returns undefined for every call.
    // The __TAURI_INTERNALS__ object is injected by the Tauri runtime directly
    // onto window at startup — it bypasses Vite's module system entirely and
    // always points to the real IPC bridge.
    const tauriInternals = (window as any).__TAURI_INTERNALS__;
    if (!tauriInternals?.invoke) {
      throw new IpcCallError({
        code: 'NOT_IN_TAURI',
        message: `Tauri IPC bridge not available. __TAURI_INTERNALS__.invoke is missing.`,
      });
    }
    const invoke = tauriInternals.invoke as (cmd: string, args?: object) => Promise<IpcResponse<T>>;
    const response: IpcResponse<T> = await invoke(command, args);

    // ── Unwrap envelope ────────────────────────────────────────────────────
    if (!response.success || response.error) {
      throw new IpcCallError(
        response.error ?? { code: 'UNKNOWN_ERROR', message: 'Unknown backend error' },
      );
    }

    if (import.meta.env.DEV) {
      console.debug(`[ipc] response("${command}")`, response.data);
    }

    return response.data as T;
  } catch (err) {
    // Re-throw IpcCallError as-is
    if (err instanceof IpcCallError) throw err;

    // Wrap raw Tauri errors (e.g. command not registered)
    let message: string;
    if (err instanceof Error) {
      message = err.message;
    } else if (typeof err === 'object' && err !== null) {
      // Try to extract meaningful error info from object
      message = JSON.stringify(err);
    } else {
      message = String(err);
    }
    
    console.error('[ipc] Caught error during invoke:', err);
    throw new IpcCallError({ code: 'INTERNAL_ERROR', message });
  }
}

// ── Safe invoke (never throws) ────────────────────────────────────────────────

export interface SafeInvokeResult<T> {
  data: T | null;
  error: IpcCallError | null;
  ok: boolean;
}

/**
 * Like ipcInvoke but never throws — returns { data, error, ok }.
 * Use this when you want to handle errors inline without try/catch.
 *
 * const { data, error, ok } = await ipcInvokeSafe(CMD.app.ping, { message: 'hi' });
 */
export async function ipcInvokeSafe<T>(
  command: string,
  args?: Record<string, unknown> | object,
  fallback?: T,
): Promise<SafeInvokeResult<T>> {
  try {
    const data = await ipcInvoke<T>(command, args, fallback);
    return { data, error: null, ok: true };
  } catch (err) {
    const error = err instanceof IpcCallError
      ? err
      : new IpcCallError({ code: 'UNKNOWN_ERROR', message: String(err) });
    return { data: null, error, ok: false };
  }
}
