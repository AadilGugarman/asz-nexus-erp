// commands/app.rs
// Application-level commands: version info, ping, app metadata.
// Thin handlers — business logic lives in services/app.rs.
//
// Frontend command names (snake_case):
//   "get_app_info"   → get_app_info()
//   "ping"           → ping()

use serde::Serialize;
use crate::ipc::IpcResponse;
use crate::error::AppResult;
use crate::services::app as app_service;
use crate::state::AppState;

// ── Payload types ─────────────────────────────────────────────────────────────

/// Response payload for get_app_info.
/// Matches TypeScript interface AppInfo in src/ipc/types.ts.
#[derive(Debug, Serialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub tauri_version: String,
    pub debug: bool,
    pub build_stamp: String,
}

// ── Command handlers ──────────────────────────────────────────────────────────

/// Returns static app metadata.
/// Frontend: ipc.app.getAppInfo()
#[tauri::command]
pub async fn get_app_info(
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<AppInfo>> {
    let cfg = state.config.read().await;
    Ok(IpcResponse::ok(AppInfo {
        name: cfg.app_name.clone(),
        version: cfg.version.clone(),
        tauri_version: tauri::VERSION.to_string(),
        debug: cfg.debug,
        build_stamp: app_service::build_stamp(),
    }))
}
