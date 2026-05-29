// repositories/invoice.rs
// All SQL for the invoices and invoice_items tables.

use rusqlite::{Connection, params};
use uuid::Uuid;
use crate::error::{AppError, AppResult};
use crate::models::invoice::{Invoice, InvoiceFilter, CreateInvoice};
use crate::db::helpers::{PagedResult, Pagination};

pub const INVOICE_COLUMNS: &'static str = "id, company_id, financial_year_id, type as invoice_type, invoice_number, date, ledger_id, vehicle_no, declared_weight, sub_total, tax_total, discount_total, freight, hamali, other_charges, round_off, grand_total, paid_amount, notes, status, created_at, updated_at";

pub fn find_invoice_by_id(conn: &Connection, id: &str) -> AppResult<Option<Invoice>> {
    let sql = format!("SELECT {} FROM invoices WHERE id = ?1 LIMIT 1", INVOICE_COLUMNS);
    let mut stmt = conn.prepare(&sql).map_err(|e| AppError::Database(e.to_string()))?;
    let mut rows = stmt.query_map(params![id], Invoice::from_row).map_err(|e| AppError::Database(e.to_string()))?;

    match rows.next() {
        Some(Ok(i)) => Ok(Some(i)),
        Some(Err(e)) => Err(AppError::Database(e.to_string())),
        None => Ok(None),
    }
}

pub fn find_invoices(conn: &Connection, filter: &InvoiceFilter) -> AppResult<PagedResult<Invoice>> {
    find_paged_by_type(conn, filter, "SALE")
}

pub fn find_purchases(conn: &Connection, filter: &InvoiceFilter) -> AppResult<PagedResult<Invoice>> {
    find_paged_by_type(conn, filter, "PURCHASE")
}

fn find_paged_by_type(conn: &Connection, filter: &InvoiceFilter, inv_type: &str) -> AppResult<PagedResult<Invoice>> {
    let pagination = Pagination::new(filter.page.unwrap_or(1), filter.limit.unwrap_or(20));
    
    let mut conditions = vec!["type = ?1".to_string(), "company_id = ?2".to_string(), "financial_year_id = ?3".to_string()];
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = vec![
        Box::new(inv_type.to_string()),
        Box::new(filter.company_id.clone()),
        Box::new(filter.financial_year_id.clone()),
    ];

    if let Some(ref search) = filter.search {
        let idx = conditions.len() + 1;
        conditions.push(format!("(invoice_number LIKE ?{idx} OR vehicle_no LIKE ?{idx})"));
        params_vec.push(Box::new(format!("%{}%", search)));
    }

    let where_sql = format!("WHERE {}", conditions.join(" AND "));
    
    let count_sql = format!("SELECT COUNT(*) FROM invoices {}", where_sql);
    let total: u32 = {
        let mut stmt = conn.prepare(&count_sql).map_err(|e| AppError::Database(e.to_string()))?;
        let refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        stmt.query_row(refs.as_slice(), |row| row.get::<_, i64>(0)).map(|n| n as u32).map_err(|e| AppError::Database(e.to_string()))?
    };

    let list_sql = format!(
        "SELECT {} FROM invoices {} ORDER BY date DESC LIMIT ?{} OFFSET ?{}",
        INVOICE_COLUMNS,
        where_sql,
        params_vec.len() + 1,
        params_vec.len() + 2,
    );
    
    let mut list_params = params_vec;
    list_params.push(Box::new(pagination.limit() as i64));
    list_params.push(Box::new(pagination.offset() as i64));

    let mut stmt = conn.prepare(&list_sql).map_err(|e| AppError::Database(e.to_string()))?;
    let refs: Vec<&dyn rusqlite::ToSql> = list_params.iter().map(|p| p.as_ref()).collect();
    let items = stmt.query_map(refs.as_slice(), Invoice::from_row)
        .map_err(|e| AppError::Database(e.to_string()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| AppError::Database(e.to_string()))?;

    Ok(PagedResult::new(items, total, &pagination))
}

pub fn insert_invoice(conn: &Connection, input: &CreateInvoice) -> AppResult<Invoice> {
    insert_by_type(conn, input, "SALE")
}

pub fn insert_purchase(conn: &Connection, input: &CreateInvoice) -> AppResult<Invoice> {
    insert_by_type(conn, input, "PURCHASE")
}

fn insert_by_type(conn: &Connection, input: &CreateInvoice, inv_type: &str) -> AppResult<Invoice> {
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "INSERT INTO invoices (id, company_id, financial_year_id, type, invoice_number, date, ledger_id, vehicle_no, declared_weight, sub_total, grand_total, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            id, input.company_id, input.financial_year_id, inv_type,
            input.invoice_number, input.date, input.ledger_id, input.vehicle_no,
            input.declared_weight, input.sub_total, input.grand_total,
            "FINAL", now, now
        ],
    ).map_err(|e| AppError::Database(e.to_string()))?;

    for item in &input.items {
        let item_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO invoice_items (id, invoice_id, variety_id, quantity, weight, rate, pricing_type, amount)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                item_id, id, item.variety_id, item.quantity, item.weight,
                item.rate, item.pricing_type, item.amount
            ],
        ).map_err(|e| AppError::Database(e.to_string()))?;
    }

    match find_invoice_by_id(conn, &id)? {
        Some(i) => Ok(i),
        None => Err(AppError::Database("Failed to retrieve created invoice".to_string())),
    }
}

pub fn delete_invoice(conn: &Connection, id: &str) -> AppResult<()> {
    conn.execute("DELETE FROM invoices WHERE id = ?1", params![id]).map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}

pub fn delete_purchase(conn: &Connection, id: &str) -> AppResult<()> {
    delete_invoice(conn, id)
}

pub fn find_purchase_by_id(conn: &Connection, id: &str) -> AppResult<Option<Invoice>> {
    find_invoice_by_id(conn, id)
}
