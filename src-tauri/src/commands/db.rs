// commands/db.rs
// Database status and demo seed commands.

use serde::{Deserialize, Serialize};
use crate::db::connection::get_conn;
use crate::ipc::IpcResponse;
use crate::error::AppResult;
use crate::repositories::employee as employee_repo;
use crate::services::demo_seed;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct DbStats {
    pub status:    String,
    pub employees: crate::repositories::employee::EmployeeStats,
}

#[derive(Debug, Deserialize)]
pub struct DemoSeedRequest {
    pub profile: String,
    pub company_id: Option<String>,
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

/// Returns recommended demo seed profiles and scaling guidance.
#[tauri::command]
pub async fn db_get_seed_plan() -> AppResult<IpcResponse<demo_seed::SeedPlanResponse>> {
    Ok(IpcResponse::ok(demo_seed::seed_plan()))
}

/// Clears ERP tables and inserts deterministic demo data for the requested profile.
#[tauri::command]
pub async fn db_reseed_demo_data(
    payload: DemoSeedRequest,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<demo_seed::SeedExecutionResponse>> {
    let mut conn = get_conn(&state.db)?;
    let company_id = payload.company_id.as_deref().unwrap_or("default");
    let result = demo_seed::reseed_demo_data(&mut conn, &payload.profile, company_id)?;
    Ok(IpcResponse::ok(result))
}

/// Clears ERP tables and app settings without reseeding.
#[tauri::command]
pub async fn db_reset_demo_data(
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<demo_seed::SeedResetResponse>> {
    let mut conn = get_conn(&state.db)?;
    let result = demo_seed::reset_demo_data(&mut conn)?;
    Ok(IpcResponse::ok(result))
}
