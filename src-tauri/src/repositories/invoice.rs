// repositories/invoice.rs
// SQL for sales invoices and purchase invoices.

use rusqlite::{Connection, params};
use uuid::Uuid;
use crate::error::{AppError, AppResult};
use crate::models::invoice::{
    CreateInvoice, Invoice, InvoiceFilter,
    CreatePurchaseInvoice, PurchaseInvoice, PurchaseInvoiceFilter,
};
use crate::db::helpers::{PagedResult, Pagination};

// ── Sales Invoice ─────────────────────────────────────────────────────────────

pub fn find_invoice_by_id(conn: &Connection, id: &str) -> AppResult<Option<Invoice>> {
    let sql = format!(
        "SELECT {} FROM invoices WHERE id = ?1 LIMIT 1",
        Invoice::COLUMNS
    );
    let mut stmt = conn.prepare(&sql)
        .map_err(|e| AppError::Database(e.to_string()))?;
    let mut rows = stmt.query_map(params![id], Invoice::from_row)
        .map_err(|e| AppError::Database(e.to_string()))?;

    match rows.next() {
        Some(Ok(i)) => Ok(Some(i)),
        Some(Err(e)) => Err(AppError::Database(e.to_string())),
        None => Ok(None),
    }
}

pub fn find_invoices(conn: &Connection, filter: &InvoiceFilter) -> AppResult<PagedResult<Invoice>> {
    let pagination = Pagination::new(filter.page.unwrap_or(1), filter.limit.unwrap_or(20));

    let mut conditions: Vec<String> = Vec::new();
    let mut count_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    let mut list_params:  Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(ref cid) = filter.customer_id {
        let idx = conditions.len() + 1;
        conditions.push(format!("customer_id = ?{idx}"));
        count_params.push(Box::new(cid.clone()));
        list_params.push(Box::new(cid.clone()));
    }

    if let Some(ref from) = filter.date_from {
        let idx = conditions.len() + 1;
        conditions.push(format!("date >= ?{idx}"));
        count_params.push(Box::new(from.clone()));
        list_params.push(Box::new(from.clone()));
    }

    if let Some(ref to) = filter.date_to {
        let idx = conditions.len() + 1;
        conditions.push(format!("date <= ?{idx}"));
        count_params.push(Box::new(to.clone()));
        list_params.push(Box::new(to.clone()));
    }

    if let Some(ref search) = filter.search {
        let pattern = format!("%{}%", search);
        let idx = conditions.len() + 1;
        conditions.push(format!(
            "(LOWER(invoice_no) LIKE ?{idx} OR LOWER(customer_name) LIKE ?{idx})"
        ));
        count_params.push(Box::new(pattern.clone()));
        list_params.push(Box::new(pattern));
    }

    let where_sql = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let count_sql = format!("SELECT COUNT(*) FROM invoices {where_sql}");
    let total: u32 = {
        let mut stmt = conn.prepare(&count_sql)
            .map_err(|e| AppError::Database(e.to_string()))?;
        let refs: Vec<&dyn rusqlite::ToSql> = count_params.iter().map(|p| p.as_ref()).collect();
        stmt.query_row(refs.as_slice(), |row| row.get::<_, i64>(0))
            .map(|n| n as u32)
            .map_err(|e| AppError::Database(e.to_string()))?
    };

    let list_sql = format!(
        "SELECT {} FROM invoices {where_sql} ORDER BY date DESC LIMIT ?{} OFFSET ?{}",
        Invoice::COLUMNS,
        list_params.len() + 1,
        list_params.len() + 2,
    );
    list_params.push(Box::new(pagination.limit() as i64));
    list_params.push(Box::new(pagination.offset() as i64));

    let mut stmt = conn.prepare(&list_sql)
        .map_err(|e| AppError::Database(e.to_string()))?;
    let refs: Vec<&dyn rusqlite::ToSql> = list_params.iter().map(|p| p.as_ref()).collect();
    let items: Vec<Invoice> = stmt
        .query_map(refs.as_slice(), Invoice::from_row)
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<_, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(PagedResult::new(items, total, &pagination))
}

pub fn insert_invoice(conn: &Connection, input: &CreateInvoice) -> AppResult<Invoice> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO invoices
         (id, invoice_no, date, customer_id, customer_name, items,
          previous_balance, today_amount, hamali, discount,
          paid_amount, remaining_balance, notes, created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)",
        params![
            id, input.invoice_no, input.date, input.customer_id, input.customer_name,
            input.items, input.previous_balance, input.today_amount,
            input.hamali, input.discount, input.paid_amount,
            input.remaining_balance, input.notes, input.created_at,
        ],
    ).map_err(|e| AppError::Database(e.to_string()))?;

    find_invoice_by_id(conn, &id)?
        .ok_or_else(|| AppError::Internal("Insert succeeded but record not found".into()))
}

pub fn delete_invoice(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn
        .execute("DELETE FROM invoices WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("Invoice '{id}' not found")));
    }
    Ok(())
}

// ── Purchase Invoice ──────────────────────────────────────────────────────────

pub fn find_purchase_by_id(conn: &Connection, id: &str) -> AppResult<Option<PurchaseInvoice>> {
    let sql = format!(
        "SELECT {} FROM purchase_invoices WHERE id = ?1 LIMIT 1",
        PurchaseInvoice::COLUMNS
    );
    let mut stmt = conn.prepare(&sql)
        .map_err(|e| AppError::Database(e.to_string()))?;
    let mut rows = stmt.query_map(params![id], PurchaseInvoice::from_row)
        .map_err(|e| AppError::Database(e.to_string()))?;

    match rows.next() {
        Some(Ok(p)) => Ok(Some(p)),
        Some(Err(e)) => Err(AppError::Database(e.to_string())),
        None => Ok(None),
    }
}

pub fn find_purchases(
    conn: &Connection,
    filter: &PurchaseInvoiceFilter,
) -> AppResult<PagedResult<PurchaseInvoice>> {
    let pagination = Pagination::new(filter.page.unwrap_or(1), filter.limit.unwrap_or(20));

    let mut conditions: Vec<String> = Vec::new();
    let mut count_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    let mut list_params:  Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(ref sid) = filter.supplier_id {
        let idx = conditions.len() + 1;
        conditions.push(format!("supplier_id = ?{idx}"));
        count_params.push(Box::new(sid.clone()));
        list_params.push(Box::new(sid.clone()));
    }

    if let Some(ref from) = filter.date_from {
        let idx = conditions.len() + 1;
        conditions.push(format!("date >= ?{idx}"));
        count_params.push(Box::new(from.clone()));
        list_params.push(Box::new(from.clone()));
    }

    if let Some(ref search) = filter.search {
        let pattern = format!("%{}%", search);
        let idx = conditions.len() + 1;
        conditions.push(format!(
            "(LOWER(bill_no) LIKE ?{idx} OR LOWER(supplier_name) LIKE ?{idx})"
        ));
        count_params.push(Box::new(pattern.clone()));
        list_params.push(Box::new(pattern));
    }

    let where_sql = if conditions.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", conditions.join(" AND "))
    };

    let count_sql = format!("SELECT COUNT(*) FROM purchase_invoices {where_sql}");
    let total: u32 = {
        let mut stmt = conn.prepare(&count_sql)
            .map_err(|e| AppError::Database(e.to_string()))?;
        let refs: Vec<&dyn rusqlite::ToSql> = count_params.iter().map(|p| p.as_ref()).collect();
        stmt.query_row(refs.as_slice(), |row| row.get::<_, i64>(0))
            .map(|n| n as u32)
            .map_err(|e| AppError::Database(e.to_string()))?
    };

    let list_sql = format!(
        "SELECT {} FROM purchase_invoices {where_sql} ORDER BY date DESC LIMIT ?{} OFFSET ?{}",
        PurchaseInvoice::COLUMNS,
        list_params.len() + 1,
        list_params.len() + 2,
    );
    list_params.push(Box::new(pagination.limit() as i64));
    list_params.push(Box::new(pagination.offset() as i64));

    let mut stmt = conn.prepare(&list_sql)
        .map_err(|e| AppError::Database(e.to_string()))?;
    let refs: Vec<&dyn rusqlite::ToSql> = list_params.iter().map(|p| p.as_ref()).collect();
    let items: Vec<PurchaseInvoice> = stmt
        .query_map(refs.as_slice(), PurchaseInvoice::from_row)
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<_, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(PagedResult::new(items, total, &pagination))
}

pub fn insert_purchase(conn: &Connection, input: &CreatePurchaseInvoice) -> AppResult<PurchaseInvoice> {
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO purchase_invoices
         (id, bill_no, date, supplier_id, supplier_name, items,
          previous_balance, today_amount, freight, hamali,
          paid_amount, remaining_balance, notes, created_at)
         VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14)",
        params![
            id, input.bill_no, input.date, input.supplier_id, input.supplier_name,
            input.items, input.previous_balance, input.today_amount,
            input.freight, input.hamali, input.paid_amount,
            input.remaining_balance, input.notes, input.created_at,
        ],
    ).map_err(|e| AppError::Database(e.to_string()))?;

    find_purchase_by_id(conn, &id)?
        .ok_or_else(|| AppError::Internal("Insert succeeded but record not found".into()))
}

pub fn delete_purchase(conn: &Connection, id: &str) -> AppResult<()> {
    let affected = conn
        .execute("DELETE FROM purchase_invoices WHERE id = ?1", params![id])
        .map_err(|e| AppError::Database(e.to_string()))?;
    if affected == 0 {
        return Err(AppError::NotFound(format!("Purchase invoice '{id}' not found")));
    }
    Ok(())
}
