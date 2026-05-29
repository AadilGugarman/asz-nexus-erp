use serde::{Deserialize, Serialize};
use rusqlite::Row;

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Company {
    pub id: String,
    pub name: String,
    pub legal_name: Option<String>,
    pub gstin: Option<String>,
    pub address: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub website: Option<String>,
    pub logo: Option<String>,
    pub currency: String,
    pub fy_start_month: i32,
    pub created_at: i64,
    pub updated_at: i64,
}

impl Company {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            name: row.get("name")?,
            legal_name: row.get("legal_name")?,
            gstin: row.get("gstin")?,
            address: row.get("address")?,
            phone: row.get("phone")?,
            email: row.get("email")?,
            website: row.get("website")?,
            logo: row.get("logo")?,
            currency: row.get("currency")?,
            fy_start_month: row.get("fy_start_month")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}
