use serde::{Deserialize, Serialize};
use rusqlite::Row;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Fruit {
    pub id: String,
    pub company_id: String,
    pub name: String,
    pub pricing_type: String, // 'kg' or 'caret'
    pub created_at: i64,
}

impl Fruit {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            company_id: row.get("company_id")?,
            name: row.get("name")?,
            pricing_type: row.get("pricing_type")?,
            created_at: row.get("created_at")?,
        })
    }
}
