// events/emitter.rs
// Typed event emission wrapper around tauri::AppHandle.
// These are used by commands that need to push real-time updates to the frontend.
#![allow(dead_code)]

use serde::Serialize;
use tauri::AppHandle;
use tauri::Emitter;
use crate::error::{AppError, AppResult};
use super::names;

// ── Event payload types ───────────────────────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
pub struct TaskProgressPayload {
    pub percent: u8,       // 0–100
    pub message: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct TaskCompletePayload {
    pub task_id: String,
    pub message: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct TaskErrorPayload {
    pub task_id: String,
    pub code: String,
    pub message: String,
}

#[derive(Debug, Serialize, Clone)]
pub struct DataChangedPayload {
    pub domain: String,    // e.g. "suppliers", "invoices"
    pub action: String,    // "created" | "updated" | "deleted"
    pub id: Option<String>,
}

// ── Emitter ───────────────────────────────────────────────────────────────────

pub struct AppEmitter;

impl AppEmitter {
    /// Emit app:ready — call once after initialisation is complete.
    pub fn emit_app_ready(handle: &AppHandle) -> AppResult<()> {
        handle
            .emit(names::APP_READY, ())
            .map_err(|e| AppError::Internal(e.to_string()))
    }

    /// Emit a progress update for a long-running background task.
    pub fn emit_task_progress(
        handle: &AppHandle,
        percent: u8,
        message: impl Into<String>,
    ) -> AppResult<()> {
        handle
            .emit(names::TASK_PROGRESS, TaskProgressPayload {
                percent: percent.min(100),
                message: message.into(),
            })
            .map_err(|e| AppError::Internal(e.to_string()))
    }

    /// Emit task completion.
    pub fn emit_task_complete(
        handle: &AppHandle,
        task_id: impl Into<String>,
        message: impl Into<String>,
    ) -> AppResult<()> {
        handle
            .emit(names::TASK_COMPLETE, TaskCompletePayload {
                task_id: task_id.into(),
                message: message.into(),
            })
            .map_err(|e| AppError::Internal(e.to_string()))
    }

    /// Emit a task error.
    pub fn emit_task_error(
        handle: &AppHandle,
        task_id: impl Into<String>,
        code: impl Into<String>,
        message: impl Into<String>,
    ) -> AppResult<()> {
        handle
            .emit(names::TASK_ERROR, TaskErrorPayload {
                task_id: task_id.into(),
                code: code.into(),
                message: message.into(),
            })
            .map_err(|e| AppError::Internal(e.to_string()))
    }

    /// Emit a data-changed notification so the frontend can refetch.
    pub fn emit_data_changed(
        handle: &AppHandle,
        domain: impl Into<String>,
        action: impl Into<String>,
        id: Option<String>,
    ) -> AppResult<()> {
        handle
            .emit(names::DATA_CHANGED, DataChangedPayload {
                domain: domain.into(),
                action: action.into(),
                id,
            })
            .map_err(|e| AppError::Internal(e.to_string()))
    }
}
