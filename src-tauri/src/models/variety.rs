use serde::{Deserialize, Serialize};
use rusqlite::Row;

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Variety {
    pub id: String,
    pub company_id: String,
    pub fruit_id: String,
    pub name: String,
    pub created_at: i64,
}

impl Variety {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            company_id: row.get("company_id")?,
            fruit_id: row.get("fruit_id")?,
            name: row.get("name")?,
            created_at: row.get("created_at")?,
        })
    }
}
