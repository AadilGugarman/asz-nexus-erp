use crate::db::connection::DbConn;
use crate::error::AppResult;
use crate::models::company::Company;

pub fn create(conn: &DbConn, company: &Company) -> AppResult<()> {
    conn.execute(
        "INSERT INTO companies (id, name, legal_name, gstin, address, phone, email, website, logo, currency)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        (
            &company.id, &company.name, &company.legal_name, &company.gstin,
            &company.address, &company.phone, &company.email, &company.website,
            &company.logo, &company.currency
        ),
    )?;
    Ok(())
}

pub fn get_all(conn: &DbConn) -> AppResult<Vec<Company>> {
    let mut stmt = conn.prepare("SELECT * FROM companies")?;
    let companies = stmt.query_map([], |row| Company::from_row(row))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(companies)
}
