// commands/supplier.rs
// Tauri command handlers for the supplier domain.
//
// Frontend command names:
//   "supplier_list"   → supplier_list()
//   "supplier_get"    → supplier_get()
//   "supplier_create" → supplier_create()
//   "supplier_update" → supplier_update()
//   "supplier_delete" → supplier_delete()

use serde::{Deserialize, Serialize};
use crate::db::connection::get_conn;
use crate::error::AppResult;
use crate::ipc::IpcResponse;
use crate::models::supplier::{CreateSupplier, Supplier, SupplierFilter, UpdateSupplier};
use crate::repositories::supplier as repo;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct SupplierListResponse {
    pub items:       Vec<Supplier>,
    pub total:       u32,
    pub page:        u32,
    pub limit:       u32,
    pub total_pages: u32,
}

#[derive(Debug, Deserialize)]
pub struct IdPayload { pub id: String }

#[tauri::command]
pub async fn supplier_list(
    payload: SupplierFilter,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<SupplierListResponse>> {
    let conn = get_conn(&state.db)?;
    let paged = repo::find_all(&conn, &payload)?;
    Ok(IpcResponse::ok(SupplierListResponse {
        items:       paged.items,
        total:       paged.total,
        page:        paged.page,
        limit:       paged.limit,
        total_pages: paged.total_pages,
    }))
}

#[tauri::command]
pub async fn supplier_get(
    payload: IdPayload,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Supplier>> {
    let conn = get_conn(&state.db)?;
    match repo::find_by_id(&conn, &payload.id)? {
        Some(s) => Ok(IpcResponse::ok(s)),
        None    => Ok(IpcResponse::err("NOT_FOUND", format!("Supplier '{}' not found", payload.id))),
    }
}

#[tauri::command]
pub async fn supplier_create(
    payload: CreateSupplier,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Supplier>> {
    payload.validate()?;
    let conn = get_conn(&state.db)?;
    let s = repo::insert(&conn, &payload)?;
    Ok(IpcResponse::ok(s))
}

#[tauri::command]
pub async fn supplier_update(
    id: String,
    payload: UpdateSupplier,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Supplier>> {
    payload.validate()?;
    if !payload.has_changes() {
        return Ok(IpcResponse::err("VALIDATION_ERROR", "No fields provided for update"));
    }
    let conn = get_conn(&state.db)?;
    let s = repo::update(&conn, &id, &payload)?;
    Ok(IpcResponse::ok(s))
}

#[tauri::command]
pub async fn supplier_delete(
    payload: IdPayload,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<bool>> {
    let conn = get_conn(&state.db)?;
    repo::delete(&conn, &payload.id)?;
    Ok(IpcResponse::ok(true))
}
