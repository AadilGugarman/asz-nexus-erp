// models/invoice.rs
// Sales invoice and purchase invoice domain models.

use serde::{Deserialize, Serialize};
use rusqlite::Row;
use crate::error::AppResult;
use crate::validation;

// ── Sales Invoice ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Invoice {
    pub id:                String,
    pub invoice_no:        String,
    pub date:              String,
    pub customer_id:       String,
    pub customer_name:     String,
    pub items:             String, // JSON
    pub previous_balance:  f64,
    pub today_amount:      f64,
    pub hamali:            Option<f64>,
    pub discount:          Option<f64>,
    pub paid_amount:       f64,
    pub remaining_balance: f64,
    pub notes:             Option<String>,
    pub created_at:        String,
}

impl Invoice {
    pub const COLUMNS: &'static str =
        "id, invoice_no, date, customer_id, customer_name, items, \
         previous_balance, today_amount, hamali, discount, \
         paid_amount, remaining_balance, notes, created_at";

    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id:                row.get(0)?,
            invoice_no:        row.get(1)?,
            date:              row.get(2)?,
            customer_id:       row.get(3)?,
            customer_name:     row.get(4)?,
            items:             row.get(5)?,
            previous_balance:  row.get(6)?,
            today_amount:      row.get(7)?,
            hamali:            row.get(8)?,
            discount:          row.get(9)?,
            paid_amount:       row.get(10)?,
            remaining_balance: row.get(11)?,
            notes:             row.get(12)?,
            created_at:        row.get(13)?,
        })
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateInvoice {
    pub invoice_no:        String,
    pub date:              String,
    pub customer_id:       String,
    pub customer_name:     String,
    pub items:             String, // JSON string
    pub previous_balance:  f64,
    pub today_amount:      f64,
    pub hamali:            Option<f64>,
    pub discount:          Option<f64>,
    pub paid_amount:       f64,
    pub remaining_balance: f64,
    pub notes:             Option<String>,
    pub created_at:        String,
}

impl CreateInvoice {
    pub fn validate(&self) -> AppResult<()> {
        validation::require_non_empty(&self.invoice_no,    "invoice_no")?;
        validation::require_non_empty(&self.date,          "date")?;
        validation::require_non_empty(&self.customer_id,   "customer_id")?;
        validation::require_non_empty(&self.customer_name, "customer_name")?;
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub struct InvoiceFilter {
    pub customer_id: Option<String>,
    pub date_from:   Option<String>,
    pub date_to:     Option<String>,
    pub search:      Option<String>,
    pub page:        Option<u32>,
    pub limit:       Option<u32>,
}

// ── Purchase Invoice ──────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PurchaseInvoice {
    pub id:                String,
    pub bill_no:           String,
    pub date:              String,
    pub supplier_id:       String,
    pub supplier_name:     String,
    pub items:             String, // JSON
    pub previous_balance:  f64,
    pub today_amount:      f64,
    pub freight:           Option<f64>,
    pub hamali:            Option<f64>,
    pub paid_amount:       f64,
    pub remaining_balance: f64,
    pub notes:             Option<String>,
    pub created_at:        String,
}

impl PurchaseInvoice {
    pub const COLUMNS: &'static str =
        "id, bill_no, date, supplier_id, supplier_name, items, \
         previous_balance, today_amount, freight, hamali, \
         paid_amount, remaining_balance, notes, created_at";

    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id:                row.get(0)?,
            bill_no:           row.get(1)?,
            date:              row.get(2)?,
            supplier_id:       row.get(3)?,
            supplier_name:     row.get(4)?,
            items:             row.get(5)?,
            previous_balance:  row.get(6)?,
            today_amount:      row.get(7)?,
            freight:           row.get(8)?,
            hamali:            row.get(9)?,
            paid_amount:       row.get(10)?,
            remaining_balance: row.get(11)?,
            notes:             row.get(12)?,
            created_at:        row.get(13)?,
        })
    }
}

#[derive(Debug, Deserialize)]
pub struct CreatePurchaseInvoice {
    pub bill_no:           String,
    pub date:              String,
    pub supplier_id:       String,
    pub supplier_name:     String,
    pub items:             String,
    pub previous_balance:  f64,
    pub today_amount:      f64,
    pub freight:           Option<f64>,
    pub hamali:            Option<f64>,
    pub paid_amount:       f64,
    pub remaining_balance: f64,
    pub notes:             Option<String>,
    pub created_at:        String,
}

impl CreatePurchaseInvoice {
    pub fn validate(&self) -> AppResult<()> {
        validation::require_non_empty(&self.bill_no,       "bill_no")?;
        validation::require_non_empty(&self.date,          "date")?;
        validation::require_non_empty(&self.supplier_id,   "supplier_id")?;
        validation::require_non_empty(&self.supplier_name, "supplier_name")?;
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub struct PurchaseInvoiceFilter {
    pub supplier_id: Option<String>,
    pub date_from:   Option<String>,
    pub search:      Option<String>,
    pub page:        Option<u32>,
    pub limit:       Option<u32>,
}
