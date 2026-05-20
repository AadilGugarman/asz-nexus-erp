// commands/db.rs
// Database status command — returns live stats from SQLite.

use serde::Serialize;
use crate::db::connection::get_conn;
use crate::ipc::IpcResponse;
use crate::error::AppResult;
use crate::repositories::employee as employee_repo;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct DbStats {
    pub status:    String,
    pub employees: crate::repositories::employee::EmployeeStats,
}

/// Returns database connection status and live record counts.
/// Frontend: ipc.db.getStats()
#[tauri::command]
pub async fn db_get_stats(
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<DbStats>> {
    let conn = get_conn(&state.db)?;
    let employees = employee_repo::stats(&conn)?;
    Ok(IpcResponse::ok(DbStats {
        status: "connected".to_string(),
        employees,
    }))
}
