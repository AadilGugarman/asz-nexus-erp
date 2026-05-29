use crate::db::connection::DbConn;
use crate::error::AppResult;
use crate::models::caret::CaretTransaction;

pub fn find_all(conn: &DbConn, company_id: &str, fy_id: &str) -> AppResult<Vec<CaretTransaction>> {
    let mut stmt = conn.prepare("SELECT * FROM caret_transactions WHERE company_id = ?1 AND financial_year_id = ?2")?;
    let rows = stmt.query_map([company_id, fy_id], |row| CaretTransaction::from_row(row))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn insert(conn: &DbConn, t: &CaretTransaction) -> AppResult<()> {
    conn.execute(
        "INSERT INTO caret_transactions (id, company_id, financial_year_id, ledger_id, type, quantity, date, fruit_name, notes, invoice_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        (
            &t.id, &t.company_id, &t.financial_year_id, &t.ledger_id, &t.tx_type,
            &t.quantity, &t.date, &t.fruit_name, &t.notes, &t.invoice_id
        ),
    )?;
    Ok(())
}
