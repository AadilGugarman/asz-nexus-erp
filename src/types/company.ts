export interface CompanyDetails {
  companyName: string;
  legalName: string;
  gstin: string;
  panNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  phone: string;
  phone2?: string;
  phone3?: string;
  email?: string;
  website?: string;
  logoUrl: string;
}

export interface FinancialSettings {
  /** Month number (1–12) when the financial year starts. Default: 4 (April). */
  fyStartMonth: number;
  currency: string;
  currencySymbol: string;
  taxType: string;
  /** Initial invoice prefix — onboarding only. Advanced numbering lives in Settings → Invoice & Numbering. */
  invoicePrefix: string;
  /** Initial starting number — onboarding only. */
  invoiceStartingNumber: string;
  decimalPrecision: number;
  enableMultiTax: boolean;
  enableRoundOff: boolean;
  // Banking & payment details
  bankName: string;
  accountNo: string;
  ifsc: string;
  upiId: string;
}

export interface CompanyFormData {
  details: CompanyDetails;
  financial: FinancialSettings;
}

export interface ValidationErrors {
  details: Partial<Record<keyof CompanyDetails, string>>;
  financial: Partial<Record<keyof FinancialSettings, string>>;
}

// ── FY utility helpers ────────────────────────────────────────────────────────

/** Month names for the FY start month selector (1-indexed). */
export const FY_MONTHS = [
  { value: 1,  label: 'January' },
  { value: 2,  label: 'February' },
  { value: 3,  label: 'March' },
  { value: 4,  label: 'April' },
  { value: 5,  label: 'May' },
  { value: 6,  label: 'June' },
  { value: 7,  label: 'July' },
  { value: 8,  label: 'August' },
  { value: 9,  label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

/**
 * Given a FY start month (1–12) and a reference date, compute the FY label
 * in the format "YYYY-YY" (e.g. "2025-26").
 */
export function computeFYLabel(startMonth: number, refDate: Date = new Date()): string {
  const m = refDate.getMonth() + 1; // 1-indexed
  const y = refDate.getFullYear();
  const baseYear = m >= startMonth ? y : y - 1;
  return `${baseYear}-${String(baseYear + 1).slice(-2)}`;
}

/**
 * Given a FY label "YYYY-YY", return the start and end dates as ISO strings.
 * e.g. "2025-26" with startMonth=4 → { start: "2025-04-01", end: "2026-03-31" }
 */
export function fyLabelToDates(fyLabel: string, startMonth: number): { start: string; end: string } {
  const [startYearStr] = fyLabel.split('-');
  const startYear = parseInt(startYearStr, 10);
  const endYear = startYear + 1;

  const endMonth = startMonth === 1 ? 12 : startMonth - 1;
  const endYear2 = startMonth === 1 ? startYear : endYear;

  // Last day of end month
  const lastDay = new Date(endYear2, endMonth, 0).getDate();

  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    start: `${startYear}-${pad(startMonth)}-01`,
    end:   `${endYear2}-${pad(endMonth)}-${lastDay}`,
  };
}

/**
 * Generate a list of FY labels for the dropdown:
 * current FY + N previous FYs.
 */
export function generateFYOptions(startMonth: number, count = 5): string[] {
  const options: string[] = [];
  const now = new Date();
  const currentFY = computeFYLabel(startMonth, now);
  const [baseYearStr] = currentFY.split('-');
  const baseYear = parseInt(baseYearStr, 10);
  for (let i = 0; i < count; i++) {
    const y = baseYear - i;
    options.push(`${y}-${String(y + 1).slice(-2)}`);
  }
  return options;
}

export interface StepConfig {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
}
