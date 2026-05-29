-- 0002: Add flat app columns to support legacy app data model
-- These nullable columns store the app-level flat data alongside the
-- normalised schema so both the ERP data layer and the UI model coexist.
-- All columns are nullable so existing rows are unaffected.

-- invoices flat columns
ALTER TABLE invoices ADD COLUMN invoice_no TEXT;
ALTER TABLE invoices ADD COLUMN customer_id TEXT;
ALTER TABLE invoices ADD COLUMN customer_name TEXT;
ALTER TABLE invoices ADD COLUMN supplier_id TEXT;
ALTER TABLE invoices ADD COLUMN supplier_name TEXT;
ALTER TABLE invoices ADD COLUMN bill_no TEXT;
ALTER TABLE invoices ADD COLUMN items_json TEXT;
ALTER TABLE invoices ADD COLUMN previous_balance REAL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN today_amount REAL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN remaining_balance REAL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN discount REAL DEFAULT 0;

-- payments flat columns
ALTER TABLE payments ADD COLUMN party_type TEXT;
ALTER TABLE payments ADD COLUMN party_id TEXT;
ALTER TABLE payments ADD COLUMN party_name TEXT;
ALTER TABLE payments ADD COLUMN payment_notes TEXT;

-- caret_transactions flat columns
ALTER TABLE caret_transactions ADD COLUMN customer_id_flat TEXT;
ALTER TABLE caret_transactions ADD COLUMN customer_name TEXT;
ALTER TABLE caret_transactions ADD COLUMN caret_qty INTEGER DEFAULT 0;
ALTER TABLE caret_transactions ADD COLUMN note TEXT;
ALTER TABLE caret_transactions ADD COLUMN bill_id TEXT;
ALTER TABLE caret_transactions ADD COLUMN bill_no TEXT;
