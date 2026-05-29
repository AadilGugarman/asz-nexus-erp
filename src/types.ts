export interface Variety {
  name: string;
}

export interface Fruit {
  id: string;
  name: string;
  varieties: string[];
  /** 'kg' = priced per KG (Mango), 'caret' = priced per Caret/Crate (all others) */
  pricingType?: "kg" | "caret";
}

export interface Supplier {
  id: string;
  name: string;
  code: string;
  phone: string;
  email: string;
  gstin: string;
  city: string;
  state: string;
  billingAddress: string;
  shippingAddress: string;
  previousBalance: number;
  creditLimit: number;
  notes: string;
}

export interface SupplierLedgerEntry {
  id: string;
  supplierId: string;
  date: string;
  type: "PURCHASE_BILL" | "PAYMENT" | "OPENING";
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
  email: string;
  gstin: string;
  city: string;
  state: string;
  billingAddress: string;
  shippingAddress: string;
  previousBalance: number;
  creditLimit: number;
  notes: string;
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

export interface PurchaseInvoiceItem {
  id: string;
  fruitCategory: string; // e.g. "Mango", "Banana"
  fruit: string; // kept for backward compat (same as fruitCategory)
  variety: string;
  caret: number;
  weight: number;
  rate: number;
  amount: number;
  rowNote?: string; // per-row supplier note
  /** Pricing mode: 'kg' = Weight × Rate/KG (Mango), 'caret' = Carets × Rate/Caret (others) */
  pricingType?: "kg" | "caret";
}

export interface PurchaseInvoice {
  id: string;
  billNo: string;
  date: string;
  supplierId: string;
  supplierName: string;
  // Vehicle Inward fields (independent of VehicleArrival module)
  vehicleNo?: string;
  declaredWeight?: number;
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
  type: "PURCHASE_BILL" | "SALE" | "ADJUSTMENT";
  reference: string;
  weightChange: number;
  caretChange: number;
  resultingWeight: number;
  resultingCarets: number;
}

export interface InvoiceItem {
  id: string;
  fruitCategory: string; // e.g. "Mango"
  fruit: string; // kept for backward compat
  lotVariety: string;
  caret: number;
  weight: number;
  rate: number;
  amount: number;
  /** Pricing mode: 'kg' = Weight × Rate/KG (Mango), 'caret' = Carets × Rate/Caret (others) */
  pricingType?: "kg" | "caret";
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;
  customerId: string;
  customerName: string;
  // Vehicle Inward fields (independent of VehicleArrival module)
  vehicleNo?: string;
  declaredWeight?: number;
  items: InvoiceItem[];
  previousBalance: number;
  todayAmount: number;
  freight?: number; // Bhaada
  hamali?: number; // kept for backward compat on existing records
  discount?: number; // legacy field — no longer set by new invoices
  paidAmount: number;
  remainingBalance: number;
  otherCharges?: number;
  remainingCaretBalance?: number;
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

// ── Caret Transactions ────────────────────────────────────────────────────────

export type CaretTransactionType = "GIVEN" | "RETURN";

export interface CaretTransaction {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  type: CaretTransactionType;
  fruitName: string;
  caretQty: number;
  note?: string;
  billId?: string;
  billNo?: string;
  companyId?: string;
  createdAt: string;
}

/** Per-customer summary computed from all transactions */
export interface CaretCustomerSummary {
  customerId: string;
  customerName: string;
  totalGiven: number;
  totalReturned: number;
  pendingBalance: number;
}

export type ThemeMode = "dark" | "light";

export interface CompanySettings {
  name: string;
  tagline: string;
  logo: string;
  address: string;
  phone: string;
  phone2?: string;
  phone3?: string;
  email: string;
  website: string;
  gstin?: string;
  pan?: string;
  bankName: string;
  accountNo: string;
  ifsc: string;
  upiId: string;
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
  templateStyle: "modern" | "watermark" | "thermal" | "initials";
  brandColor: string;
  enableQR: boolean;
  autoInvoiceNo: boolean;
  invoiceNumberMode: "sequential" | "date_based" | "business_prefix";
  businessPrefix: string;
  defaultTaxRate: number;
  paymentDueDays: number;
  showCompanyDetails: boolean;
  showPaymentDetails: boolean;
  watermarkType: "none" | "text" | "image" | "logo" | "initials";
  watermarkText: string;
  watermarkImage: string; // base64
  watermarkOpacity: number; // 0..1
  watermarkSize: number; // percentage-like scalar, 40..220 recommended
  watermarkRotation: number; // 0..360
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
  setupCompleted: boolean;
}
