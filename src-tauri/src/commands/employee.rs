// commands/employee.rs
// Thin CRUD command handlers for the employee domain.
//
// Each handler:
//   1. Extracts the DB connection from AppState
//   2. Validates input (via model's validate())
//   3. Delegates to the repository
//   4. Returns IpcResponse<T>
//
// Frontend command names:
//   "employee_list"        → employee_list()
//   "employee_get"         → employee_get()
//   "employee_create"      → employee_create()
//   "employee_update"      → employee_update()
//   "employee_delete"      → employee_delete()
//   "employee_set_active"  → employee_set_active()
//   "employee_bulk_insert" → employee_bulk_insert()

use serde::{Deserialize, Serialize};
use crate::db::connection::get_conn;
use crate::error::AppResult;
use crate::ipc::IpcResponse;
use crate::models::employee::{
    CreateEmployee, Employee, EmployeeFilter, UpdateEmployee,
};
use crate::repositories::employee as repo;
use crate::state::AppState;

// ── Paged list response ───────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct EmployeeListResponse {
    pub items:       Vec<Employee>,
    pub total:       u32,
    pub page:        u32,
    pub limit:       u32,
    pub total_pages: u32,
}

// ── Request types ─────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct IdPayload {
    pub id: String,
}

#[derive(Debug, Deserialize)]
pub struct SetActivePayload {
    pub id:     String,
    pub active: bool,
}

#[derive(Debug, Deserialize)]
pub struct BulkInsertPayload {
    pub employees: Vec<CreateEmployee>,
}

// ── Command handlers ──────────────────────────────────────────────────────────

/// List employees with optional filters and pagination.
/// Frontend: ipc.employee.list(filter)
#[tauri::command]
pub async fn employee_list(
    payload: EmployeeFilter,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<EmployeeListResponse>> {
    let conn = get_conn(&state.db)?;
    let paged = repo::find_all(&conn, &payload)?;
    Ok(IpcResponse::ok(EmployeeListResponse {
        items:       paged.items,
        total:       paged.total,
        page:        paged.page,
        limit:       paged.limit,
        total_pages: paged.total_pages,
    }))
}

/// Get a single employee by ID.
/// Frontend: ipc.employee.get({ id })
#[tauri::command]
pub async fn employee_get(
    payload: IdPayload,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Employee>> {
    let conn = get_conn(&state.db)?;
    match repo::find_by_id(&conn, &payload.id)? {
        Some(emp) => Ok(IpcResponse::ok(emp)),
        None      => Ok(IpcResponse::err(
            "NOT_FOUND",
            format!("Employee '{}' not found", payload.id),
        )),
    }
}

/// Create a new employee.
/// Frontend: ipc.employee.create(input)
#[tauri::command]
pub async fn employee_create(
    payload: CreateEmployee,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Employee>> {
    payload.validate()?;

    let conn = get_conn(&state.db)?;

    if repo::email_exists(&conn, &payload.email, None)? {
        return Ok(IpcResponse::err(
            "VALIDATION_ERROR",
            format!("Email '{}' is already taken", payload.email),
        ));
    }

    let emp = repo::insert(&conn, &payload)?;
    Ok(IpcResponse::ok(emp))
}

/// Update an existing employee (partial update — only provided fields change).
/// Frontend: ipc.employee.update({ id, ...fields })
#[tauri::command]
pub async fn employee_update(
    id: String,
    payload: UpdateEmployee,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Employee>> {
    payload.validate()?;

    if !payload.has_changes() {
        return Ok(IpcResponse::err("VALIDATION_ERROR", "No fields provided for update"));
    }

    let conn = get_conn(&state.db)?;

    // Check email uniqueness if email is being changed
    if let Some(ref email) = payload.email {
        if repo::email_exists(&conn, email, Some(&id))? {
            return Ok(IpcResponse::err(
                "VALIDATION_ERROR",
                format!("Email '{email}' is already taken"),
            ));
        }
    }

    let emp = repo::update(&conn, &id, &payload)?;
    Ok(IpcResponse::ok(emp))
}

/// Hard-delete an employee.
/// Frontend: ipc.employee.delete({ id })
#[tauri::command]
pub async fn employee_delete(
    payload: IdPayload,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<bool>> {
    let conn = get_conn(&state.db)?;
    repo::delete(&conn, &payload.id)?;
    Ok(IpcResponse::ok(true))
}

/// Toggle the is_active flag (soft delete / restore).
/// Frontend: ipc.employee.setActive({ id, active })
#[tauri::command]
pub async fn employee_set_active(
    payload: SetActivePayload,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Employee>> {
    let conn = get_conn(&state.db)?;
    let emp = repo::set_active(&conn, &payload.id, payload.active)?;
    Ok(IpcResponse::ok(emp))
}

/// Bulk-insert employees inside a single transaction.
/// Frontend: ipc.employee.bulkInsert({ employees: [...] })
#[tauri::command]
pub async fn employee_bulk_insert(
    payload: BulkInsertPayload,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<Vec<Employee>>> {
    if payload.employees.is_empty() {
        return Ok(IpcResponse::err("VALIDATION_ERROR", "employees array must not be empty"));
    }
    let conn = get_conn(&state.db)?;
    let created = repo::bulk_insert(&conn, &payload.employees)?;
    Ok(IpcResponse::ok(created))
}
