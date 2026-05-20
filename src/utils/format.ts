/**
 * utils/format.ts
 * Formatting helpers used throughout the app.
 */

/** Format a number as Indian Rupees */
export function formatCurrency(
  amount: number,
  currency = 'INR',
  locale = 'en-IN',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format a number with Indian comma grouping (no currency symbol) */
export function formatNumber(amount: number, decimals = 2): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/** Format an ISO date string to DD/MM/YYYY */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Format an ISO date string to a readable label e.g. "13 May 2026" */
export function formatDateLong(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Truncate a string to maxLength with ellipsis */
export function truncate(str: string, maxLength = 30): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 1)}…`;
}

/** Capitalise first letter of each word */
export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
