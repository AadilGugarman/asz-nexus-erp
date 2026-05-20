// db/helpers.rs
// Reusable query utilities shared across all repositories.
//
// These are free functions — import what you need in each repository.
// None of them know about specific tables; they work with raw SQL fragments.

use rusqlite::Connection;
use crate::error::{AppError, AppResult};

/// Pagination parameters — passed in from frontend requests.
#[derive(Debug, Clone)]
pub struct Pagination {
    pub page: u32,   // 1-based
    pub limit: u32,  // rows per page, max 200
}

impl Pagination {
    pub fn new(page: u32, limit: u32) -> Self {
        Self {
            page: page.max(1),
            limit: limit.clamp(1, 200),
        }
    }

    /// SQL LIMIT value.
    pub fn limit(&self) -> u32 {
        self.limit
    }

    /// SQL OFFSET value.
    pub fn offset(&self) -> u32 {
        (self.page - 1) * self.limit
    }
}

/// Result wrapper that includes total count for pagination UI.
#[derive(Debug)]
pub struct PagedResult<T> {
    pub items: Vec<T>,
    pub total: u32,
    pub page: u32,
    pub limit: u32,
    pub total_pages: u32,
}

impl<T> PagedResult<T> {
    pub fn new(items: Vec<T>, total: u32, pagination: &Pagination) -> Self {
        let total_pages = (total as f64 / pagination.limit as f64).ceil() as u32;
        Self {
            items,
            total,
            page: pagination.page,
            limit: pagination.limit,
            total_pages: total_pages.max(1),
        }
    }
}

/// Check whether a row exists matching a WHERE clause.
///
/// # Example
/// ```
/// let exists = row_exists(conn, "employees", "email = ?1", ["bob@example.com"])?;
/// ```
pub fn row_exists(
    conn: &Connection,
    table: &str,
    where_clause: &str,
    params: impl rusqlite::Params,
) -> AppResult<bool> {
    let sql = format!("SELECT COUNT(*) FROM {table} WHERE {where_clause} LIMIT 1");
    let count: i64 = conn
        .query_row(&sql, params, |row| row.get(0))
        .map_err(|e| AppError::Database(format!("row_exists failed on {table}: {e}")))?;
    Ok(count > 0)
}

/// Count rows in a table matching an optional WHERE clause.
pub fn count_rows(
    conn: &Connection,
    table: &str,
    where_clause: Option<&str>,
    params: impl rusqlite::Params,
) -> AppResult<u32> {
    let sql = match where_clause {
        Some(w) => format!("SELECT COUNT(*) FROM {table} WHERE {w}"),
        None    => format!("SELECT COUNT(*) FROM {table}"),
    };
    let count: i64 = conn
        .query_row(&sql, params, |row| row.get(0))
        .map_err(|e| AppError::Database(format!("count_rows failed on {table}: {e}")))?;
    Ok(count as u32)
}

/// Execute a block inside a savepoint (nested transaction).
/// Commits on Ok, rolls back on Err.
///
/// Use this inside repository methods that need atomic multi-step writes.
pub fn with_savepoint<F, T>(conn: &Connection, name: &str, f: F) -> AppResult<T>
where
    F: FnOnce() -> AppResult<T>,
{
    conn.execute_batch(&format!("SAVEPOINT {name};"))
        .map_err(|e| AppError::Database(format!("SAVEPOINT {name} failed: {e}")))?;

    match f() {
        Ok(val) => {
            conn.execute_batch(&format!("RELEASE SAVEPOINT {name};"))
                .map_err(|e| AppError::Database(format!("RELEASE {name} failed: {e}")))?;
            Ok(val)
        }
        Err(e) => {
            let _ = conn.execute_batch(&format!("ROLLBACK TO SAVEPOINT {name};"));
            Err(e)
        }
    }
}
