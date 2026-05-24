-- Migration 0001: complete ERP schema
-- Single authoritative migration for all tables.
-- company_id is on every business table for multi-company data isolation.
-- NULL company_id = legacy/unscoped data (treated as belonging to any company).

-- ── Master data ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fruits (
    id          TEXT PRIMARY KEY NOT NULL,
    name        TEXT NOT NULL,
    varieties   TEXT NOT NULL DEFAULT '[]',   -- JSON: string[]
    company_id  TEXT                          -- NULL = shared/legacy
);

-- ── Parties ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS suppliers (
    id                TEXT NOT NULL PRIMARY KEY,
    name              TEXT NOT NULL,
    code              TEXT NOT NULL DEFAULT '',
    phone             TEXT NOT NULL DEFAULT '',
    city              TEXT NOT NULL DEFAULT '',
    previous_balance  REAL NOT NULL DEFAULT 0,
    company_id        TEXT
);

CREATE TABLE IF NOT EXISTS customers (
    id                TEXT NOT NULL PRIMARY KEY,
    name              TEXT NOT NULL,
    phone             TEXT NOT NULL DEFAULT '',
    city              TEXT NOT NULL DEFAULT '',
    previous_balance  REAL NOT NULL DEFAULT 0,
    company_id        TEXT
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
    rows                     TEXT NOT NULL DEFAULT '[]',
    total_carets             REAL NOT NULL DEFAULT 0,
    total_calculated_weight  REAL NOT NULL DEFAULT 0,
    total_amount             REAL NOT NULL DEFAULT 0,
    freight_charge           REAL,
    hamali_charge            REAL,
    advance_paid             REAL,
    status                   TEXT NOT NULL DEFAULT 'DRAFT',
    created_at               TEXT NOT NULL,
    company_id               TEXT
);

-- ── Billing ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoices (
    id                 TEXT NOT NULL PRIMARY KEY,
    invoice_no         TEXT NOT NULL,
    date               TEXT NOT NULL,
    customer_id        TEXT NOT NULL,
    customer_name      TEXT NOT NULL,
    items              TEXT NOT NULL DEFAULT '[]',
    previous_balance   REAL NOT NULL DEFAULT 0,
    today_amount       REAL NOT NULL DEFAULT 0,
    hamali             REAL,
    discount           REAL,
    paid_amount        REAL NOT NULL DEFAULT 0,
    remaining_balance  REAL NOT NULL DEFAULT 0,
    notes              TEXT,
    created_at         TEXT NOT NULL,
    company_id         TEXT
);

CREATE TABLE IF NOT EXISTS purchase_invoices (
    id                 TEXT NOT NULL PRIMARY KEY,
    bill_no            TEXT NOT NULL,
    date               TEXT NOT NULL,
    supplier_id        TEXT NOT NULL,
    supplier_name      TEXT NOT NULL,
    items              TEXT NOT NULL DEFAULT '[]',
    previous_balance   REAL NOT NULL DEFAULT 0,
    today_amount       REAL NOT NULL DEFAULT 0,
    freight            REAL,
    hamali             REAL,
    paid_amount        REAL NOT NULL DEFAULT 0,
    remaining_balance  REAL NOT NULL DEFAULT 0,
    notes              TEXT,
    created_at         TEXT NOT NULL,
    company_id         TEXT
);

-- ── Payments ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
    id            TEXT NOT NULL PRIMARY KEY,
    date          TEXT NOT NULL,
    party_type    TEXT NOT NULL,
    party_id      TEXT NOT NULL,
    party_name    TEXT NOT NULL,
    amount        REAL NOT NULL,
    payment_mode  TEXT NOT NULL,
    reference_no  TEXT,
    notes         TEXT,
    company_id    TEXT
);

-- ── HR ────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS departments (
    id          TEXT NOT NULL PRIMARY KEY,
    name        TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    company_id  TEXT
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
    company_id     TEXT,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- ── App settings (key/value store) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app_settings (
    id     INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    key    TEXT    NOT NULL,
    value  TEXT    NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS app_settings_key_unique ON app_settings (key);

-- ── Indexes for company_id filtering (performance) ───────────────────────────

CREATE INDEX IF NOT EXISTS idx_fruits_company            ON fruits           (company_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_company         ON suppliers        (company_id);
CREATE INDEX IF NOT EXISTS idx_customers_company         ON customers        (company_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_arrivals_company  ON vehicle_arrivals (company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company          ON invoices         (company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_company ON purchase_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_company          ON payments         (company_id);
