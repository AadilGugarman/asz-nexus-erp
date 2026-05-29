use serde::{Deserialize, Serialize};
use rusqlite::Row;

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FinancialYear {
    pub id: String,
    pub company_id: String,
    pub name: String,
    pub start_date: i64,
    pub end_date: i64,
    pub is_closed: bool,
    pub created_at: i64,
}

impl FinancialYear {
    #[allow(dead_code)]
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            company_id: row.get("company_id")?,
            name: row.get("name")?,
            start_date: row.get("start_date")?,
            end_date: row.get("end_date")?,
            is_closed: row.get("is_closed")?,
            created_at: row.get("created_at")?,
        })
    }
}
