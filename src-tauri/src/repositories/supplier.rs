// repositories/supplier.rs
// All SQL for the suppliers table.

use rusqlite::{Connection, params};
use uuid::Uuid;
use crate::error::{AppError, AppResult};
use crate::models::supplier::{CreateSupplier, Supplier, SupplierFilter, UpdateSupplier};
use crate::db::helpers::{PagedResult, Pagination};

// ── SELECT ────────────────────────────────────────────────────────────────────

pub fn find_by_id(conn: &Connection, id: &str) -> AppResult<Option<Supplier>> {
    let sql = format!(
        "SELECT {} FROM suppliers WHERE id = ?1 LIMIT 1",
        Supplier::COLUMNS
    );
    let mut stmt = conn.prepare(&sql)
        .map_err(|e| AppError::Database(e.to_string()))?;

    let mut rows = stmt.query_map(params![id], Supplier::from_row)
        .map_err(|e| AppError::Database(e.to_string()))?;

    match rows.next() {
        Some(Ok(s)) => Ok(Some(s)),
        Some(Err(e)) => Err(AppError::Database(e.to_string())),
        None => Ok(None),
    }
}

pub fn find_all(conn: &Connection, filter: &SupplierFilter) -> AppResult<PagedResult<Supplier>> {
    let pagination = Pagination::new(
        filter.page.unwrap_or(1),
        filter.limit.unwrap_or(50),
    );

    let mut conditions: Vec<String> = Vec::new();
    let mut count_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    let mut list_params:  Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(ref search) = filter.search {
        let pattern = format!("%{}%", search.to_lowercase());
        let idx = conditions.len() + 1;
        conditions.push(format!(
            "(LOWER(name) LIKE ?{idx} OR LOWER(code) LIKE ?{idx} OR LOWER(city) LIKE ?{idx})"
        ));
        count_params.push(Box::new(pattern.clone()));
        list_params.push(Box::new(pattern));
    }

    if let Some(ref city) = filter.city {
        let idx = conditions.len() + 1;
        conditions.push(format!("city = ?{idx}"));
        count_params.push(Box::new(city.clone()));
        list_params.push(Box::new(city.clone()));
    }

    let where_sql = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let count_sql = format!("SELECT COUNT(*) FROM suppliers {where_sql}");
    let total: u32 = {
        let mut stmt = conn.prepare(&count_sql)
            .map_err(|e| AppError::Database(e.to_string()))?;
        let refs: Vec<&dyn rusqlite::ToSql> = count_params.iter().map(|p| p.as_ref()).collect();
        stmt.query_row(refs.as_slice(), |row| row.get::<_, i64>(0))
            .map(|n| n as u32)
            .map_err(|e| AppError::Database(e.to_string()))?
    };

    let list_sql = format!(
        "SELECT {} FROM suppliers {where_sql} ORDER BY name ASC LIMIT ?{} OFFSET ?{}",
        Supplier::COLUMNS,
        list_params.len() + 1,
        list_params.len() + 2,
    );
    list_params.push(Box::new(pagination.limit() as i64));
    list_params.push(Box::new(pagination.offset() as i64));

    let mut stmt = conn.prepare(&list_sql)
        .map_err(|e| AppError::Database(e.to_string()))?;
    let refs: Vec<&dyn rusqlite::ToSql> = list_params.iter().map(|p| p.as_ref()).collect();
    let items: Vec<Supplier> = stmt
        .query_map(refs.as_slice(), Supplier::from_row)
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<_, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(PagedResult::new(items, total, &pagination))
}

// ── INSERT ────────────────────────────────────────────────────────────────────

pub fn insert(conn: &Connection, input: &CreateSupplier) -> AppResult<Supplier> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO suppliers (id, name, code, phone, city, previous_balance)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            id,
            input.name,
            input.code.as_deref().unwrap_or(""),
            input.phone.as_deref().unwrap_or(""),
            input.city.as_deref().unwrap_or(""),
            input.previous_balance.unwrap_or(0.0),
        ],
    ).map_err(|e| AppError::Database(e.to_string()))?;

    find_by_id(conn, &id)?
        .ok_or_else(|| AppError::Internal("Insert succeeded but record not found".into()))
}

// ── UPDATE ────────────────────────────────────────────────────────────────────

pub fn update(conn: &Connection, id: &str, input: &UpdateSupplier) -> AppResult<Supplier> {
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

    push_field!(input.name,             "name");
    push_field!(input.code,             "code");
    push_field!(input.phone,            "phone");
    push_field!(input.city,             "city");
    push_field!(input.previous_balance, "previous_balance");

    if sets.is_empty() {
        return Err(AppError::Validation("No fields provided for update".into()));
    }

    let id_idx = values.len() + 1;
    values.push(Box::new(id.to_string()));

    let sql = format!("UPDATE suppliers SET {} WHERE id = ?{id_idx}", sets.join(", "));
    let refs: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    let affected = conn.execute(&sql, refs.as_slice())
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("Supplier '{id}' not found")));
    }

    find_by_id(conn, id)?
        .ok_or_else(|| AppError::Internal("Update succeeded but record not found".into()))
}

// ── DELETE ────────────────────────────────────────────────────────────────────

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn
        .execute("DELETE FROM suppliers WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;

    if affected == 0 {
        return Err(AppError::NotFound(format!("Supplier '{id}' not found")));
    }
    Ok(())
}
