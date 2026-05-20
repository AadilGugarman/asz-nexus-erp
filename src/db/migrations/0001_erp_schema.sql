CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`invoice_no` text NOT NULL,
	`date` text NOT NULL,
	`customer_id` text NOT NULL,
	`customer_name` text NOT NULL,
	`items` text DEFAULT '[]' NOT NULL,
	`previous_balance` real DEFAULT 0 NOT NULL,
	`today_amount` real DEFAULT 0 NOT NULL,
	`hamali` real,
	`discount` real,
	`paid_amount` real DEFAULT 0 NOT NULL,
	`remaining_balance` real DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `purchase_invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`bill_no` text NOT NULL,
	`date` text NOT NULL,
	`supplier_id` text NOT NULL,
	`supplier_name` text NOT NULL,
	`items` text DEFAULT '[]' NOT NULL,
	`previous_balance` real DEFAULT 0 NOT NULL,
	`today_amount` real DEFAULT 0 NOT NULL,
	`freight` real,
	`hamali` real,
	`paid_amount` real DEFAULT 0 NOT NULL,
	`remaining_balance` real DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fruits` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`varieties` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`previous_balance` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`previous_balance` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vehicle_arrivals` (
	`id` text PRIMARY KEY NOT NULL,
	`arrival_no` text NOT NULL,
	`date` text NOT NULL,
	`day` text DEFAULT '' NOT NULL,
	`vehicle_no` text NOT NULL,
	`vehicle_name` text,
	`fruit_type` text NOT NULL,
	`total_vehicle_weight` real DEFAULT 0 NOT NULL,
	`driver_name` text,
	`notes` text,
	`rows` text DEFAULT '[]' NOT NULL,
	`total_carets` real DEFAULT 0 NOT NULL,
	`total_calculated_weight` real DEFAULT 0 NOT NULL,
	`total_amount` real DEFAULT 0 NOT NULL,
	`freight_charge` real,
	`hamali_charge` real,
	`advance_paid` real,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`party_type` text NOT NULL,
	`party_id` text NOT NULL,
	`party_name` text NOT NULL,
	`amount` real NOT NULL,
	`payment_mode` text NOT NULL,
	`reference_no` text,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `app_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_settings_key_unique` ON `app_settings` (`key`);