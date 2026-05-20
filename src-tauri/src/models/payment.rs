// models/payment.rs
// Payment receipt domain model.

use serde::{Deserialize, Serialize};
use rusqlite::Row;
use crate::error::AppResult;
use crate::validation;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Payment {
    pub id:           String,
    pub date:         String,
    pub party_type:   String, // 'SUPPLIER' | 'CUSTOMER'
    pub party_id:     String,
    pub party_name:   String,
    pub amount:       f64,
    pub payment_mode: String, // 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI'
    pub reference_no: Option<String>,
    pub notes:        Option<String>,
}

impl Payment {
    pub const COLUMNS: &'static str =
        "id, date, party_type, party_id, party_name, amount, payment_mode, reference_no, notes";

    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id:           row.get(0)?,
            date:         row.get(1)?,
            party_type:   row.get(2)?,
            party_id:     row.get(3)?,
            party_name:   row.get(4)?,
            amount:       row.get(5)?,
            payment_mode: row.get(6)?,
            reference_no: row.get(7)?,
            notes:        row.get(8)?,
        })
    }
}

#[derive(Debug, Deserialize)]
pub struct CreatePayment {
    pub date:         String,
    pub party_type:   String,
    pub party_id:     String,
    pub party_name:   String,
    pub amount:       f64,
    pub payment_mode: String,
    pub reference_no: Option<String>,
    pub notes:        Option<String>,
}

impl CreatePayment {
    pub fn validate(&self) -> AppResult<()> {
        validation::require_non_empty(&self.date,         "date")?;
        validation::require_non_empty(&self.party_id,     "party_id")?;
        validation::require_non_empty(&self.party_name,   "party_name")?;
        validation::require_non_empty(&self.payment_mode, "payment_mode")?;
        if self.amount <= 0.0 {
            return Err(crate::error::AppError::Validation(
                "amount must be greater than 0".into(),
            ));
        }
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub struct PaymentFilter {
    pub party_id:   Option<String>,
    pub party_type: Option<String>,
    pub date_from:  Option<String>,
    pub page:       Option<u32>,
    pub limit:      Option<u32>,
}
