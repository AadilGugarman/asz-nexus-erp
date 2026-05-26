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
  fyStart: string;
  fyEnd: string;
  currency: string;
  currencySymbol: string;
  taxType: string;
  invoicePrefix: string;
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

export interface StepConfig {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
}
