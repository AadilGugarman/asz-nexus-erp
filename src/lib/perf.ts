/**
 * lib/perf.ts
 * Lightweight performance utilities for the desktop app.
 *
 * - Startup timer: measures time from script load to interactive
 * - Memory monitor: logs heap usage in dev (Tauri exposes performance.memory)
 * - Mark/measure wrappers: named User Timing marks for DevTools profiling
 *
 * All functions are no-ops in production builds (tree-shaken away).
 */

const IS_DEV = import.meta.env.DEV;

// ── Startup timer ─────────────────────────────────────────────────────────────

const _start = performance.now();

export const perf = {
  /** Log a named milestone with elapsed time since module load. */
  mark(label: string): void {
    if (!IS_DEV) return;
    const ms = (performance.now() - _start).toFixed(1);
    console.info(`[perf] ${label} — ${ms}ms`);
    // Also write a User Timing mark so it shows in DevTools Performance tab
    try { performance.mark(`tfc:${label}`); } catch { /* ignore */ }
  },

  /** Measure between two marks and log the duration. */
  measure(name: string, startMark: string, endMark: string): void {
    if (!IS_DEV) return;
    try {
      performance.measure(`tfc:${name}`, `tfc:${startMark}`, `tfc:${endMark}`);
      const entries = performance.getEntriesByName(`tfc:${name}`);
      const last = entries[entries.length - 1];
      if (last) console.info(`[perf] ${name} = ${last.duration.toFixed(1)}ms`);
    } catch { /* ignore */ }
  },

  /** Log current JS heap usage (only available in Chromium-based webviews). */
  logMemory(label = 'heap'): void {
    if (!IS_DEV) return;
    const mem = (performance as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
    if (!mem) return;
    const used  = (mem.usedJSHeapSize  / 1_048_576).toFixed(1);
    const total = (mem.totalJSHeapSize / 1_048_576).toFixed(1);
    console.info(`[perf] ${label}: ${used}MB / ${total}MB`);
  },

  /** Start a named timer. Returns a stop function that logs the duration. */
  time(label: string): () => void {
    if (!IS_DEV) return () => {};
    const t = performance.now();
    return () => {
      const ms = (performance.now() - t).toFixed(1);
      console.info(`[perf] ${label} took ${ms}ms`);
    };
  },
};

// ── Memory pressure monitor ───────────────────────────────────────────────────

/**
 * Start a periodic memory monitor in dev mode.
 * Logs heap usage every `intervalMs` milliseconds.
 * Returns a cleanup function.
 */
export function startMemoryMonitor(intervalMs = 30_000): () => void {
  if (!IS_DEV) return () => {};

  const id = setInterval(() => perf.logMemory('periodic'), intervalMs);
  return () => clearInterval(id);
}

// ── Render counter (dev only) ─────────────────────────────────────────────────

const _renderCounts = new Map<string, number>();

/**
 * Call inside a component to count renders in dev.
 * Logs a warning when a component renders more than `warnAt` times.
 *
 * @example
 *   countRender('SalesBillingModule', 5);
 */
export function countRender(name: string, warnAt = 10): void {
  if (!IS_DEV) return;
  const count = (_renderCounts.get(name) ?? 0) + 1;
  _renderCounts.set(name, count);
  if (count >= warnAt) {
    console.warn(`[perf] ${name} has rendered ${count} times — check for unnecessary re-renders`);
  }
}
