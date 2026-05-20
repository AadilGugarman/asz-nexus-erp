// repositories/employee.rs
// All SQL for the employees table.
//
// Public API:
//   find_by_id(conn, id)                    → Option<Employee>
//   find_all(conn, filter)                  → PagedResult<Employee>
//   email_exists(conn, email, exclude_id)   → bool
//   insert(conn, id, input)                 → Employee
//   update(conn, id, input)                 → Employee
//   delete(conn, id)                        → ()
//   set_active(conn, id, active)            → Employee

use rusqlite::{Connection, params};
use uuid::Uuid;
use crate::error::{AppError, AppResult};
use crate::models::employee::{CreateEmployee, Employee, EmployeeFilter, UpdateEmployee};
use crate::db::helpers::{count_rows, row_exists, PagedResult, Pagination};

// ── SELECT helpers ────────────────────────────────────────────────────────────

/// Fetch a single employee by primary key.
/// Returns None if not found (caller decides whether to 404).
pub fn find_by_id(conn: &Connection, id: &str) -> AppResult<Option<Employee>> {
    let sql = format!(
        "SELECT {} FROM employees WHERE id = ?1 LIMIT 1",
        Employee::COLUMNS
    );
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| AppError::Database(e.to_string()))?;

    let mut rows = stmt
        .query_map(params![id], Employee::from_row)
        .map_err(|e| AppError::Database(e.to_string()))?;

    match rows.next() {
        Some(Ok(emp)) => Ok(Some(emp)),
        Some(Err(e))  => Err(AppError::Database(e.to_string())),
        None          => Ok(None),
    }
}

/// Fetch a page of employees with optional filters.
pub fn find_all(conn: &Connection, filter: &EmployeeFilter) -> AppResult<PagedResult<Employee>> {
    let pagination = Pagination::new(
        filter.page.unwrap_or(1),
        filter.limit.unwrap_or(20),
    );

    // Build WHERE clause dynamically
    let mut conditions: Vec<String> = Vec::new();
    let mut count_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    let mut list_params:  Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(ref search) = filter.search {
        let pattern = format!("%{}%", search.to_lowercase());
        let idx = conditions.len() + 1;
        conditions.push(format!(
            "(LOWER(name) LIKE ?{idx} OR LOWER(email) LIKE ?{idx})"
        ));
        count_params.push(Box::new(pattern.clone()));
        list_params.push(Box::new(pattern));
    }

    if let Some(ref role) = filter.role {
        let idx = conditions.len() + 1;
        conditions.push(format!("role = ?{idx}"));
        count_params.push(Box::new(role.clone()));
        list_params.push(Box::new(role.clone()));
    }

    if let Some(ref dept) = filter.department {
        let idx = conditions.len() + 1;
        conditions.push(format!("department = ?{idx}"));
        count_params.push(Box::new(dept.clone()));
        list_params.push(Box::new(dept.clone()));
    }

    if let Some(active) = filter.is_active {
        let idx = conditions.len() + 1;
        conditions.push(format!("is_active = ?{idx}"));
        let val: i64 = if active { 1 } else { 0 };
        count_params.push(Box::new(val));
        list_params.push(Box::new(val));
    }

    let where_sql = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    // Total count
    let count_sql = format!("SELECT COUNT(*) FROM employees {where_sql}");
    let total: u32 = {
        let mut stmt = conn
            .prepare(&count_sql)
            .map_err(|e| AppError::Database(e.to_string()))?;
        let refs: Vec<&dyn rusqlite::ToSql> = count_params.iter().map(|p| p.as_ref()).collect();
        stmt.query_row(refs.as_slice(), |row| row.get::<_, i64>(0))
            .map(|n| n as u32)
            .map_err(|e| AppError::Database(e.to_string()))?
    };

    // Paginated rows
    let list_sql = format!(
        "SELECT {} FROM employees {where_sql} ORDER BY name ASC LIMIT ?{} OFFSET ?{}",
        Employee::COLUMNS,
        list_params.len() + 1,
        list_params.len() + 2,
    );
    list_params.push(Box::new(pagination.limit() as i64));
    list_params.push(Box::new(pagination.offset() as i64));

    let mut stmt = conn
        .prepare(&list_sql)
        .map_err(|e| AppError::Database(e.to_string()))?;

    let refs: Vec<&dyn rusqlite::ToSql> = list_params.iter().map(|p| p.as_ref()).collect();
    let items: Vec<Employee> = stmt
        .query_map(refs.as_slice(), Employee::from_row)
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<_, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(PagedResult::new(items, total, &pagination))
}

// ── Existence check ───────────────────────────────────────────────────────────

/// Check if an email is already taken, optionally excluding one ID (for updates).
pub fn email_exists(
    conn: &Connection,
    email: &str,
    exclude_id: Option<&str>,
) -> AppResult<bool> {
    match exclude_id {
        Some(id) => row_exists(
            conn,
            "employees",
            "LOWER(email) = LOWER(?1) AND id != ?2",
            params![email, id],
        ),
        None => row_exists(
            conn,
            "employees",
            "LOWER(email) = LOWER(?1)",
            params![email],
        ),
    }
}

// ── INSERT ────────────────────────────────────────────────────────────────────

/// Insert a new employee and return the created record.
pub fn insert(conn: &Connection, input: &CreateEmployee) -> AppResult<Employee> {
    let id = Uuid::new_v4().to_string();
    let role = input.role.as_deref().unwrap_or("staff");
    let phone = input.phone.as_deref().unwrap_or("");
    let dept = input.department.as_deref().unwrap_or("");

    conn.execute(
        "INSERT INTO employees (id, name, email, phone, role, department)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, input.name, input.email, phone, role, dept],
    )
    .map_err(|e| {
        if e.to_string().contains("UNIQUE") {
            AppError::Validation(format!("Email '{}' is already taken", input.email))
        } else {
            AppError::Database(e.to_string())
        }
    })?;

    find_by_id(conn, &id)?
        .ok_or_else(|| AppError::Internal("Insert succeeded but record not found".into()))
}

// ── UPDATE ────────────────────────────────────────────────────────────────────

/// Apply a partial update to an employee and return the updated record.
pub fn update(conn: &Connection, id: &str, input: &UpdateEmployee) -> AppResult<Employee> {
    // Build SET clause from only the provided fields
    let mut sets: Vec<String> = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    macro_rules! push_field {
        ($opt:expr, $col:expr) => {
            if let Some(ref val) = $opt {
                sets.push(format!("{} = ?{}", $col, values.len() + 1));
                values.push(Box::new(val.clone()));
            }
        };
    }

    push_field!(input.name,       "name");
    push_field!(input.email,      "email");
    push_field!(input.phone,      "phone");
    push_field!(input.role,       "role");
    push_field!(input.department, "department");

    if let Some(active) = input.is_active {
        sets.push(format!("is_active = ?{}", values.len() + 1));
        values.push(Box::new(if active { 1i64 } else { 0i64 }));
    }

    if sets.is_empty() {
        return Err(AppError::Validation("No fields provided for update".into()));
    }

    // Always bump updated_at
    sets.push("updated_at = datetime('now')".to_string());

    let id_idx = values.len() + 1;
    values.push(Box::new(id.to_string()));

    let sql = format!(
        "UPDATE employees SET {} WHERE id = ?{id_idx}",
        sets.join(", ")
    );

    let refs: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    let affected = conn
        .execute(&sql, refs.as_slice())
        .map_err(|e| {
            if e.to_string().contains("UNIQUE") {
                AppError::Validation("Email is already taken by another employee".into())
            } else {
                AppError::Database(e.to_string())
            }
        })?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("Employee '{id}' not found")));
    }

    find_by_id(conn, id)?
        .ok_or_else(|| AppError::Internal("Update succeeded but record not found".into()))
}

// ── DELETE ────────────────────────────────────────────────────────────────────

/// Hard-delete an employee by ID.
pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn
        .execute("DELETE FROM employees WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("Employee '{id}' not found")));
    }
    Ok(())
}

// ── SOFT DELETE / TOGGLE ──────────────────────────────────────────────────────

/// Set the is_active flag without deleting the record.
pub fn set_active(conn: &Connection, id: &str, active: bool) -> AppResult<Employee> {
    let val: i64 = if active { 1 } else { 0 };
    let affected = conn
        .execute(
            "UPDATE employees SET is_active = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![val, id],
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("Employee '{id}' not found")));
    }

    find_by_id(conn, id)?
        .ok_or_else(|| AppError::Internal("set_active succeeded but record not found".into()))
}

// ── TRANSACTION EXAMPLE ───────────────────────────────────────────────────────

/// Bulk-insert employees inside a single transaction.
/// All inserts succeed or all are rolled back.
pub fn bulk_insert(conn: &Connection, inputs: &[CreateEmployee]) -> AppResult<Vec<Employee>> {
    use crate::db::helpers::with_savepoint;

    with_savepoint(conn, "bulk_insert_employees", || {
        let mut created = Vec::with_capacity(inputs.len());
        for input in inputs {
            input.validate()?;
            if email_exists(conn, &input.email, None)? {
                return Err(AppError::Validation(format!(
                    "Email '{}' is already taken",
                    input.email
                )));
            }
            created.push(insert(conn, input)?);
        }
        Ok(created)
    })
}

// ── STATS ─────────────────────────────────────────────────────────────────────

/// Quick summary counts — used by the db_get_stats command.
pub fn stats(conn: &Connection) -> AppResult<EmployeeStats> {
    let total  = count_rows(conn, "employees", None,                  rusqlite::params![])?;
    let active = count_rows(conn, "employees", Some("is_active = 1"), rusqlite::params![])?;
    Ok(EmployeeStats { total, active, inactive: total - active })
}

#[derive(Debug, serde::Serialize)]
pub struct EmployeeStats {
    pub total:    u32,
    pub active:   u32,
    pub inactive: u32,
}
