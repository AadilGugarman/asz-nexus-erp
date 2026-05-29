use serde::{Deserialize, Serialize};
use rusqlite::Row;
use crate::error::AppResult;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Payment {
    pub id: String,
    pub company_id: String,
    pub financial_year_id: String,
    pub payment_type: String, // 'PAYMENT', 'RECEIPT'
    pub voucher_number: String,
    pub date: i64,
    pub ledger_id: String,
    pub offset_ledger_id: String,
    pub amount: f64,
    pub payment_mode: String, // 'CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI'
    pub reference_no: Option<String>,
    pub narration: Option<String>,
    pub created_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct CreatePayment {
    pub company_id: String,
    pub financial_year_id: String,
    pub payment_type: String,
    pub date: i64,
    pub ledger_id: String,
    pub offset_ledger_id: String,
    pub amount: f64,
    pub payment_mode: String,
    pub reference_no: Option<String>,
    pub narration: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct PaymentFilter {
    pub company_id: String,
    pub financial_year_id: String,
    pub party_id: Option<String>,
    pub party_type: Option<String>,
    pub date_from: Option<i64>,
    pub date_to: Option<i64>,
    pub page: Option<u32>,
    pub limit: Option<u32>,
}

impl CreatePayment {
    pub fn validate(&self) -> AppResult<()> {
        if self.amount <= 0.0 {
            return Err(crate::error::AppError::Validation("Amount must be greater than zero".to_string()));
        }
        Ok(())
    }
}

impl Payment {
    pub const COLUMNS: &'static str = "id, company_id, financial_year_id, type as payment_type, voucher_number, date, ledger_id, offset_ledger_id, amount, payment_mode, reference_no, narration, created_at";

    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            company_id: row.get("company_id")?,
            financial_year_id: row.get("financial_year_id")?,
            payment_type: row.get("type")?,
            voucher_number: row.get("voucher_number")?,
            date: row.get("date")?,
            ledger_id: row.get("ledger_id")?,
            offset_ledger_id: row.get("offset_ledger_id")?,
            amount: row.get("amount")?,
            payment_mode: row.get("payment_mode")?,
            reference_no: row.get("reference_no")?,
            narration: row.get("narration")?,
            created_at: row.get("created_at")?,
        })
    }
}
