-- Migration v2: Caret (crate/box) transaction ledger
-- Tracks customer-wise caret given/return history.

CREATE TABLE IF NOT EXISTS `caret_transactions` (
  `id`            TEXT    PRIMARY KEY NOT NULL,
  `date`          TEXT    NOT NULL,
  `customer_id`   TEXT    NOT NULL,
  `customer_name` TEXT    NOT NULL,
  `type`          TEXT    NOT NULL,
  `fruit_name`    TEXT    NOT NULL DEFAULT '',
  `caret_qty`     INTEGER NOT NULL DEFAULT 0,
  `note`          TEXT,
  `bill_id`       TEXT,
  `bill_no`       TEXT,
  `company_id`    TEXT,
  `created_at`    TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS `caret_tx_customer_idx` ON `caret_transactions` (`customer_id`);
CREATE INDEX IF NOT EXISTS `caret_tx_date_idx`     ON `caret_transactions` (`date`);
