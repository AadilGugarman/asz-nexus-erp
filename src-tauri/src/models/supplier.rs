// models/supplier.rs
// Supplier domain model.

use serde::{Deserialize, Serialize};
use rusqlite::Row;
use crate::error::AppResult;
use crate::validation;

// ── Full model ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Supplier {
    pub id:               String,
    pub name:             String,
    pub code:             String,
    pub phone:            String,
    pub city:             String,
    pub previous_balance: f64,
}

impl Supplier {
    pub const COLUMNS: &'static str =
        "id, name, code, phone, city, previous_balance";

    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id:               row.get(0)?,
            name:             row.get(1)?,
            code:             row.get(2)?,
            phone:            row.get(3)?,
            city:             row.get(4)?,
            previous_balance: row.get(5)?,
        })
    }
}

// ── Create input ──────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CreateSupplier {
    pub name:             String,
    pub code:             Option<String>,
    pub phone:            Option<String>,
    pub city:             Option<String>,
    pub previous_balance: Option<f64>,
}

impl CreateSupplier {
    pub fn validate(&self) -> AppResult<()> {
        validation::require_non_empty(&self.name, "name")?;
        validation::require_max_len(&self.name, 200, "name")?;
        Ok(())
    }
}

// ── Update input ──────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct UpdateSupplier {
    pub name:             Option<String>,
    pub code:             Option<String>,
    pub phone:            Option<String>,
    pub city:             Option<String>,
    pub previous_balance: Option<f64>,
}

impl UpdateSupplier {
    pub fn validate(&self) -> AppResult<()> {
        if let Some(ref name) = self.name {
            validation::require_non_empty(name, "name")?;
            validation::require_max_len(name, 200, "name")?;
        }
        Ok(())
    }

    pub fn has_changes(&self) -> bool {
        self.name.is_some()
            || self.code.is_some()
            || self.phone.is_some()
            || self.city.is_some()
            || self.previous_balance.is_some()
    }
}

// ── Filter ────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct SupplierFilter {
    pub search: Option<String>,
    pub city:   Option<String>,
    pub page:   Option<u32>,
    pub limit:  Option<u32>,
}
