use serde::{Deserialize, Serialize};
use rusqlite::Row;

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: String,
    pub username: String,
    pub password_hash: String,
    pub full_name: Option<String>,
    pub role: String,
    pub is_active: bool,
    pub created_at: i64,
}

impl User {
    #[allow(dead_code)]
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get("id")?,
            username: row.get("username")?,
            password_hash: row.get("password_hash")?,
            full_name: row.get("full_name")?,
            role: row.get("role")?,
            is_active: row.get("is_active")?,
            created_at: row.get("created_at")?,
        })
    }
}
