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

pub fn insert(conn: &Connection, input: &CreatePayment) -> AppResult<Payment> {
    let id = Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().timestamp();
    
    conn.execute(
        "INSERT INTO payments
         (id, company_id, financial_year_id, type, voucher_number, date, ledger_id, offset_ledger_id, amount, payment_mode, reference_no, narration, created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)",
        params![
            id, input.company_id, input.financial_year_id, input.payment_type, 
            "TEMP_VOUCHER", // Voucher number should probably be generated
            input.date, input.ledger_id, input.offset_ledger_id,
            input.amount, input.payment_mode, input.reference_no, input.narration,
            created_at
        ],
    ).map_err(|e| AppError::Database(e.to_string()))?;

    match find_by_id(conn, &id)? {
        Some(p) => Ok(p),
        None => Err(AppError::Database("Failed to retrieve created payment".to_string())),
    }
}

pub fn find_all(conn: &Connection, filter: &PaymentFilter) -> AppResult<PagedResult<Payment>> {
    let pagination = Pagination::new(filter.page.unwrap_or(1), filter.limit.unwrap_or(20));

    let mut conditions: Vec<String> = Vec::new();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(ref pid) = filter.party_id {
        let idx = conditions.len() + 1;
        conditions.push(format!("ledger_id = ?{idx}"));
        params_vec.push(Box::new(pid.clone()) as Box<dyn rusqlite::ToSql>);
    }

    if let Some(ref pt) = filter.party_type {
        let idx = conditions.len() + 1;
        conditions.push(format!("type = ?{idx}"));
        params_vec.push(Box::new(pt.clone()) as Box<dyn rusqlite::ToSql>);
    }

    if let Some(ref from) = filter.date_from {
        let idx = conditions.len() + 1;
        conditions.push(format!("date >= ?{idx}"));
        params_vec.push(Box::new(*from) as Box<dyn rusqlite::ToSql>);
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
        let refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        stmt.query_row(refs.as_slice(), |row| row.get::<_, i64>(0))
            .map(|n| n as u32)
            .map_err(|e| AppError::Database(e.to_string()))?
    };

    let list_sql = format!(
        "SELECT {} FROM payments {where_sql} ORDER BY date DESC LIMIT ?{} OFFSET ?{}",
        Payment::COLUMNS,
        params_vec.len() + 1,
        params_vec.len() + 2,
    );
    
    let mut list_params = params_vec;
    list_params.push(Box::new(pagination.limit() as i64) as Box<dyn rusqlite::ToSql>);
    list_params.push(Box::new(pagination.offset() as i64) as Box<dyn rusqlite::ToSql>);

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

pub fn delete(conn: &Connection, id: &str) -> AppResult<()> {
    conn.execute("DELETE FROM payments WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}

pub fn total_paid_by_party(conn: &Connection, party_id: &str) -> AppResult<f64> {
    let mut stmt = conn.prepare("SELECT SUM(amount) FROM payments WHERE ledger_id = ?1")
        .map_err(|e| AppError::Database(e.to_string()))?;
    let total: Option<f64> = stmt.query_row(params![party_id], |row| row.get(0))
        .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(total.unwrap_or(0.0))
}
