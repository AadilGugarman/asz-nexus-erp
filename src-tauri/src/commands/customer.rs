// commands/customer.rs
// Tauri command handlers for the customer domain.

use serde::{Deserialize, Serialize};
use crate::db::connection::get_conn;
use crate::error::AppResult;
use crate::ipc::IpcResponse;
use crate::models::customer::{CreateCustomer, Customer, CustomerFilter, UpdateCustomer};
use crate::repositories::customer as repo;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct CustomerListResponse {
    pub items:       Vec<Customer>,
    pub total:       u32,
    pub page:        u32,
    pub limit:       u32,
    pub total_pages: u32,
}

#[derive(Debug, Deserialize)]
pub struct IdPayload { pub id: String }

#[tauri::command]
pub async fn customer_list(
    payload: CustomerFilter,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<CustomerListResponse>> {
    let conn = get_conn(&state.db)?;
    let paged = repo::find_all(&conn, &payload)?;
    Ok(IpcResponse::ok(CustomerListResponse {
        items:       paged.items,
        total:       paged.total,
        page:        paged.page,
        limit:       paged.limit,
        total_pages: paged.total_pages,
    }))
}

#[tauri::command]
pub async fn customer_get(
    payload: IdPayload,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Customer>> {
    let conn = get_conn(&state.db)?;
    match repo::find_by_id(&conn, &payload.id)? {
        Some(c) => Ok(IpcResponse::ok(c)),
        None    => Ok(IpcResponse::err("NOT_FOUND", format!("Customer '{}' not found", payload.id))),
    }
}

#[tauri::command]
pub async fn customer_create(
    payload: CreateCustomer,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Customer>> {
    payload.validate()?;
    let conn = get_conn(&state.db)?;
    let c = repo::insert(&conn, &payload)?;
    Ok(IpcResponse::ok(c))
}

#[tauri::command]
pub async fn customer_update(
    id: String,
    payload: UpdateCustomer,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Customer>> {
    payload.validate()?;
    if !payload.has_changes() {
        return Ok(IpcResponse::err("VALIDATION_ERROR", "No fields provided for update"));
    }
    let conn = get_conn(&state.db)?;
    let c = repo::update(&conn, &id, &payload)?;
    Ok(IpcResponse::ok(c))
}

#[tauri::command]
pub async fn customer_delete(
    payload: IdPayload,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<bool>> {
    let conn = get_conn(&state.db)?;
    repo::delete(&conn, &payload.id)?;
    Ok(IpcResponse::ok(true))
}
