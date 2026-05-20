// repositories/payment.rs
// All SQL for the payments table.

use rusqlite::{Connection, params};
use uuid::Uuid;
use crate::error::{AppError, AppResult};
use crate::models::payment::{CreatePayment, Payment, PaymentFilter};
use crate::db::helpers::{PagedResult, Pagination};

pub fn find_by_id(conn: &Connection, id: &str) -> AppResult<Option<Payment>> {
    let sql = format!(
        "SELECT {} FROM payments WHERE id = ?1 LIMIT 1",
        Payment::COLUMNS
    );
    let mut stmt = conn.prepare(&sql)
        .map_err(|e| AppError::Database(e.to_string()))?;
    let mut rows = stmt.query_map(params![id], Payment::from_row)
        .map_err(|e| AppError::Database(e.to_string()))?;

    match rows.next() {
        Some(Ok(p)) => Ok(Some(p)),
        Some(Err(e)) => Err(AppError::Database(e.to_string())),
        None => Ok(None),
    }
}

pub fn find_all(conn: &Connection, filter: &PaymentFilter) -> AppResult<PagedResult<Payment>> {
    let pagination = Pagination::new(filter.page.unwrap_or(1), filter.limit.unwrap_or(20));

    let mut conditions: Vec<String> = Vec::new();
    let mut count_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    let mut list_params:  Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(ref pid) = filter.party_id {
        let idx = conditions.len() + 1;
        conditions.push(format!("party_id = ?{idx}"));
        count_params.push(Box::new(pid.clone()));
        list_params.push(Box::new(pid.clone()));
    }

    if let Some(ref pt) = filter.party_type {
        let idx = conditions.len() + 1;
        conditions.push(format!("party_type = ?{idx}"));
        count_params.push(Box::new(pt.clone()));
        list_params.push(Box::new(pt.clone()));
    }

    if let Some(ref from) = filter.date_from {
        let idx = conditions.len() + 1;
        conditions.push(format!("date >= ?{idx}"));
        count_params.push(Box::new(from.clone()));
        list_params.push(Box::new(from.clone()));
    }

    let where_sql = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let count_sql = format!("SELECT COUNT(*) FROM payments {where_sql}");
    let total: u32 = {
        let mut stmt = conn.prepare(&count_sql)
            .map_err(|e| AppError::Database(e.to_string()))?;
        let refs: Vec<&dyn rusqlite::ToSql> = count_params.iter().map(|p| p.as_ref()).collect();
        stmt.query_row(refs.as_slice(), |row| row.get::<_, i64>(0))
            .map(|n| n as u32)
            .map_err(|e| AppError::Database(e.to_string()))?
    };

    let list_sql = format!(
        "SELECT {} FROM payments {where_sql} ORDER BY date DESC LIMIT ?{} OFFSET ?{}",
        Payment::COLUMNS,
        list_params.len() + 1,
        list_params.len() + 2,
    );
    list_params.push(Box::new(pagination.limit() as i64));
    list_params.push(Box::new(pagination.offset() as i64));

    let mut stmt = conn.prepare(&list_sql)
        .map_err(|e| AppError::Database(e.to_string()))?;
    let refs: Vec<&dyn rusqlite::ToSql> = list_params.iter().map(|p| p.as_ref()).collect();
    let items: Vec<Payment> = stmt
        .query_map(refs.as_slice(), Payment::from_row)
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<_, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(PagedResult::new(items, total, &pagination))
}

pub fn insert(conn: &Connection, input: &CreatePayment) -> AppResult<Payment> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO payments
         (id, date, party_type, party_id, party_name, amount, payment_mode, reference_no, notes)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)",
        params![
            id, input.date, input.party_type, input.party_id, input.party_name,
            input.amount, input.payment_mode, input.reference_no, input.notes,
        ],
    ).map_err(|e| AppError::Database(e.to_string()))?;

    find_by_id(conn, &id)?
        .ok_or_else(|| AppError::Internal("Insert succeeded but record not found".into()))
}

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn
        .execute("DELETE FROM payments WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("Payment '{id}' not found")));
    }
    Ok(())
}

/// Sum of all payments for a party — used for balance calculations.
pub fn total_paid_by_party(conn: &Connection, party_id: &str) -> AppResult<f64> {
    let total: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(amount), 0.0) FROM payments WHERE party_id = ?1",
            params![party_id],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(total)
}
