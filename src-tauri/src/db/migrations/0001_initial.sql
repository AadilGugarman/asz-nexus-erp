-- Migration 0001: complete ERP schema
-- Single authoritative migration for all tables.
-- The Rust migration runner (migrations.rs) applies this once and tracks it
-- in the _migrations table. Safe to re-run — all statements use IF NOT EXISTS.

-- ── Master data ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fruits (
    id         TEXT PRIMARY KEY NOT NULL,
    name       TEXT NOT NULL,
    varieties  TEXT NOT NULL DEFAULT '[]'   -- JSON: string[]
);

-- ── Parties ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS suppliers (
    id                TEXT NOT NULL PRIMARY KEY,
    name              TEXT NOT NULL,
    code              TEXT NOT NULL DEFAULT '',
    phone             TEXT NOT NULL DEFAULT '',
    city              TEXT NOT NULL DEFAULT '',
    previous_balance  REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS customers (
    id                TEXT NOT NULL PRIMARY KEY,
    name              TEXT NOT NULL,
    phone             TEXT NOT NULL DEFAULT '',
    city              TEXT NOT NULL DEFAULT '',
    previous_balance  REAL NOT NULL DEFAULT 0
);

-- ── Inventory ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicle_arrivals (
    id                       TEXT NOT NULL PRIMARY KEY,
    arrival_no               TEXT NOT NULL,
    date                     TEXT NOT NULL,
    day                      TEXT NOT NULL DEFAULT '',
    vehicle_no               TEXT NOT NULL,
    vehicle_name             TEXT,
    fruit_type               TEXT NOT NULL,
    total_vehicle_weight     REAL NOT NULL DEFAULT 0,
    driver_name              TEXT,
    notes                    TEXT,
    rows                     TEXT NOT NULL DEFAULT '[]',  -- JSON: PurchaseRow[]
    total_carets             REAL NOT NULL DEFAULT 0,
    total_calculated_weight  REAL NOT NULL DEFAULT 0,
    total_amount             REAL NOT NULL DEFAULT 0,
    freight_charge           REAL,
    hamali_charge            REAL,
    advance_paid             REAL,
    status                   TEXT NOT NULL DEFAULT 'DRAFT',  -- 'DRAFT' | 'SAVED'
    created_at               TEXT NOT NULL
);

-- ── Billing ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoices (
    id                 TEXT NOT NULL PRIMARY KEY,
    invoice_no         TEXT NOT NULL,
    date               TEXT NOT NULL,
    customer_id        TEXT NOT NULL,
    customer_name      TEXT NOT NULL,
    items              TEXT NOT NULL DEFAULT '[]',  -- JSON: InvoiceItem[]
    previous_balance   REAL NOT NULL DEFAULT 0,
    today_amount       REAL NOT NULL DEFAULT 0,
    hamali             REAL,
    discount           REAL,
    paid_amount        REAL NOT NULL DEFAULT 0,
    remaining_balance  REAL NOT NULL DEFAULT 0,
    notes              TEXT,
    created_at         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_invoices (
    id                 TEXT NOT NULL PRIMARY KEY,
    bill_no            TEXT NOT NULL,
    date               TEXT NOT NULL,
    supplier_id        TEXT NOT NULL,
    supplier_name      TEXT NOT NULL,
    items              TEXT NOT NULL DEFAULT '[]',  -- JSON: PurchaseInvoiceItem[]
    previous_balance   REAL NOT NULL DEFAULT 0,
    today_amount       REAL NOT NULL DEFAULT 0,
    freight            REAL,
    hamali             REAL,
    paid_amount        REAL NOT NULL DEFAULT 0,
    remaining_balance  REAL NOT NULL DEFAULT 0,
    notes              TEXT,
    created_at         TEXT NOT NULL
);

-- ── Payments ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
    id            TEXT NOT NULL PRIMARY KEY,
    date          TEXT NOT NULL,
    party_type    TEXT NOT NULL,   -- 'SUPPLIER' | 'CUSTOMER'
    party_id      TEXT NOT NULL,
    party_name    TEXT NOT NULL,
    amount        REAL NOT NULL,
    payment_mode  TEXT NOT NULL,   -- 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI'
    reference_no  TEXT,
    notes         TEXT
);

-- ── HR ────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS departments (
    id          TEXT NOT NULL PRIMARY KEY,
    name        TEXT NOT NULL,
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
    id             TEXT NOT NULL PRIMARY KEY,
    name           TEXT NOT NULL,
    department_id  TEXT,
    phone          TEXT NOT NULL DEFAULT '',
    email          TEXT NOT NULL DEFAULT '',
    salary         REAL NOT NULL DEFAULT 0,
    joined_at      TEXT,
    created_at     TEXT NOT NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- ── App settings (key/value store) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app_settings (
    id     INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    key    TEXT    NOT NULL,
    value  TEXT    NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS app_settings_key_unique ON app_settings (key);
