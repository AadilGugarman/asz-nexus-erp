-- Migration v3: ERP core schema
-- Creates all ERP tables: fruits, suppliers, customers,
-- vehicle_arrivals, purchase_invoices, invoices, payments, app_settings.
-- Uses IF NOT EXISTS so it's safe to run on existing databases.

-- ── Master data ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fruits (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    varieties TEXT NOT NULL DEFAULT '[]'  -- JSON: string[]
);

-- ── Parties ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS suppliers (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    code             TEXT NOT NULL DEFAULT '',
    phone            TEXT NOT NULL DEFAULT '',
    city             TEXT NOT NULL DEFAULT '',
    previous_balance REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers (name);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers (code);

CREATE TABLE IF NOT EXISTS customers (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    phone            TEXT NOT NULL DEFAULT '',
    city             TEXT NOT NULL DEFAULT '',
    previous_balance REAL NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);

-- ── Inventory / Vehicle Arrivals ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vehicle_arrivals (
    id                      TEXT PRIMARY KEY,
    arrival_no              TEXT NOT NULL,
    date                    TEXT NOT NULL,
    day                     TEXT NOT NULL DEFAULT '',
    vehicle_no              TEXT NOT NULL,
    vehicle_name            TEXT,
    fruit_type              TEXT NOT NULL,
    total_vehicle_weight    REAL NOT NULL DEFAULT 0,
    driver_name             TEXT,
    notes                   TEXT,
    rows                    TEXT NOT NULL DEFAULT '[]',  -- JSON: PurchaseRow[]
    total_carets            REAL NOT NULL DEFAULT 0,
    total_calculated_weight REAL NOT NULL DEFAULT 0,
    total_amount            REAL NOT NULL DEFAULT 0,
    freight_charge          REAL,
    hamali_charge           REAL,
    advance_paid            REAL,
    status                  TEXT NOT NULL DEFAULT 'DRAFT',  -- 'DRAFT' | 'SAVED'
    created_at              TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_arrivals_date      ON vehicle_arrivals (date);
CREATE INDEX IF NOT EXISTS idx_arrivals_status    ON vehicle_arrivals (status);
CREATE INDEX IF NOT EXISTS idx_arrivals_fruit     ON vehicle_arrivals (fruit_type);

-- ── Billing ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchase_invoices (
    id                TEXT PRIMARY KEY,
    bill_no           TEXT NOT NULL,
    date              TEXT NOT NULL,
    supplier_id       TEXT NOT NULL,
    supplier_name     TEXT NOT NULL,
    items             TEXT NOT NULL DEFAULT '[]',  -- JSON: PurchaseInvoiceItem[]
    previous_balance  REAL NOT NULL DEFAULT 0,
    today_amount      REAL NOT NULL DEFAULT 0,
    freight           REAL,
    hamali            REAL,
    paid_amount       REAL NOT NULL DEFAULT 0,
    remaining_balance REAL NOT NULL DEFAULT 0,
    notes             TEXT,
    created_at        TEXT NOT NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_supplier ON purchase_invoices (supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_date     ON purchase_invoices (date);

CREATE TABLE IF NOT EXISTS invoices (
    id                TEXT PRIMARY KEY,
    invoice_no        TEXT NOT NULL,
    date              TEXT NOT NULL,
    customer_id       TEXT NOT NULL,
    customer_name     TEXT NOT NULL,
    items             TEXT NOT NULL DEFAULT '[]',  -- JSON: InvoiceItem[]
    previous_balance  REAL NOT NULL DEFAULT 0,
    today_amount      REAL NOT NULL DEFAULT 0,
    hamali            REAL,
    discount          REAL,
    paid_amount       REAL NOT NULL DEFAULT 0,
    remaining_balance REAL NOT NULL DEFAULT 0,
    notes             TEXT,
    created_at        TEXT NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES customers (id)
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices (customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date     ON invoices (date);

-- ── Payments ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
    id           TEXT PRIMARY KEY,
    date         TEXT NOT NULL,
    party_type   TEXT NOT NULL,   -- 'SUPPLIER' | 'CUSTOMER'
    party_id     TEXT NOT NULL,
    party_name   TEXT NOT NULL,
    amount       REAL NOT NULL,
    payment_mode TEXT NOT NULL,   -- 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI'
    reference_no TEXT,
    notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_payments_party    ON payments (party_id);
CREATE INDEX IF NOT EXISTS idx_payments_date     ON payments (date);
CREATE INDEX IF NOT EXISTS idx_payments_type     ON payments (party_type);

-- ── App Settings ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app_settings (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    key   TEXT    NOT NULL UNIQUE,
    value TEXT    NOT NULL  -- JSON blob
);
