// use serde::{Deserialize, Serialize};
use crate::db::connection::get_conn;
use crate::error::AppResult;
use crate::ipc::IpcResponse;
use crate::models::company::Company;
use crate::repositories::company as repo;
use crate::state::AppState;

/// Default account groups seeded for every new company.
/// Each tuple is (id, name, nature).
/// IDs are stable slugs so the JS layer can reference them by name.
const DEFAULT_ACCOUNT_GROUPS: &[(&str, &str, &str)] = &[
    ("sundry-debtors",   "Sundry Debtors",   "Asset"),
    ("sundry-creditors", "Sundry Creditors",  "Liability"),
    ("direct-expenses",  "Direct Expenses",   "Expense"),
    ("direct-income",    "Direct Income",     "Income"),
    ("indirect-expenses","Indirect Expenses", "Expense"),
    ("indirect-income",  "Indirect Income",   "Income"),
    ("cash-in-hand",     "Cash in Hand",      "Asset"),
    ("bank-accounts",    "Bank Accounts",     "Asset"),
];

/// Seed default account groups for a company if they don't already exist.
/// Safe to call multiple times — uses INSERT OR IGNORE.
fn seed_account_groups(conn: &rusqlite::Connection, company_id: &str) -> AppResult<()> {
    for (id, name, nature) in DEFAULT_ACCOUNT_GROUPS {
        // Build a company-scoped id so multiple companies don't collide
        let scoped_id = format!("{}__{}", company_id, id);
        conn.execute(
            "INSERT OR IGNORE INTO account_groups (id, company_id, name, nature) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params![scoped_id, company_id, name, nature],
        )?;
    }
    Ok(())
}

#[tauri::command]
pub async fn company_list(
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Vec<Company>>> {
    let conn = get_conn(&state.db)?;
    let rows = repo::get_all(&conn)?;
    Ok(IpcResponse::ok(rows))
}

#[tauri::command]
pub async fn company_create(
    payload: Company,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Company>> {
    let conn = get_conn(&state.db)?;
    repo::create(&conn, &payload)?;
    // Seed default account groups so ledger inserts (parties) work immediately
    seed_account_groups(&conn, &payload.id)?;
    Ok(IpcResponse::ok(payload))
}
