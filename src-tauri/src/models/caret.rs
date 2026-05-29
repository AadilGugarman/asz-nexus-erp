use serde::{Deserialize, Serialize};
use rusqlite::Row;

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CaretTransaction {
    pub id: String,
    pub company_id: String,
    pub financial_year_id: String,
    pub ledger_id: String,
    pub tx_type: String, // 'GIVEN' or 'RETURNED'
    pub quantity: i32,
    pub date: i64,
    pub fruit_name: Option<String>,
    pub notes: Option<String>,
    pub invoice_id: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

impl CaretTransaction {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            company_id: row.get("company_id")?,
            financial_year_id: row.get("financial_year_id")?,
            ledger_id: row.get("ledger_id")?,
            tx_type: row.get("type")?,
            quantity: row.get("quantity")?,
            date: row.get("date")?,
            fruit_name: row.get("fruit_name")?,
            notes: row.get("notes")?,
            invoice_id: row.get("invoice_id")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}
