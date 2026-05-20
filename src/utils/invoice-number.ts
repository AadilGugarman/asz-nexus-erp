import { Invoice, InvoiceSettings } from '../types';

export type ResolvedInvoiceTemplate = 'modern' | 'classic' | 'minimal' | 'professional' | 'thermal';

export const normalizeInvoiceTemplate = (
  style: InvoiceSettings['templateStyle'] | undefined,
): ResolvedInvoiceTemplate => {
  if (style === 'pos' || style === 'receipt') return 'thermal';
  if (style === 'classic' || style === 'minimal' || style === 'professional' || style === 'thermal') return style;
  return 'modern';
};

const pad = (value: number, len: number) => String(Math.max(1, value)).padStart(len, '0');
const toYmd = (dateIso: string) => dateIso.replace(/-/g, '');

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

export const formatInvoiceNumber = (
  settings: InvoiceSettings,
  nextSequentialNo: number,
  dateIso: string,
  invoices: Invoice[],
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

  return `${prefix}-${pad(nextSequentialNo, 4)}`;
};

export const getNextUniqueInvoiceNumber = (
  settings: InvoiceSettings,
  invoices: Invoice[],
  dateIso: string,
  seedNo: number,
): { invoiceNo: string; nextSeed: number } => {
  const existing = new Set(invoices.map((i) => i.invoiceNo));
  const mode = settings.invoiceNumberMode || 'sequential';

  if (mode === 'date_based') {
    const invoiceNo = formatInvoiceNumber(settings, seedNo, dateIso, invoices);
    return { invoiceNo, nextSeed: seedNo + 1 };
  }

  let candidateSeed = seedNo;
  let candidate = formatInvoiceNumber(settings, candidateSeed, dateIso, invoices);
  while (existing.has(candidate)) {
    candidateSeed += 1;
    candidate = formatInvoiceNumber(settings, candidateSeed, dateIso, invoices);
  }

  return { invoiceNo: candidate, nextSeed: candidateSeed + 1 };
};
