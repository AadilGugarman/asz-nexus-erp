use serde::Deserialize;
use crate::db::connection::get_conn;
use crate::error::AppResult;
use crate::ipc::IpcResponse;
use crate::models::ledger::Ledger;
use crate::repositories::ledger as repo;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct IdPayload { pub id: String }

#[derive(Debug, Deserialize)]
pub struct CompanyIdPayload { pub company_id: String }

#[tauri::command]
pub async fn ledger_list(
    payload: CompanyIdPayload,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Vec<Ledger>>> {
    let conn = get_conn(&state.db)?;
    let rows = repo::find_all(&conn, &payload.company_id)?;
    Ok(IpcResponse::ok(rows))
}

#[tauri::command]
pub async fn ledger_get(
    payload: IdPayload,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Ledger>> {
    let conn = get_conn(&state.db)?;
    match repo::find_by_id(&conn, &payload.id)? {
        Some(l) => Ok(IpcResponse::ok(l)),
        None    => Ok(IpcResponse::err("NOT_FOUND", format!("Ledger '{}' not found", payload.id))),
    }
}

#[tauri::command]
pub async fn ledger_create(
    payload: Ledger,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Ledger>> {
    let conn = get_conn(&state.db)?;
    repo::insert(&conn, &payload)?;
    Ok(IpcResponse::ok(payload))
}

#[tauri::command]
pub async fn ledger_delete(
    payload: IdPayload,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<bool>> {
    let conn = get_conn(&state.db)?;
    repo::delete(&conn, &payload.id)?;
    Ok(IpcResponse::ok(true))
}
