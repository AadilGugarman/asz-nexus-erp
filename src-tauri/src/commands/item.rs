use serde::Deserialize;
use crate::db::connection::get_conn;
use crate::error::AppResult;
use crate::ipc::IpcResponse;
use crate::models::fruit::Fruit;
use crate::repositories::fruit as repo;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct CompanyIdPayload { pub company_id: String }

#[tauri::command]
pub async fn fruit_list(
    payload: CompanyIdPayload,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Vec<Fruit>>> {
    let conn = get_conn(&state.db)?;
    let rows = repo::find_all(&conn, &payload.company_id)?;
    Ok(IpcResponse::ok(rows))
}

#[tauri::command]
pub async fn fruit_create(
    payload: Fruit,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Fruit>> {
    let conn = get_conn(&state.db)?;
    repo::insert(&conn, &payload)?;
    Ok(IpcResponse::ok(payload))
}
