// commands/payment.rs
// Tauri command handlers for the payments domain.
//
// Frontend command names:
//   "payment_list"   → payment_list()
//   "payment_get"    → payment_get()
//   "payment_create" → payment_create()
//   "payment_delete" → payment_delete()

use serde::{Deserialize, Serialize};
use crate::db::connection::get_conn;
use crate::error::AppResult;
use crate::ipc::IpcResponse;
use crate::models::payment::{CreatePayment, Payment, PaymentFilter};
use crate::repositories::payment as repo;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct PaymentListResponse {
    pub items:       Vec<Payment>,
    pub total:       u32,
    pub page:        u32,
    pub limit:       u32,
    pub total_pages: u32,
}

#[derive(Debug, Deserialize)]
pub struct IdPayload { pub id: String }

#[derive(Debug, Deserialize)]
pub struct PartyBalancePayload { pub party_id: String }

#[tauri::command]
pub async fn payment_list(
    payload: PaymentFilter,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<PaymentListResponse>> {
    let conn = get_conn(&state.db)?;
    let paged = repo::find_all(&conn, &payload)?;
    Ok(IpcResponse::ok(PaymentListResponse {
        items:       paged.items,
        total:       paged.total,
        page:        paged.page,
        limit:       paged.limit,
        total_pages: paged.total_pages,
    }))
}

#[tauri::command]
pub async fn payment_get(
    payload: IdPayload,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Payment>> {
    let conn = get_conn(&state.db)?;
    match repo::find_by_id(&conn, &payload.id)? {
        Some(p) => Ok(IpcResponse::ok(p)),
        None    => Ok(IpcResponse::err("NOT_FOUND", format!("Payment '{}' not found", payload.id))),
    }
}

#[tauri::command]
pub async fn payment_create(
    payload: CreatePayment,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Payment>> {
    payload.validate()?;
    let conn = get_conn(&state.db)?;
    let p = repo::insert(&conn, &payload)?;
    Ok(IpcResponse::ok(p))
}

#[tauri::command]
pub async fn payment_delete(
    payload: IdPayload,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<bool>> {
    let conn = get_conn(&state.db)?;
    repo::delete(&conn, &payload.id)?;
    Ok(IpcResponse::ok(true))
}

/// Returns the total amount paid by a party — useful for balance display.
#[tauri::command]
pub async fn payment_total_by_party(
    payload: PartyBalancePayload,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<f64>> {
    let conn = get_conn(&state.db)?;
    let total = repo::total_paid_by_party(&conn, &payload.party_id)?;
    Ok(IpcResponse::ok(total))
}
