/**
 * lib/tauri.ts
 * Safe Tauri invoke wrapper.
 *
 * - Works in both Tauri (desktop) and browser (dev/web) environments.
 * - In browser mode it logs a warning and returns a typed fallback.
 * - Centralises all IPC calls so you never scatter `invoke` across components.
 *
 * Usage:
 *   import { tauriInvoke } from '@/lib/tauri';
 *   const result = await tauriInvoke<string>('greet', { name: 'World' });
 *
 * NOTE: @tauri-apps/api and @tauri-apps/plugin-dialog are only available
 * at runtime inside a Tauri binary. They are NOT npm packages you install
 * in the web project — Tauri injects them via the Rust backend.
 * The dynamic imports below are guarded by APP_CONFIG.isTauri so they
 * never execute in browser/dev mode.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { APP_CONFIG } from "@/config";

type TauriInvokeArgs = Record<string, unknown>;

/**
 * Invoke a Tauri command safely.
 * @param cmd   - Rust command name (snake_case, matches #[tauri::command])
 * @param args  - Arguments passed to the command
 * @param fallback - Value returned when running outside Tauri (browser dev mode)
 */
export async function tauriInvoke<T>(
  cmd: string,
  args?: TauriInvokeArgs,
  fallback?: T,
): Promise<T> {
  if (!APP_CONFIG.isTauri) {
    if (import.meta.env.DEV) {
      console.debug(
        `[tauri] Running outside Tauri — invoke("${cmd}") skipped. Returning fallback.`,
      );
    }
    return fallback as T;
  }

  const tauriInternals = (window as any).__TAURI_INTERNALS__;
  if (tauriInternals?.invoke) {
    return (
      tauriInternals.invoke as (
        cmd: string,
        args?: TauriInvokeArgs,
      ) => Promise<T>
    )(cmd, args);
  }

  if (import.meta.env.DEV) {
    console.warn(
      `[tauri] Tauri runtime not available yet for invoke("${cmd}"). Returning fallback.`,
    );
    return fallback as T;
  }

  const { invoke } = await import("@tauri-apps/api/core" as any);
  return (invoke as (cmd: string, args?: TauriInvokeArgs) => Promise<T>)(
    cmd,
    args,
  );
}

/**
 * Convenience: open a native file-save dialog.
 * Requires `dialog` permission in tauri.conf.json.
 */
export async function tauriSaveDialog(options?: {
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}): Promise<string | null> {
  if (!APP_CONFIG.isTauri) return null;
  const { save } = await import("@tauri-apps/plugin-dialog" as any);
  return (save as (opts?: typeof options) => Promise<string | null>)(options);
}

/**
 * Convenience: open a native file-open dialog.
 */
export async function tauriOpenDialog(options?: {
  multiple?: boolean;
  filters?: Array<{ name: string; extensions: string[] }>;
}): Promise<string | string[] | null> {
  if (!APP_CONFIG.isTauri) return null;
  const { open } = await import("@tauri-apps/plugin-dialog" as any);
  return (open as (opts?: typeof options) => Promise<string | string[] | null>)(
    options,
  );
}
