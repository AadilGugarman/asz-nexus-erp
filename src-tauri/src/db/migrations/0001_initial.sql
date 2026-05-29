-- 0001_initial.sql
-- ERP/Billing Software Perfect Schema (Production Grade)

-- 1. COMPANIES
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`legal_name` text,
	`gstin` text,
	`address` text,
	`phone` text,
	`email` text,
	`website` text,
	`logo` text,
	`currency` text DEFAULT 'INR',
	`fy_start_month` integer DEFAULT 4,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP
);

-- 2. FINANCIAL YEARS
CREATE TABLE `financial_years` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`is_closed` integer DEFAULT 0,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
);

-- 3. USERS
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL UNIQUE,
	`password_hash` text NOT NULL,
	`full_name` text,
	`role` text DEFAULT 'user',
	`is_active` integer DEFAULT 1,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP
);

-- 4. USER COMPANY ACCESS
CREATE TABLE `user_companies` (
	`user_id` text NOT NULL,
	`company_id` text NOT NULL,
	PRIMARY KEY (`user_id`, `company_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
);

-- 5. ACCOUNT GROUPS
CREATE TABLE `account_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`parent_group_id` text,
	`nature` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
);

-- 6. LEDGERS (Parties)
CREATE TABLE `ledgers` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`group_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`type` text NOT NULL, -- CUSTOMER, SUPPLIER, BOTH
	`phone` text,
	`email` text,
	`gstin` text,
	`billing_address` text,
	`shipping_address` text,
	`city` text,
	`state` text,
	`opening_balance` real DEFAULT 0,
	`opening_balance_type` text DEFAULT 'Dr',
	`credit_limit` real DEFAULT 0,
	`notes` text,
	`is_system` integer DEFAULT 0,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`group_id`) REFERENCES `account_groups`(`id`)
);

-- 7. FRUITS
CREATE TABLE `fruits` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`name` text NOT NULL,
	`pricing_type` text DEFAULT 'caret',
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE
);

-- 8. VARIETIES
CREATE TABLE `varieties` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`fruit_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`fruit_id`) REFERENCES `fruits`(`id`) ON DELETE CASCADE
);

-- 9. INVOICES
CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`financial_year_id` text NOT NULL,
	`type` text NOT NULL, -- SALE, PURCHASE
	`invoice_number` text NOT NULL,
	`date` integer NOT NULL,
	`ledger_id` text NOT NULL,
	`vehicle_no` text,
	`declared_weight` real,
	`sub_total` real NOT NULL,
	`tax_total` real DEFAULT 0,
	`discount_total` real DEFAULT 0,
	`freight` real DEFAULT 0,
	`hamali` real DEFAULT 0,
	`other_charges` real DEFAULT 0,
	`round_off` real DEFAULT 0,
	`grand_total` real NOT NULL,
	`paid_amount` real DEFAULT 0,
	`notes` text,
	`status` text DEFAULT 'DRAFT',
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`financial_year_id`) REFERENCES `financial_years`(`id`),
	FOREIGN KEY (`ledger_id`) REFERENCES `ledgers`(`id`)
);

-- 10. INVOICE ITEMS
CREATE TABLE `invoice_items` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_id` text NOT NULL,
	`variety_id` text NOT NULL,
	`quantity` real NOT NULL,
	`weight` real,
	`rate` real NOT NULL,
	`pricing_type` text DEFAULT 'caret',
	`amount` real NOT NULL,
	`tax_rate` real DEFAULT 0,
	`tax_amount` real DEFAULT 0,
	`row_note` text,
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`variety_id`) REFERENCES `varieties`(`id`)
);

-- 11. PAYMENTS / RECEIPTS
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`financial_year_id` text NOT NULL,
	`type` text NOT NULL, -- PAYMENT, RECEIPT
	`voucher_number` text NOT NULL,
	`date` integer NOT NULL,
	`ledger_id` text NOT NULL,
	`offset_ledger_id` text NOT NULL,
	`amount` real NOT NULL,
	`payment_mode` text DEFAULT 'CASH',
	`reference_no` text,
	`narration` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`financial_year_id`) REFERENCES `financial_years`(`id`),
	FOREIGN KEY (`ledger_id`) REFERENCES `ledgers`(`id`),
	FOREIGN KEY (`offset_ledger_id`) REFERENCES `ledgers`(`id`)
);

-- 12. CARET TRANSACTIONS
CREATE TABLE `caret_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` text NOT NULL,
	`financial_year_id` text NOT NULL,
	`ledger_id` text NOT NULL,
	`type` text NOT NULL, -- GIVEN, RETURNED
	`quantity` integer NOT NULL,
	`date` integer NOT NULL,
	`fruit_name` text,
	`notes` text,
	`invoice_id` text,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE,
	FOREIGN KEY (`financial_year_id`) REFERENCES `financial_years`(`id`),
	FOREIGN KEY (`ledger_id`) REFERENCES `ledgers`(`id`),
	FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL
);

-- INDEXES
CREATE INDEX `idx_invoice_company_fy` ON `invoices` (`company_id`, `financial_year_id`);
CREATE INDEX `idx_invoice_number` ON `invoices` (`invoice_number`);
CREATE INDEX `idx_payment_company_fy` ON `payments` (`company_id`, `financial_year_id`);
CREATE INDEX `idx_caret_company_fy` ON `caret_transactions` (`company_id`, `financial_year_id`, `ledger_id`);
CREATE INDEX `idx_ledger_company` ON `ledgers` (`company_id`, `type`);
