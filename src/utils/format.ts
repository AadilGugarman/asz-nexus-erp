/**
 * utils/format.ts
 * Formatting helpers used throughout the app.
 */

/** Format a number as Indian Rupees */
export function formatCurrency(
  amount: number,
  currency = "INR",
  locale = "en-IN",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format a number with Indian comma grouping (no currency symbol) */
export function formatNumber(amount: number, decimals = 2): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Format an ISO date string (YYYY-MM-DD or full ISO) to DD-MM-YYYY.
 * This is the canonical display format used everywhere in the app.
 */
export function fmtDate(dateStr: string): string {
  if (!dateStr) return "";
  // Handle both "YYYY-MM-DD" and full ISO strings
  const plain = dateStr.length > 10 ? dateStr.slice(0, 10) : dateStr;
  const [yyyy, mm, dd] = plain.split("-");
  if (!yyyy || !mm || !dd) return dateStr;
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Format an ISO date string to DD-MM-YYYY - Weekday
 * e.g. "23-05-2026 - Friday"
 */
export function fmtDateWithDay(dateStr: string): string {
  if (!dateStr) return "";
  const plain = dateStr.length > 10 ? dateStr.slice(0, 10) : dateStr;
  const [yyyy, mm, dd] = plain.split("-");
  if (!yyyy || !mm || !dd) return dateStr;
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  const day = d.toLocaleDateString("en-IN", { weekday: "long" });
  return `${dd}-${mm}-${yyyy} - ${day}`;
}

/** Format an ISO date string to a readable label e.g. "23 May 2026" */
export function formatDateLong(dateStr: string): string {
  if (!dateStr) return "";
  const plain = dateStr.length > 10 ? dateStr.slice(0, 10) : dateStr;
  const [yyyy, mm, dd] = plain.split("-");
  if (!yyyy || !mm || !dd) return dateStr;
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** @deprecated Use fmtDate() instead */
export const formatDate = fmtDate;

/** Truncate a string to maxLength with ellipsis */
export function truncate(str: string, maxLength = 30): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 1)}...`;
}

/** Capitalise first letter of each word */
export function titleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Round a currency value to 2 decimal places using banker's-safe arithmetic.
 * Avoids floating-point drift like 0.1 + 0.2 = 0.30000000000000004.
 * For INR (paise-level precision), this is sufficient.
 */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Sum an array of numbers with floating-point-safe rounding.
 * Use this instead of .reduce((s, v) => s + v, 0) for currency totals.
 */
export function sumCurrency(values: number[]): number {
  return roundCurrency(values.reduce((s, v) => s + (Number(v) || 0), 0));
}

// -- Fruit Pricing Helpers --

/**
 * Determine the pricing type for a fruit.
 * Mango is priced per KG (Weight - Rate/KG).
 * All other fruits are priced per Caret/Crate (Carets - Rate/Caret).
 *
 * Pass the fruit's stored pricingType first (from master data or item),
 * then fall back to name-based detection.
 */
export function getFruitPricingType(
  fruitName: string,
  storedPricingType?: "kg" | "caret",
): "kg" | "caret" {
  if (storedPricingType) return storedPricingType;
  return fruitName.trim().toLowerCase().includes("mango") ? "kg" : "caret";
}

/**
 * Calculate the line-item amount based on pricing type.
 * - 'kg'    → Math.round(weight - rate)
 * - 'caret' → Math.round(carets - rate)
 */
export function calcItemAmount(
  pricingType: "kg" | "caret",
  weight: number,
  carets: number,
  rate: number,
): number {
  if (pricingType === "kg") return Math.round(weight * rate);
  return Math.round(carets * rate);
}
