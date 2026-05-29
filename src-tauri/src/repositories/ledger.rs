use crate::db::connection::DbConn;
use crate::error::AppResult;
use crate::models::ledger::Ledger;

pub fn find_all(conn: &DbConn, company_id: &str) -> AppResult<Vec<Ledger>> {
    let mut stmt = conn.prepare("SELECT * FROM ledgers WHERE company_id = ?1")?;
    let rows = stmt.query_map([company_id], |row| Ledger::from_row(row))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn find_by_id(conn: &DbConn, id: &str) -> AppResult<Option<Ledger>> {
    let mut stmt = conn.prepare("SELECT * FROM ledgers WHERE id = ?1")?;
    let mut rows = stmt.query_map([id], |row| Ledger::from_row(row))?;
    if let Some(row) = rows.next() {
        return Ok(Some(row?));
    }
    Ok(None)
}

pub fn insert(conn: &DbConn, l: &Ledger) -> AppResult<()> {
    conn.execute(
        "INSERT INTO ledgers (id, company_id, group_id, name, code, type, phone, email, gstin, billing_address, shipping_address, city, state, opening_balance, opening_balance_type, credit_limit, notes, is_system)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
        rusqlite::params![
            &l.id, &l.company_id, &l.group_id, &l.name, &l.code, &l.ledger_type,
            &l.phone, &l.email, &l.gstin, &l.billing_address, &l.shipping_address,
            &l.city, &l.state, &l.opening_balance, &l.opening_balance_type,
            &l.credit_limit, &l.notes, &l.is_system
        ],
    )?;
    Ok(())
}

pub fn delete(conn: &DbConn, id: &str) -> AppResult<()> {
    conn.execute("DELETE FROM ledgers WHERE id = ?1", [id])?;
    Ok(())
}
