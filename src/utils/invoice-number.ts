import { Invoice, PurchaseInvoice, InvoiceSettings } from '../types';

export type ResolvedInvoiceTemplate = 'modern' | 'watermark' | 'thermal' | 'initials';

export const normalizeInvoiceTemplate = (
  style: InvoiceSettings['templateStyle'] | undefined,
): ResolvedInvoiceTemplate => {
  if (style === 'thermal' || style === 'initials' || style === 'watermark') return style;
  return 'modern';
};

const pad = (value: number, len: number) => String(Math.max(1, value)).padStart(len, '0');
const toYmd = (dateIso: string) => dateIso.replace(/-/g, '');

// ── FY short label from a date + FY start month ───────────────────────────────
// Returns e.g. "25-26" for FY 2025-26
export function fyShortLabel(dateIso: string, fyStartMonth: number): string {
  const [yearStr, monthStr] = dateIso.split('-');
  const year  = parseInt(yearStr,  10);
  const month = parseInt(monthStr, 10);
  const baseYear = month >= fyStartMonth ? year : year - 1;
  return `${String(baseYear).slice(-2)}-${String(baseYear + 1).slice(-2)}`;
}

// ── FY label "YYYY-YY" from activeFY string ───────────────────────────────────
// activeFY is stored as "YYYY-YY" e.g. "2025-26"
// Returns short form "25-26"
export function fyShortFromLabel(activeFY: string): string {
  const [startYearStr, endShort] = activeFY.split('-');
  const startYear = parseInt(startYearStr, 10);
  return `${String(startYear).slice(-2)}-${endShort}`;
}

const getDateCounter = (invoices: Invoice[], prefix: string, dateIso: string) => {
  const ymd = toYmd(dateIso);
  const head = `${prefix}-${ymd}-`;
  let maxCounter = 0;

  for (const inv of invoices) {
    if (!inv.invoiceNo.startsWith(head)) continue;
    const lastChunk = inv.invoiceNo.slice(head.length);
    const n = Number.parseInt(lastChunk, 10);
    if (Number.isFinite(n) && n > maxCounter) maxCounter = n;
  }

  return maxCounter + 1;
};

/**
 * Format a sales invoice number.
 *
 * Recommended format (sequential mode): PREFIX/YY-YY/NUMBER
 * e.g. INV/25-26/1001
 *
 * @param activeFY  Optional active FY label "YYYY-YY" — used for the FY segment.
 *                  Falls back to deriving from dateIso + fyStartMonth.
 * @param fyStartMonth  FY start month (1–12). Used only when activeFY is not provided.
 */
export const formatInvoiceNumber = (
  settings: InvoiceSettings,
  nextSequentialNo: number,
  dateIso: string,
  invoices: Invoice[],
  activeFY?: string,
  fyStartMonth = 4,
): string => {
  const prefix = (settings.salesPrefix || 'INV').trim() || 'INV';
  const mode = settings.invoiceNumberMode || 'sequential';

  if (mode === 'date_based') {
    const dateCounter = getDateCounter(invoices, prefix, dateIso);
    return `${prefix}-${toYmd(dateIso)}-${pad(dateCounter, 3)}`;
  }

  if (mode === 'business_prefix') {
    const businessPrefix = (settings.businessPrefix || prefix).trim() || prefix;
    const year = dateIso.slice(0, 4);
    return `${businessPrefix}-${year}-${pad(nextSequentialNo, 4)}`;
  }

  // Sequential mode — use FY segment: PREFIX/YY-YY/NUMBER
  const fySegment = activeFY
    ? fyShortFromLabel(activeFY)
    : fyShortLabel(dateIso, fyStartMonth);

  return `${prefix}/${fySegment}/${pad(nextSequentialNo, 4)}`;
};

export const getNextUniqueInvoiceNumber = (
  settings: InvoiceSettings,
  invoices: Invoice[],
  dateIso: string,
  seedNo: number,
  activeFY?: string,
  fyStartMonth = 4,
): { invoiceNo: string; nextSeed: number } => {
  const existing = new Set(invoices.map((i) => i.invoiceNo));
  const mode = settings.invoiceNumberMode || 'sequential';

  if (mode === 'date_based') {
    const invoiceNo = formatInvoiceNumber(settings, seedNo, dateIso, invoices, activeFY, fyStartMonth);
    return { invoiceNo, nextSeed: seedNo + 1 };
  }

  let candidateSeed = seedNo;
  let candidate = formatInvoiceNumber(settings, candidateSeed, dateIso, invoices, activeFY, fyStartMonth);
  while (existing.has(candidate)) {
    candidateSeed += 1;
    candidate = formatInvoiceNumber(settings, candidateSeed, dateIso, invoices, activeFY, fyStartMonth);
  }

  return { invoiceNo: candidate, nextSeed: candidateSeed + 1 };
};

// ── Purchase invoice number helpers ──────────────────────────────────────────

/**
 * Format a purchase bill number.
 * Sequential mode: PREFIX/YY-YY/NUMBER  e.g. PUR/25-26/0101
 */
const formatPurchaseNumber = (
  settings: InvoiceSettings,
  nextSequentialNo: number,
  dateIso: string,
  activeFY?: string,
  fyStartMonth = 4,
): string => {
  const prefix = (settings.purchasePrefix || 'PUR').trim() || 'PUR';
  const mode = settings.invoiceNumberMode || 'sequential';

  if (mode === 'date_based') {
    return `${prefix}-${toYmd(dateIso)}-${pad(nextSequentialNo, 3)}`;
  }

  if (mode === 'business_prefix') {
    const businessPrefix = (settings.businessPrefix || prefix).trim() || prefix;
    const year = dateIso.slice(0, 4);
    return `${businessPrefix}-${year}-${pad(nextSequentialNo, 4)}`;
  }

  // Sequential mode — use FY segment
  const fySegment = activeFY
    ? fyShortFromLabel(activeFY)
    : fyShortLabel(dateIso, fyStartMonth);

  return `${prefix}/${fySegment}/${pad(nextSequentialNo, 4)}`;
};

export const getNextUniquePurchaseNumber = (
  settings: InvoiceSettings,
  purchaseInvoices: PurchaseInvoice[],
  dateIso: string,
  seedNo: number,
  activeFY?: string,
  fyStartMonth = 4,
): { invoiceNo: string; nextSeed: number } => {
  const existing = new Set(purchaseInvoices.map((i) => i.billNo));

  let candidateSeed = seedNo;
  let candidate = formatPurchaseNumber(settings, candidateSeed, dateIso, activeFY, fyStartMonth);
  while (existing.has(candidate)) {
    candidateSeed += 1;
    candidate = formatPurchaseNumber(settings, candidateSeed, dateIso, activeFY, fyStartMonth);
  }

  return { invoiceNo: candidate, nextSeed: candidateSeed + 1 };
};
