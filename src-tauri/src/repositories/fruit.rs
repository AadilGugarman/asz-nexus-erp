use crate::db::connection::DbConn;
use crate::error::AppResult;
use crate::models::fruit::Fruit;

pub fn find_all(conn: &DbConn, company_id: &str) -> AppResult<Vec<Fruit>> {
    let mut stmt = conn.prepare("SELECT * FROM fruits WHERE company_id = ?1")?;
    let rows = stmt.query_map([company_id], |row| Fruit::from_row(row))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

pub fn insert(conn: &DbConn, f: &Fruit) -> AppResult<()> {
    conn.execute(
        "INSERT INTO fruits (id, company_id, name, pricing_type) VALUES (?1, ?2, ?3, ?4)",
        (&f.id, &f.company_id, &f.name, &f.pricing_type),
    )?;
    Ok(())
}
