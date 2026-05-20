/**
 * ipc/types.ts
 * Shared TypeScript types for the IPC layer.
 *
 * These mirror the Rust structs in src-tauri/src/ipc/response.rs
 * and each commands/*.rs file. Keep them in sync when you change Rust types.
 *
 * Naming convention:
 *   - Request payloads: <Domain><Action>Request  (e.g. PingRequest)
 *   - Response data:    <Domain><Action>Response (e.g. PingResponse)
 *   - Envelope:         IpcResponse<T>
 */

// ── Core envelope ─────────────────────────────────────────────────────────────

/**
 * Every Tauri command returns this envelope.
 * `data` is present when success === true.
 * `error` is present when success === false.
 */
export interface IpcResponse<T> {
  success: boolean;
  data?: T;
  error?: IpcError;
}

/**
 * Structured error from the Rust backend.
 * `code` is a stable string you can switch on (see AppError::code() in Rust).
 */
export interface IpcError {
  code: IpcErrorCode;
  message: string;
  details?: string;
}

/** All possible error codes returned by the backend. */
export type IpcErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'IO_ERROR'
  | 'SERIALIZATION_ERROR'
  | 'DATABASE_ERROR'
  | 'PERMISSION_DENIED'
  | 'INTERNAL_ERROR'
  | 'UNKNOWN_ERROR';

// ── App domain types ──────────────────────────────────────────────────────────

export interface AppInfo {
  name: string;
  version: string;
  tauri_version: string;
  debug: boolean;
  build_stamp: string;
}

export interface PingRequest {
  message: string;
}

export interface PingResponse {
  echo: string;
  timestamp_ms: number;
}

// ── Auth domain types ─────────────────────────────────────────────────────────

export interface SetupRequest {
  password: string;
}

export interface LoginRequest {
  password: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password:     string;
}

export interface AuthTokenResponse {
  access_token:       string;
  refresh_token:      string;
  access_expires_at:  number;
  refresh_expires_at: number;
  user_id:            string;
  role:               string;
}

export interface SessionStatus {
  authenticated: boolean;
  setup_done:    boolean;
  user_id:       string | null;
  role:          string | null;
  /** Seconds until access token expires. Negative = already expired. */
  expires_in:    number;
}

// ── Database domain types ─────────────────────────────────────────────────────

export interface EmployeeStats {
  total: number;
  active: number;
  inactive: number;
}

export interface DbStats {
  status: string;
  employees: EmployeeStats;
}

// ── Employee domain types ─────────────────────────────────────────────────────

export type EmployeeRole = 'admin' | 'manager' | 'staff';

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: EmployeeRole;
  department: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeRequest {
  name: string;
  email: string;
  phone?: string;
  role?: EmployeeRole;
  department?: string;
}

export interface UpdateEmployeeRequest {
  name?: string;
  email?: string;
  phone?: string;
  role?: EmployeeRole;
  department?: string;
  is_active?: boolean;
}

export interface EmployeeFilter {
  search?: string;
  role?: EmployeeRole;
  department?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export interface EmployeeListResponse {
  items: Employee[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface SetActiveRequest {
  id: string;
  active: boolean;
}

export interface BulkInsertRequest {
  employees: CreateEmployeeRequest[];
}

// ── System domain types ───────────────────────────────────────────────────────

export interface SystemInfo {
  os: string;
  os_version: string;
  arch: string;
  locale: string;
}

export interface AppPaths {
  app_data_dir: string;
  app_config_dir: string;
  app_log_dir: string;
}

// ── File domain types ─────────────────────────────────────────────────────────

export interface WriteFileRequest {
  path: string;
  content: string;
  create_dirs?: boolean;
}

export interface WriteFileResponse {
  path: string;
  bytes_written: number;
}

export interface ReadFileRequest {
  path: string;
}

export interface ReadFileResponse {
  path: string;
  content: string;
  size_bytes: number;
}

export interface StatPathRequest {
  path: string;
}

export interface PathInfo {
  exists: boolean;
  is_file: boolean;
  is_dir: boolean;
  size_bytes: number | null;
}

// ── Updater domain types ──────────────────────────────────────────────────────

export interface UpdateCheckResult {
  available: boolean;
  current_version: string;
  latest_version: string | null;
  release_notes: string | null;
}

export interface UpdateInstallResult {
  started: boolean;
  message: string;
}

// ── Event payload types (mirrors src-tauri/src/events/emitter.rs) ─────────────

export interface TaskProgressPayload {
  percent: number;
  message: string;
}

export interface TaskCompletePayload {
  task_id: string;
  message: string;
}

export interface TaskErrorPayload {
  task_id: string;
  code: string;
  message: string;
}

export interface DataChangedPayload {
  domain: string;
  action: 'created' | 'updated' | 'deleted';
  id: string | null;
}

// ── Supplier domain types ─────────────────────────────────────────────────────

export interface Supplier {
  id:               string;
  name:             string;
  code:             string;
  phone:            string;
  city:             string;
  previous_balance: number;
}

export interface CreateSupplierRequest {
  name:             string;
  code?:            string;
  phone?:           string;
  city?:            string;
  previous_balance?: number;
}

export interface UpdateSupplierRequest {
  name?:             string;
  code?:             string;
  phone?:            string;
  city?:             string;
  previous_balance?: number;
}

export interface SupplierFilter {
  search?: string;
  city?:   string;
  page?:   number;
  limit?:  number;
}

export interface SupplierListResponse {
  items:       Supplier[];
  total:       number;
  page:        number;
  limit:       number;
  total_pages: number;
}

// ── Customer domain types ─────────────────────────────────────────────────────

export interface Customer {
  id:               string;
  name:             string;
  phone:            string;
  city:             string;
  previous_balance: number;
}

export interface CreateCustomerRequest {
  name:              string;
  phone?:            string;
  city?:             string;
  previous_balance?: number;
}

export interface UpdateCustomerRequest {
  name?:             string;
  phone?:            string;
  city?:             string;
  previous_balance?: number;
}

export interface CustomerFilter {
  search?: string;
  city?:   string;
  page?:   number;
  limit?:  number;
}

export interface CustomerListResponse {
  items:       Customer[];
  total:       number;
  page:        number;
  limit:       number;
  total_pages: number;
}

// ── Invoice domain types ──────────────────────────────────────────────────────

export interface Invoice {
  id:                string;
  invoice_no:        string;
  date:              string;
  customer_id:       string;
  customer_name:     string;
  items:             string; // JSON
  previous_balance:  number;
  today_amount:      number;
  hamali:            number | null;
  discount:          number | null;
  paid_amount:       number;
  remaining_balance: number;
  notes:             string | null;
  created_at:        string;
}

export interface CreateInvoiceRequest {
  invoice_no:        string;
  date:              string;
  customer_id:       string;
  customer_name:     string;
  items:             string;
  previous_balance:  number;
  today_amount:      number;
  hamali?:           number;
  discount?:         number;
  paid_amount:       number;
  remaining_balance: number;
  notes?:            string;
  created_at:        string;
}

export interface InvoiceFilter {
  customer_id?: string;
  date_from?:   string;
  date_to?:     string;
  search?:      string;
  page?:        number;
  limit?:       number;
}

export interface InvoiceListResponse {
  items:       Invoice[];
  total:       number;
  page:        number;
  limit:       number;
  total_pages: number;
}

export interface PurchaseInvoice {
  id:                string;
  bill_no:           string;
  date:              string;
  supplier_id:       string;
  supplier_name:     string;
  items:             string; // JSON
  previous_balance:  number;
  today_amount:      number;
  freight:           number | null;
  hamali:            number | null;
  paid_amount:       number;
  remaining_balance: number;
  notes:             string | null;
  created_at:        string;
}

export interface CreatePurchaseInvoiceRequest {
  bill_no:           string;
  date:              string;
  supplier_id:       string;
  supplier_name:     string;
  items:             string;
  previous_balance:  number;
  today_amount:      number;
  freight?:          number;
  hamali?:           number;
  paid_amount:       number;
  remaining_balance: number;
  notes?:            string;
  created_at:        string;
}

export interface PurchaseInvoiceFilter {
  supplier_id?: string;
  date_from?:   string;
  search?:      string;
  page?:        number;
  limit?:       number;
}

export interface PurchaseInvoiceListResponse {
  items:       PurchaseInvoice[];
  total:       number;
  page:        number;
  limit:       number;
  total_pages: number;
}

// ── Payment domain types ──────────────────────────────────────────────────────

export type PartyType   = 'SUPPLIER' | 'CUSTOMER';
export type PaymentMode = 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI';

export interface Payment {
  id:           string;
  date:         string;
  party_type:   PartyType;
  party_id:     string;
  party_name:   string;
  amount:       number;
  payment_mode: PaymentMode;
  reference_no: string | null;
  notes:        string | null;
}

export interface CreatePaymentRequest {
  date:         string;
  party_type:   PartyType;
  party_id:     string;
  party_name:   string;
  amount:       number;
  payment_mode: PaymentMode;
  reference_no?: string;
  notes?:        string;
}

export interface PaymentFilter {
  party_id?:   string;
  party_type?: PartyType;
  date_from?:  string;
  page?:       number;
  limit?:      number;
}

export interface PaymentListResponse {
  items:       Payment[];
  total:       number;
  page:        number;
  limit:       number;
  total_pages: number;
}

// ── Secure FS domain types ────────────────────────────────────────────────────

export interface FsFileInfo {
  path:       string;
  name:       string;
  exists:     boolean;
  is_file:    boolean;
  is_dir:     boolean;
  size_bytes: number | null;
  /** Unix timestamp (seconds) as a string, or null. */
  modified:   string | null;
}

export interface FsDirEntry {
  name:       string;
  path:       string;
  is_file:    boolean;
  is_dir:     boolean;
  size_bytes: number | null;
}

export interface FsReadTextResponse {
  path:       string;
  content:    string;
  size_bytes: number;
}

export interface FsWriteTextResponse {
  path:          string;
  bytes_written: number;
}

export interface FsReadBytesResponse {
  path:       string;
  /** Base64-encoded file contents. */
  data_b64:   string;
  size_bytes: number;
}

export interface FsWriteBytesResponse {
  path:          string;
  bytes_written: number;
}

export interface FsCopyResponse {
  src:          string;
  dst:          string;
  bytes_copied: number;
}

export interface FsSavePdfResponse {
  path:          string;
  bytes_written: number;
}

export interface FsDialogFilter {
  name:       string;
  extensions: string[];
}

export interface FsDialogOpenRequest {
  title?:        string;
  default_path?: string;
  multiple?:     boolean;
  directory?:    boolean;
  filters?:      FsDialogFilter[];
}

export interface FsDialogOpenResponse {
  paths:     string[] | null;
  cancelled: boolean;
}

export interface FsDialogSaveRequest {
  title?:        string;
  default_path?: string;
  filters?:      FsDialogFilter[];
}

export interface FsDialogSaveResponse {
  path:      string | null;
  cancelled: boolean;
}

export interface FsAllowedRootsResponse {
  roots: string[];
}

export interface FsExportCsvRequest {
  path:         string;
  headers:      string[];
  rows:         string[][];
  create_dirs?: boolean;
  unique?:      boolean;
}

export interface FsExportJsonRequest {
  path:         string;
  json:         string;
  create_dirs?: boolean;
  unique?:      boolean;
}

export interface FsSavePdfRequest {
  path:         string;
  /** Base64-encoded PDF bytes. */
  data_b64:     string;
  create_dirs?: boolean;
  unique?:      boolean;
}

// ── Window domain types ───────────────────────────────────────────────────────

/** Snapshot of a window's current state, returned by win_get_state. */
export interface WinState {
  label:         string;
  title:         string;
  is_visible:    boolean;
  is_focused:    boolean;
  is_maximized:  boolean;
  is_minimized:  boolean;
  is_fullscreen: boolean;
  width:         number;
  height:        number;
  x:             number;
  y:             number;
}

export interface WinOpenRequest {
  label:          string;
  title:          string;
  url:            string;
  width?:         number;
  height?:        number;
  min_width?:     number;
  min_height?:    number;
  center?:        boolean;
  resizable?:     boolean;
  decorations?:   boolean;
  always_on_top?: boolean;
}

export interface WinSetSizeRequest {
  label?:  string;
  width:   number;
  height:  number;
}

export interface WinSetPositionRequest {
  label?: string;
  x:      number;
  y:      number;
}

export interface WinSetTitleRequest {
  label?: string;
  title:  string;
}

export interface WinSetAlwaysOnTopRequest {
  label?:  string;
  on_top:  boolean;
}
