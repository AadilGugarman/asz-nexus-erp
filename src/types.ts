export interface Variety {
  name: string;
}

export interface Fruit {
  id: string;
  name: string;
  varieties: string[];
}

export interface Supplier {
  id: string;
  name: string;
  code: string;
  phone: string;
  city: string;
  previousBalance: number;
}

export interface SupplierLedgerEntry {
  id: string;
  supplierId: string;
  date: string;
  type: "PURCHASE_VEHICLE" | "PURCHASE_BILL" | "PAYMENT" | "OPENING";
  referenceId?: string;
  referenceNo?: string;
  variety?: string;
  weightKg?: number;
  rate?: number;
  amount: number;
  note?: string;
  runningBalance: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  city: string;
  previousBalance: number;
}

export interface CustomerLedgerEntry {
  id: string;
  customerId: string;
  date: string;
  type: "INVOICE" | "PAYMENT" | "OPENING";
  referenceId?: string;
  referenceNo?: string;
  amount: number; // positive for invoice (debit), negative for payment (credit)
  note?: string;
  runningBalance: number;
}

export interface PurchaseRow {
  id: string;
  supplierId: string;
  supplierName: string;
  variety: string; // Vakkal
  caret: number;
  weight: number;
  rate: number;
  amount: number;
  note?: string;
}

export interface VehicleArrival {
  id: string;
  arrivalNo: string;
  date: string;
  day: string;
  vehicleNo: string;
  vehicleName?: string;
  fruitType: string;
  totalVehicleWeight: number;
  driverName?: string;
  notes?: string;
  rows: PurchaseRow[];
  totalCarets: number;
  totalCalculatedWeight: number;
  totalAmount: number;
  freightCharge?: number; // Lorry freight
  hamaliCharge?: number; // Unloading labour
  advancePaid?: number; // Driver advance
  status: "DRAFT" | "SAVED";
  createdAt: string;
}

export interface PurchaseInvoiceItem {
  id: string;
  fruit: string;
  variety: string;
  caret: number;
  weight: number;
  rate: number;
  amount: number;
}

export interface PurchaseInvoice {
  id: string;
  billNo: string;
  date: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseInvoiceItem[];
  previousBalance: number;
  todayAmount: number;
  freight?: number;
  hamali?: number;
  paidAmount: number;
  remainingBalance: number;
  notes?: string;
  createdAt: string;
}

export interface InventoryItem {
  key: string; // fruit_variety
  fruit: string;
  variety: string;
  totalWeight: number;
  totalCarets: number;
}

export interface StockMovement {
  id: string;
  date: string;
  fruit: string;
  variety: string;
  type: "ARRIVAL" | "PURCHASE_BILL" | "SALE" | "ADJUSTMENT";
  reference: string;
  weightChange: number;
  caretChange: number;
  resultingWeight: number;
  resultingCarets: number;
}

export interface InvoiceItem {
  id: string;
  fruit: string;
  lotVariety: string;
  caret: number;
  weight: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;
  customerId: string;
  customerName: string;
  items: InvoiceItem[];
  previousBalance: number;
  todayAmount: number;
  hamali?: number; // Loading fee
  discount?: number; // Cash discount
  paidAmount: number;
  remainingBalance: number;
  notes?: string;
  createdAt: string;
}

export interface PaymentReceipt {
  id: string;
  date: string;
  partyType: "SUPPLIER" | "CUSTOMER";
  partyId: string;
  partyName: string;
  amount: number;
  paymentMode: "CASH" | "BANK_TRANSFER" | "CHEQUE" | "UPI";
  referenceNo?: string;
  notes?: string;
}

export type ThemeMode = "dark" | "light";

export interface CompanySettings {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  bankName: string;
  accountNo: string;
  ifsc: string;
  upiId: string;
  logo: string; // base64 data URL for company logo
}

export interface FinancialSettings {
  financialYearStart: string; // MM-DD e.g. "04-01"
  currency: string;
  commissionRate: number;
  defaultHamali: number;
  defaultFreight: number;
}

export interface InvoiceSettings {
  salesPrefix: string;
  purchasePrefix: string;
  arrivalPrefix: string;
  salesNextNo: number;
  purchaseNextNo: number;
  arrivalNextNo: number;
  termsText: string;
  footerNote: string;
  showUPI: boolean;
  showBankDetails: boolean;
  // Extended fields
  templateStyle:
    | "modern"
    | "classic"
    | "minimal"
    | "professional"
    | "thermal"
    | "pos"
    | "receipt";
  brandColor: string;
  enableQR: boolean;
  autoInvoiceNo: boolean;
  invoiceNumberMode: "sequential" | "date_based" | "business_prefix";
  businessPrefix: string;
  defaultTaxRate: number;
  paymentDueDays: number;
  showCompanyDetails: boolean;
  showPaymentDetails: boolean;
  watermarkType: "none" | "text" | "image" | "logo";
  watermarkText: string;
  watermarkImage: string; // base64
  watermarkOpacity: number; // 0..1
  watermarkSize: number; // percentage-like scalar, 40..220 recommended
  watermarkPosition:
    | "center"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
  watermarkRepeat: boolean;
  signatureImage: string; // base64
  invoiceLogo: string; // base64 — overrides company logo on printed invoices
  enableInvoiceLogo: boolean; // when false, falls back to company master logo
}

export interface SecuritySettings {
  appPin: string;
  autoLockMinutes: number;
  pinEnabled: boolean;
}

export interface CompanyProfile {
  id: string;
  company: CompanySettings;
  financial: FinancialSettings;
  invoice: InvoiceSettings;
  createdAt: string;
  pan?: string;
  city?: string;
  state?: string;
  pincode?: string;
  logo?: string; // base64 data URL
}

export interface AppSettings {
  company: CompanySettings;
  financial: FinancialSettings;
  invoice: InvoiceSettings;
  security: SecuritySettings;
  setupCompleted: boolean;
}
