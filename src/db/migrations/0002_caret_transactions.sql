-- Migration: 0002_caret_transactions
-- Adds the caret_transactions table for customer-wise caret/crate tracking.

CREATE TABLE IF NOT EXISTS `caret_transactions` (
  `id`            text PRIMARY KEY NOT NULL,
  `date`          text NOT NULL,
  `customer_id`   text NOT NULL,
  `customer_name` text NOT NULL,
  `type`          text NOT NULL,
  `fruit_name`    text NOT NULL DEFAULT '',
  `caret_qty`     integer NOT NULL DEFAULT 0,
  `note`          text,
  `bill_id`       text,
  `bill_no`       text,
  `company_id`    text,
  `created_at`    text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `caret_tx_customer_idx` ON `caret_transactions` (`customer_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `caret_tx_date_idx`     ON `caret_transactions` (`date`);
