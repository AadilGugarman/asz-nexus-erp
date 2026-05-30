/**
 * lib/tauri-mock.ts
 * Dev-mode shims for @tauri-apps/* packages.
 *
 * Vite resolves these during `npm run dev` (browser mode).
 * In the real Tauri build, the actual runtime modules are used instead.
 *
 * These shims are ONLY active when isTauri === false.
 * All real code paths are already guarded by APP_CONFIG.isTauri checks,
 * so these functions should never actually be called — they exist purely
 * to satisfy Vite's module resolver.
 */

// ── @tauri-apps/api/core ──────────────────────────────────────────────────────
export async function invoke(_cmd: string, _args?: unknown): Promise<unknown> {
  return undefined;
}

// ── @tauri-apps/api/event ─────────────────────────────────────────────────────
export async function listen(
  _event: string,
  _handler: (_e: unknown) => void,
): Promise<() => void> {
  return () => {};
}

export async function emit(_event: string, _payload?: unknown): Promise<void> {}

export async function once(
  _event: string,
  _handler: (_e: unknown) => void,
): Promise<() => void> {
  return () => {};
}

// ── @tauri-apps/plugin-sql ────────────────────────────────────────────────────
const Database = {
  load: async (_url: string) => ({
    execute: async (_sql: string, _params: unknown[]) => {},
    select: async (_sql: string, _params: unknown[]) =>
      [] as Record<string, unknown>[],
    close: async () => {},
  }),
};
export default Database;

// ── @tauri-apps/plugin-dialog ─────────────────────────────────────────────────
export async function save(_opts?: unknown): Promise<string | null> {
  return null;
}
export async function open(_opts?: unknown): Promise<string | string[] | null> {
  return null;
}

// ── @tauri-apps/api/window ───────────────────────────────────────────────────
export function getCurrentWindow() {
  return {
    show: async () => {},
    setFocus: async () => {},
    hide: async () => {},
    minimize: async () => {},
    maximize: async () => {},
    unmaximize: async () => {},
    close: async () => {},
  };
}
