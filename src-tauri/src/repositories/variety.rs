use crate::db::connection::DbConn;
use crate::error::AppResult;
use crate::models::variety::Variety;

pub fn find_by_fruit(conn: &DbConn, fruit_id: &str) -> AppResult<Vec<Variety>> {
    let mut stmt = conn.prepare("SELECT * FROM varieties WHERE fruit_id = ?1")?;
    let rows = stmt.query_map([fruit_id], |row| Variety::from_row(row))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn insert(conn: &DbConn, v: &Variety) -> AppResult<()> {
    conn.execute(
        "INSERT INTO varieties (id, company_id, fruit_id, name) VALUES (?1, ?2, ?3, ?4)",
        (&v.id, &v.company_id, &v.fruit_id, &v.name),
    )?;
    Ok(())
}
