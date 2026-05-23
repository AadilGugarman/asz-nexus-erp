-- Migration 0003: ERP schema extensions
-- Add company_id column to all core tables for multi-company support

ALTER TABLE invoices          ADD COLUMN company_id TEXT;
ALTER TABLE purchase_invoices ADD COLUMN company_id TEXT;
ALTER TABLE fruits            ADD COLUMN company_id TEXT;
ALTER TABLE customers         ADD COLUMN company_id TEXT;
ALTER TABLE suppliers         ADD COLUMN company_id TEXT;
ALTER TABLE vehicle_arrivals  ADD COLUMN company_id TEXT;
ALTER TABLE payments          ADD COLUMN company_id TEXT;

CREATE TABLE IF NOT EXISTS companies (
    id            TEXT    PRIMARY KEY NOT NULL,
    name          TEXT    NOT NULL,
    address       TEXT,
    phone         TEXT,
    email         TEXT,
    gst_no        TEXT,
    pan_no        TEXT,
    financial_year_start  TEXT,
    currency      TEXT    NOT NULL DEFAULT 'INR',
    created_at    TEXT    NOT NULL
);
