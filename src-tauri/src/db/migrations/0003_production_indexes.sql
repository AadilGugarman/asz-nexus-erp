-- Migration v3: Production performance indexes
-- Adds date-range indexes for the most common query patterns in the ERP:
-- ledger views, reports, and date-filtered lists.
-- All indexes are partial/covering where possible to keep write overhead low.

-- ── Date indexes (used by ledger, reports, date-range filters) ────────────────

CREATE INDEX IF NOT EXISTS idx_invoices_date
    ON invoices (date, company_id);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_date
    ON invoices (customer_id, date);

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_date
    ON purchase_invoices (date, company_id);

CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier_date
    ON purchase_invoices (supplier_id, date);

CREATE INDEX IF NOT EXISTS idx_payments_date
    ON payments (date, company_id);

CREATE INDEX IF NOT EXISTS idx_payments_party
    ON payments (party_id, party_type, date);

CREATE INDEX IF NOT EXISTS idx_vehicle_arrivals_date
    ON vehicle_arrivals (date, company_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_arrivals_status
    ON vehicle_arrivals (status, company_id);

CREATE INDEX IF NOT EXISTS idx_caret_tx_company_date
    ON caret_transactions (company_id, date);

-- ── Name search indexes (used by autocomplete / CommandSelect) ────────────────

CREATE INDEX IF NOT EXISTS idx_suppliers_name
    ON suppliers (name, company_id);

CREATE INDEX IF NOT EXISTS idx_customers_name
    ON customers (name, company_id);

CREATE INDEX IF NOT EXISTS idx_fruits_name
    ON fruits (name, company_id);
