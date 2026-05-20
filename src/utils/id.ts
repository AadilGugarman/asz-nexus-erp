/**
 * utils/id.ts
 * Lightweight ID generators — no external dependency needed.
 */

/** Generate a short unique ID (collision-safe for client-side use) */
export function generateId(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 9);
  const ts = Date.now().toString(36);
  return prefix ? `${prefix}-${ts}${rand}` : `${ts}${rand}`;
}

/** Generate a sequential invoice/bill number with prefix and padding */
export function generateDocNo(prefix: string, nextNo: number, pad = 4): string {
  return `${prefix}-${String(nextNo).padStart(pad, '0')}`;
}
