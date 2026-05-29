use serde::{Deserialize, Serialize};
use rusqlite::Row;

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AccountGroup {
    pub id: String,
    pub company_id: String,
    pub name: String,
    pub parent_group_id: Option<String>,
    pub nature: String,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Ledger {
    pub id: String,
    pub company_id: String,
    pub group_id: String,
    pub name: String,
    pub code: Option<String>,
    pub ledger_type: String, // 'CUSTOMER', 'SUPPLIER', 'BOTH'
    pub phone: Option<String>,
    pub email: Option<String>,
    pub gstin: Option<String>,
    pub billing_address: Option<String>,
    pub shipping_address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub opening_balance: f64,
    pub opening_balance_type: String,
    pub credit_limit: f64,
    pub notes: Option<String>,
    pub is_system: bool,
    pub created_at: i64,
}

impl AccountGroup {
    #[allow(dead_code)]
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            company_id: row.get("company_id")?,
            name: row.get("name")?,
            parent_group_id: row.get("parent_group_id")?,
            nature: row.get("nature")?,
            created_at: row.get("created_at")?,
        })
    }
}

impl Ledger {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            company_id: row.get("company_id")?,
            group_id: row.get("group_id")?,
            name: row.get("name")?,
            code: row.get("code")?,
            ledger_type: row.get("type")?,
            phone: row.get("phone")?,
            email: row.get("email")?,
            gstin: row.get("gstin")?,
            billing_address: row.get("billing_address")?,
            shipping_address: row.get("shipping_address")?,
            city: row.get("city")?,
            state: row.get("state")?,
            opening_balance: row.get("opening_balance")?,
            opening_balance_type: row.get("opening_balance_type")?,
            credit_limit: row.get("credit_limit")?,
            notes: row.get("notes")?,
            is_system: row.get("is_system")?,
            created_at: row.get("created_at")?,
        })
    }
}
