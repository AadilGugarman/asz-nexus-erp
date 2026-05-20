// models/employee.rs
// Employee domain model — as_str() and PermissionDenied are scaffolded for future use.
#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use rusqlite::Row;
use crate::error::{AppError, AppResult};

// ── Role enum ─────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EmployeeRole {
    Admin,
    Manager,
    Staff,
}

impl EmployeeRole {
    pub fn as_str(&self) -> &'static str {
        match self {
            EmployeeRole::Admin   => "admin",
            EmployeeRole::Manager => "manager",
            EmployeeRole::Staff   => "staff",
        }
    }

    pub fn from_str(s: &str) -> AppResult<Self> {
        match s {
            "admin"   => Ok(EmployeeRole::Admin),
            "manager" => Ok(EmployeeRole::Manager),
            "staff"   => Ok(EmployeeRole::Staff),
            other     => Err(AppError::Validation(format!(
                "Invalid role '{}'. Must be admin | manager | staff", other
            ))),
        }
    }
}

// ── Full model (SELECT result) ────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Employee {
    pub id:         String,
    pub name:       String,
    pub email:      String,
    pub phone:      String,
    pub role:       String,
    pub department: String,
    pub is_active:  bool,
    pub created_at: String,
    pub updated_at: String,
}

impl Employee {
    /// Map a rusqlite Row to an Employee.
    /// Column order must match every SELECT that uses this constructor.
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        Ok(Self {
            id:         row.get(0)?,
            name:       row.get(1)?,
            email:      row.get(2)?,
            phone:      row.get(3)?,
            role:       row.get(4)?,
            department: row.get(5)?,
            is_active:  row.get::<_, i64>(6)? != 0,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        })
    }

    /// Column list used in every SELECT — keeps column order in sync with from_row.
    pub const COLUMNS: &'static str =
        "id, name, email, phone, role, department, is_active, created_at, updated_at";
}

// ── Create input ──────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CreateEmployee {
    pub name:       String,
    pub email:      String,
    pub phone:      Option<String>,
    pub role:       Option<String>,   // defaults to "staff"
    pub department: Option<String>,
}

impl CreateEmployee {
    pub fn validate(&self) -> AppResult<()> {
        use crate::validation;
        validation::require_non_empty(&self.name,  "name")?;
        validation::require_non_empty(&self.email, "email")?;
        validation::require_max_len(&self.name,  120, "name")?;
        validation::require_max_len(&self.email, 254, "email")?;
        if let Some(ref role) = self.role {
            EmployeeRole::from_str(role)?;
        }
        Ok(())
    }
}

// ── Update input ──────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct UpdateEmployee {
    pub name:       Option<String>,
    pub email:      Option<String>,
    pub phone:      Option<String>,
    pub role:       Option<String>,
    pub department: Option<String>,
    pub is_active:  Option<bool>,
}

impl UpdateEmployee {
    pub fn validate(&self) -> AppResult<()> {
        use crate::validation;
        if let Some(ref name) = self.name {
            validation::require_non_empty(name, "name")?;
            validation::require_max_len(name, 120, "name")?;
        }
        if let Some(ref email) = self.email {
            validation::require_non_empty(email, "email")?;
            validation::require_max_len(email, 254, "email")?;
        }
        if let Some(ref role) = self.role {
            EmployeeRole::from_str(role)?;
        }
        Ok(())
    }

    /// Returns true if at least one field is being updated.
    pub fn has_changes(&self) -> bool {
        self.name.is_some()
            || self.email.is_some()
            || self.phone.is_some()
            || self.role.is_some()
            || self.department.is_some()
            || self.is_active.is_some()
    }
}

// ── List filter ───────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct EmployeeFilter {
    pub search:     Option<String>,  // matches name or email (LIKE)
    pub role:       Option<String>,
    pub department: Option<String>,
    pub is_active:  Option<bool>,
    pub page:       Option<u32>,
    pub limit:      Option<u32>,
}
