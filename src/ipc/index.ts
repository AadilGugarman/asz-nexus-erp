/**
 * ipc/index.ts
 * Public API for the entire IPC layer.
 *
 * Import from here — never from sub-files directly.
 *
 * Usage:
 *   import { ipc, IpcCallError, ipcInvokeSafe, AppEvents, CMD } from '@/ipc';
 *
 *   // Domain call
 *   const info = await ipc.app.getAppInfo();
 *
 *   // Safe call (no try/catch needed)
 *   const { data, error, ok } = await ipcInvokeSafe(CMD.app.ping, { payload: { message: 'hi' } });
 *
 *   // Error handling
 *   try {
 *     await ipc.file.readTextFile({ path: '/missing.txt' });
 *   } catch (err) {
 *     if (err instanceof IpcCallError && err.code === 'NOT_FOUND') {
 *       toast.error('File not found');
 *     }
 *   }
 *
 *   // Event subscription (use with useEvent hook)
 *   useEvent(AppEvents.onDataChanged, (p) => {
 *     if (p.domain === 'invoices') refetch();
 *   });
 */

// ── Core utilities ────────────────────────────────────────────────────────────
export { ipcInvoke, ipcInvokeSafe, IpcCallError } from './invoke';
export { CMD } from './commands';
export { AppEvents, EVENT_NAMES } from './events';
export type { EventName } from './events';

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  // Core
  IpcResponse,
  IpcError,
  IpcErrorCode,
  // App
  AppInfo,
  PingRequest,
  PingResponse,
  // Auth
  SetupRequest,
  LoginRequest,
  RefreshRequest,
  ChangePasswordRequest,
  AuthTokenResponse,
  SessionStatus,
  // Database
  EmployeeStats,
  DbStats,
  SeedProfileKey,
  SeedTableCounts,
  SeedProfileRecommendation,
  DbSeedPlan,
  DbReseedDemoDataRequest,
  DbSeedResetResult,
  DbSeedExecutionResult,
  // Employee
    // Backup
    BackupEntry,
    BackupCreateRequest,
    BackupDeleteRequest,
    BackupValidateRequest,
    BackupRestoreRequest,
    BackupPruneRequest,
    RestoreResult,
  Employee,
  EmployeeRole,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  EmployeeFilter,
  EmployeeListResponse,
  SetActiveRequest,
  BulkInsertRequest,
  // Supplier
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierFilter,
  SupplierListResponse,
  // Customer
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerFilter,
  CustomerListResponse,
  // Invoice
  Invoice,
  CreateInvoiceRequest,
  InvoiceFilter,
  InvoiceListResponse,
  PurchaseInvoice,
  CreatePurchaseInvoiceRequest,
  PurchaseInvoiceFilter,
  PurchaseInvoiceListResponse,
  // Payment
  Payment,
  CreatePaymentRequest,
  PaymentFilter,
  PaymentListResponse,
  PartyType,
  PaymentMode,
  // System
  SystemInfo,
  AppPaths,
  // File
  WriteFileRequest,
  WriteFileResponse,
  ReadFileRequest,
  ReadFileResponse,
  StatPathRequest,
  PathInfo,
  // Secure FS
  FsFileInfo,
  FsDirEntry,
  FsReadTextResponse,
  FsWriteTextResponse,
  FsReadBytesResponse,
  FsWriteBytesResponse,
  FsCopyResponse,
  FsSavePdfResponse,
  FsSavePdfRequest,
  FsDialogFilter,
  FsDialogOpenRequest,
  FsDialogOpenResponse,
  FsDialogSaveRequest,
  FsDialogSaveResponse,
  FsAllowedRootsResponse,
  FsExportCsvRequest,
  FsExportJsonRequest,
  // Window
  WinState,
  WinOpenRequest,
  WinSetSizeRequest,
  WinSetPositionRequest,
  WinSetTitleRequest,
  WinSetAlwaysOnTopRequest,
  // Updater
  UpdateCheckResult,
  UpdateInstallResult,
  // Events
  TaskProgressPayload,
  TaskCompletePayload,
  TaskErrorPayload,
  DataChangedPayload,
} from './types';

// ── Domain modules ────────────────────────────────────────────────────────────
import { appIpc }      from './modules/app.ipc';
import { authIpc }     from './modules/auth.ipc';
import { backupIpc }   from './modules/backup.ipc';
import { customerIpc } from './modules/customer.ipc';
import { dbIpc }       from './modules/db.ipc';
import { employeeIpc } from './modules/employee.ipc';
import { fileIpc }     from './modules/file.ipc';
import { fsIpc }       from './modules/fs.ipc';
import { invoiceIpc }  from './modules/invoice.ipc';
import { paymentIpc }  from './modules/payment.ipc';
import { supplierIpc } from './modules/supplier.ipc';
import { systemIpc }   from './modules/system.ipc';
import { updaterIpc }  from './modules/updater.ipc';
import { windowIpc }   from './modules/window.ipc';

/**
 * The main IPC facade — the only import you need in components.
 *
 * ipc.app.*      → app metadata, ping
 * ipc.auth.*     → setup, login, refresh, logout, check, changePassword
 * ipc.db.*       → database status
 * ipc.employee.* → employee CRUD
 * ipc.supplier.* → supplier CRUD
 * ipc.customer.* → customer CRUD
 * ipc.invoice.*  → sales & purchase invoice CRUD
 * ipc.payment.*  → payment CRUD + balance queries
 * ipc.file.*     → read/write/stat files (legacy)
 * ipc.fs.*       → secure FS: dialogs, export CSV/JSON, save PDF, upload/download
 * ipc.win.*      → window: minimize/maximize/close, drag, fullscreen, multi-window
 * ipc.system.*   → OS info, app paths
 * ipc.updater.*  → check/install updates
 */
export const ipc = {
  app:      appIpc,
  auth:     authIpc,
    backup:   backupIpc,
  customer: customerIpc,
  db:       dbIpc,
  employee: employeeIpc,
  file:     fileIpc,
  fs:       fsIpc,
  invoice:  invoiceIpc,
  payment:  paymentIpc,
  supplier: supplierIpc,
  system:   systemIpc,
  updater:  updaterIpc,
  win:      windowIpc,
} as const;
