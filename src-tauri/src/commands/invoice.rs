// commands/invoice.rs
// Tauri command handlers for sales and purchase invoices.

use serde::{Deserialize, Serialize};
use crate::db::connection::get_conn;
use crate::error::AppResult;
use crate::ipc::IpcResponse;
use crate::models::invoice::{
    CreateInvoice, Invoice, InvoiceFilter,
    CreatePurchaseInvoice, PurchaseInvoice, PurchaseInvoiceFilter,
};
use crate::repositories::invoice as repo;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct InvoiceListResponse {
    pub items:       Vec<Invoice>,
    pub total:       u32,
    pub page:        u32,
    pub limit:       u32,
    pub total_pages: u32,
}

#[derive(Debug, Serialize)]
pub struct PurchaseListResponse {
    pub items:       Vec<PurchaseInvoice>,
    pub total:       u32,
    pub page:        u32,
    pub limit:       u32,
    pub total_pages: u32,
}

#[derive(Debug, Deserialize)]
pub struct IdPayload { pub id: String }

// ── Sales Invoices ────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn invoice_list(
    payload: InvoiceFilter,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<InvoiceListResponse>> {
    let conn = get_conn(&state.db)?;
    let paged = repo::find_invoices(&conn, &payload)?;
    Ok(IpcResponse::ok(InvoiceListResponse {
        items: paged.items, total: paged.total,
        page: paged.page, limit: paged.limit, total_pages: paged.total_pages,
    }))
}

#[tauri::command]
pub async fn invoice_get(
    payload: IdPayload,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Invoice>> {
    let conn = get_conn(&state.db)?;
    match repo::find_invoice_by_id(&conn, &payload.id)? {
        Some(i) => Ok(IpcResponse::ok(i)),
        None    => Ok(IpcResponse::err("NOT_FOUND", format!("Invoice '{}' not found", payload.id))),
    }
}

#[tauri::command]
pub async fn invoice_create(
    payload: CreateInvoice,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Invoice>> {
    payload.validate()?;
    let conn = get_conn(&state.db)?;
    let i = repo::insert_invoice(&conn, &payload)?;
    Ok(IpcResponse::ok(i))
}

#[tauri::command]
pub async fn invoice_delete(
    payload: IdPayload,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<bool>> {
    let conn = get_conn(&state.db)?;
    repo::delete_invoice(&conn, &payload.id)?;
    Ok(IpcResponse::ok(true))
}

// ── Purchase Invoices ─────────────────────────────────────────────────────────

#[tauri::command]
pub async fn purchase_list(
    payload: PurchaseInvoiceFilter,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<PurchaseListResponse>> {
    let conn = get_conn(&state.db)?;
    let paged = repo::find_purchases(&conn, &payload)?;
    Ok(IpcResponse::ok(PurchaseListResponse {
        items: paged.items, total: paged.total,
        page: paged.page, limit: paged.limit, total_pages: paged.total_pages,
    }))
}

#[tauri::command]
pub async fn purchase_get(
    payload: IdPayload,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<PurchaseInvoice>> {
    let conn = get_conn(&state.db)?;
    match repo::find_purchase_by_id(&conn, &payload.id)? {
        Some(p) => Ok(IpcResponse::ok(p)),
        None    => Ok(IpcResponse::err("NOT_FOUND", format!("Purchase '{}' not found", payload.id))),
    }
}

#[tauri::command]
pub async fn purchase_create(
    payload: CreatePurchaseInvoice,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<PurchaseInvoice>> {
    payload.validate()?;
    let conn = get_conn(&state.db)?;
    let p = repo::insert_purchase(&conn, &payload)?;
    Ok(IpcResponse::ok(p))
}

#[tauri::command]
pub async fn purchase_delete(
    payload: IdPayload,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<bool>> {
    let conn = get_conn(&state.db)?;
    repo::delete_purchase(&conn, &payload.id)?;
    Ok(IpcResponse::ok(true))
}
