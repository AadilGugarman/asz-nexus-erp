/**
 * ipc/commands.ts
 * Centralised command name constants.
 *
 * Every Tauri command name lives here — no magic strings anywhere else.
 * The string values MUST match the Rust function names exactly (snake_case).
 *
 * Usage:
 *   import { CMD } from '@/ipc/commands';
 *   await invoke(CMD.app.ping, { message: 'hi' });
 */

export const CMD = {
  app: {
    getAppInfo: "get_app_info",
  },

  auth: {
    isSetupDone: "auth_is_setup_done",
    setup: "auth_setup",
    login: "auth_login",
    refresh: "auth_refresh",
    restoreSession: "auth_restore_session",
    logout: "auth_logout",
    check: "auth_check",
    resetApp: "auth_reset_app",
    changePassword: "auth_change_password",
  },

  db: {
    getStats: "db_get_stats",
    resetCompanyData: "db_reset_company_data",
    resetDatabase: "db_reset_database",
  },

  employee: {
    list: "employee_list",
    get: "employee_get",
    create: "employee_create",
    update: "employee_update",
    delete: "employee_delete",
    setActive: "employee_set_active",
    bulkInsert: "employee_bulk_insert",
  },

  file: {
    writeTextFile: "write_text_file",
    readTextFile: "read_text_file",
    statPath: "stat_path_cmd",
  },

  /** Secure filesystem commands with dialog support. */
  fs: {
    stat: "fs_stat",
    listDir: "fs_list_dir",
    readText: "fs_read_text",
    writeText: "fs_write_text",
    readBytes: "fs_read_bytes",
    writeBytes: "fs_write_bytes",
    copy: "fs_copy",
    delete: "fs_delete",
    exportCsv: "fs_export_csv",
    exportJson: "fs_export_json",
    savePdf: "fs_save_pdf",
    dialogOpen: "fs_dialog_open",
    dialogSave: "fs_dialog_save",
    getAllowedRoots: "fs_get_allowed_roots",
  },

  system: {
    getSystemInfo: "get_system_info",
    getAppPaths: "get_app_data_dir",
  },

  /** Window management commands. */
  win: {
    minimize: "win_minimize",
    maximize: "win_maximize",
    unmaximize: "win_unmaximize",
    close: "win_close",
    hide: "win_hide",
    show: "win_show",
    toggleFullscreen: "win_toggle_fullscreen",
    setAlwaysOnTop: "win_set_always_on_top",
    setTitle: "win_set_title",
    setSize: "win_set_size",
    setPosition: "win_set_position",
    center: "win_center",
    getState: "win_get_state",
    open: "win_open",
    list: "win_list",
    startDrag: "win_start_drag",
  },

  updater: {
    check: "updater_check",
    install: "updater_install",
  },

  supplier: {
    list: "supplier_list",
    get: "supplier_get",
    create: "supplier_create",
    update: "supplier_update",
    delete: "supplier_delete",
  },

  customer: {
    list: "customer_list",
    get: "customer_get",
    create: "customer_create",
    update: "customer_update",
    delete: "customer_delete",
  },

  invoice: {
    list: "invoice_list",
    get: "invoice_get",
    create: "invoice_create",
    delete: "invoice_delete",
    purchaseList: "purchase_list",
    purchaseGet: "purchase_get",
    purchaseCreate: "purchase_create",
    purchaseDelete: "purchase_delete",
  },

  payment: {
    list: "payment_list",
    get: "payment_get",
    create: "payment_create",
    delete: "payment_delete",
    totalByParty: "payment_total_by_party",
  },

  /** SQLite backup & restore commands. */
  backup: {
    create: "backup_create",
    list: "backup_list",
    validate: "backup_validate",
    delete: "backup_delete",
    restore: "backup_restore",
    prune: "backup_prune",
    getDir: "backup_get_dir",
  },
} as const;

/** Flat union of all command strings — useful for type-checking. */
type Flatten<T> = T extends object
  ? { [K in keyof T]: Flatten<T[K]> }[keyof T]
  : T;

export type CommandName = Flatten<typeof CMD>;
