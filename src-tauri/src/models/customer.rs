// models/customer.rs
// Customer domain model.

use serde::{Deserialize, Serialize};
use rusqlite::Row;
use crate::error::AppResult;
use crate::validation;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Customer {
    pub id:               String,
    pub name:             String,
    pub phone:            String,
    pub city:             String,
    pub previous_balance: f64,
}

impl Customer {
    pub const COLUMNS: &'static str =
        "id, name, phone, city, previous_balance";

    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id:               row.get(0)?,
            name:             row.get(1)?,
            phone:            row.get(2)?,
            city:             row.get(3)?,
            previous_balance: row.get(4)?,
        })
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateCustomer {
    pub name:             String,
    pub phone:            Option<String>,
    pub city:             Option<String>,
    pub previous_balance: Option<f64>,
}

impl CreateCustomer {
    pub fn validate(&self) -> AppResult<()> {
        validation::require_non_empty(&self.name, "name")?;
        validation::require_max_len(&self.name, 200, "name")?;
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateCustomer {
    pub name:             Option<String>,
    pub phone:            Option<String>,
    pub city:             Option<String>,
    pub previous_balance: Option<f64>,
}

impl UpdateCustomer {
    pub fn validate(&self) -> AppResult<()> {
        if let Some(ref name) = self.name {
            validation::require_non_empty(name, "name")?;
        }
        Ok(())
    }

    pub fn has_changes(&self) -> bool {
        self.name.is_some()
            || self.phone.is_some()
            || self.city.is_some()
            || self.previous_balance.is_some()
    }
}

#[derive(Debug, Deserialize)]
pub struct CustomerFilter {
    pub search: Option<String>,
    pub city:   Option<String>,
    pub page:   Option<u32>,
    pub limit:  Option<u32>,
}
