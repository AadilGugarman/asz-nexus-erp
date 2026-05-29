// commands/db.rs
// Database status and demo seed commands.

use serde::{Deserialize, Serialize};
use crate::db::connection::get_conn;
use crate::ipc::IpcResponse;
use crate::error::AppResult;
// use crate::repositories::employee as employee_repo;
use crate::state::AppState;

#[derive(Debug, Serialize)]
pub struct DbStats {
    pub status:    String,
    // pub employees: crate::repositories::employee::EmployeeStats,
}

#[derive(Debug, Clone, Serialize)]
pub struct SeedTableCounts {
    pub fruits: u32,
    pub suppliers: u32,
    pub customers: u32,
    pub purchase_invoices: u32,
    pub sales_invoices: u32,
    pub payments: u32,
    pub app_settings: u32,
}

#[derive(Debug, Clone, Serialize)]
pub struct SeedResetResponse {
    pub deleted_counts: SeedTableCounts,
    pub reset_at: String,
}

#[derive(Debug, Deserialize)]
pub struct DemoSeedRequest {
    #[allow(dead_code)]
    pub profile: String,
    pub company_id: Option<String>,
}

/// Returns database connection status and live record counts.
/// Frontend: ipc.db.getStats()
#[tauri::command]
pub async fn db_get_stats(
    _state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<DbStats>> {
    // let conn = get_conn(&state.db)?;
    // let employees = employee_repo::stats(&conn)?;
    Ok(IpcResponse::ok(DbStats {
        status: "connected".to_string(),
        // employees,
    }))
}

/// Clears ERP tables scoped to a single company — production-safe reset.
/// Only deletes rows where company_id matches. Other companies are untouched.
#[tauri::command]
pub async fn db_reset_company_data(
    payload: DemoSeedRequest,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<SeedResetResponse>> {
    let mut conn = get_conn(&state.db)?;
    // Require a real company_id — resetting with null/empty would either
    // delete the wrong company's data or silently do nothing useful.
    let company_id = payload.company_id
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .ok_or_else(|| crate::error::AppError::Validation(
            "company_id is required for company reset. Pass the active company ID from the frontend.".to_string()
        ))?;
    
    // Manual delete logic
    let deleted_counts = delete_company_data(&mut conn, company_id)?;
    
    Ok(IpcResponse::ok(SeedResetResponse {
        deleted_counts,
        reset_at: chrono::Utc::now().to_rfc3339(),
    }))
}

fn delete_company_data(conn: &mut rusqlite::Connection, cid: &str) -> AppResult<SeedTableCounts> {
    let tx = conn.transaction()?;
    
    let mut counts = SeedTableCounts {
        fruits: 0,
        suppliers: 0,
        customers: 0,
        purchase_invoices: 0,
        sales_invoices: 0,
        payments: 0,
        app_settings: 0,
    };

    counts.purchase_invoices = tx.execute("DELETE FROM purchase_invoices WHERE company_id = ?", [cid])? as u32;
    counts.sales_invoices = tx.execute("DELETE FROM invoices WHERE company_id = ?", [cid])? as u32;
    counts.payments = tx.execute("DELETE FROM payments WHERE company_id = ?", [cid])? as u32;
    counts.suppliers = tx.execute("DELETE FROM suppliers WHERE company_id = ?", [cid])? as u32;
    counts.customers = tx.execute("DELETE FROM customers WHERE company_id = ?", [cid])? as u32;
    counts.fruits = tx.execute("DELETE FROM fruits WHERE company_id = ?", [cid])? as u32;

    tx.commit()?;
    Ok(counts)
}
