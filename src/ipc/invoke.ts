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
      console.info(`[ipc] DEV — invoke("${command}") skipped, returning fallback.`, args);
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
    const { invoke } = await import('@tauri-apps/api/core' as any);
    const response: IpcResponse<T> = await (
      invoke as (cmd: string, args?: object) => Promise<IpcResponse<T>>
    )(command, args);

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
    const message = err instanceof Error ? err.message : String(err);
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
