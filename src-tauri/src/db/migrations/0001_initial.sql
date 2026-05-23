-- Migration 0001: initial schema
-- Core ERP tables: invoices, purchase_invoices, fruits, customers, suppliers,
-- vehicle_arrivals, payments, app_settings

CREATE TABLE IF NOT EXISTS invoices (
    id                 TEXT    PRIMARY KEY NOT NULL,
    invoice_no         TEXT    NOT NULL,
    date               TEXT    NOT NULL,
    customer_id        TEXT    NOT NULL,
    customer_name      TEXT    NOT NULL,
    items              TEXT    NOT NULL DEFAULT '[]',
    previous_balance   REAL    NOT NULL DEFAULT 0,
    today_amount       REAL    NOT NULL DEFAULT 0,
    hamali             REAL,
    discount           REAL,
    paid_amount        REAL    NOT NULL DEFAULT 0,
    remaining_balance  REAL    NOT NULL DEFAULT 0,
    notes              TEXT,
    created_at         TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS purchase_invoices (
    id                 TEXT    PRIMARY KEY NOT NULL,
    bill_no            TEXT    NOT NULL,
    date               TEXT    NOT NULL,
    supplier_id        TEXT    NOT NULL,
    supplier_name      TEXT    NOT NULL,
    items              TEXT    NOT NULL DEFAULT '[]',
    previous_balance   REAL    NOT NULL DEFAULT 0,
    today_amount       REAL    NOT NULL DEFAULT 0,
    freight            REAL,
    hamali             REAL,
    paid_amount        REAL    NOT NULL DEFAULT 0,
    remaining_balance  REAL    NOT NULL DEFAULT 0,
    notes              TEXT,
    created_at         TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS fruits (
    id         TEXT PRIMARY KEY NOT NULL,
    name       TEXT NOT NULL,
    varieties  TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS customers (
    id                TEXT    PRIMARY KEY NOT NULL,
    name              TEXT    NOT NULL,
    phone             TEXT    NOT NULL DEFAULT '',
    city              TEXT    NOT NULL DEFAULT '',
    previous_balance  REAL    NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS suppliers (
    id                TEXT    PRIMARY KEY NOT NULL,
    name              TEXT    NOT NULL,
    code              TEXT    NOT NULL DEFAULT '',
    phone             TEXT    NOT NULL DEFAULT '',
    city              TEXT    NOT NULL DEFAULT '',
    previous_balance  REAL    NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vehicle_arrivals (
    id                        TEXT    PRIMARY KEY NOT NULL,
    arrival_no                TEXT    NOT NULL,
    date                      TEXT    NOT NULL,
    day                       TEXT    NOT NULL DEFAULT '',
    vehicle_no                TEXT    NOT NULL,
    vehicle_name              TEXT,
    fruit_type                TEXT    NOT NULL,
    total_vehicle_weight      REAL    NOT NULL DEFAULT 0,
    driver_name               TEXT,
    notes                     TEXT,
    rows                      TEXT    NOT NULL DEFAULT '[]',
    total_carets              REAL    NOT NULL DEFAULT 0,
    total_calculated_weight   REAL    NOT NULL DEFAULT 0,
    total_amount              REAL    NOT NULL DEFAULT 0,
    freight_charge            REAL,
    hamali_charge             REAL,
    advance_paid              REAL,
    status                    TEXT    NOT NULL DEFAULT 'DRAFT',
    created_at                TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
    id            TEXT    PRIMARY KEY NOT NULL,
    date          TEXT    NOT NULL,
    party_type    TEXT    NOT NULL,
    party_id      TEXT    NOT NULL,
    party_name    TEXT    NOT NULL,
    amount        REAL    NOT NULL,
    payment_mode  TEXT    NOT NULL,
    reference_no  TEXT,
    notes         TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
    id     INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    key    TEXT    NOT NULL,
    value  TEXT    NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS app_settings_key_unique ON app_settings (key);
