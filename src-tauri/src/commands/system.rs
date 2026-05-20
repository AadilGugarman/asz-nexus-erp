// commands/system.rs
// System-level commands: OS info, locale, paths, clipboard.
//
// Frontend command names:
//   "get_system_info"   → get_system_info()
//   "get_app_data_dir"  → get_app_data_dir()

use serde::Serialize;
use tauri::Manager;
use crate::ipc::IpcResponse;
use crate::error::{AppError, AppResult};

// ── Payload types ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct SystemInfo {
    pub os: String,
    pub os_version: String,
    pub arch: String,
    pub locale: String,
}

#[derive(Debug, Serialize)]
pub struct AppPaths {
    pub app_data_dir: String,
    pub app_config_dir: String,
    pub app_log_dir: String,
}

// ── Command handlers ──────────────────────────────────────────────────────────

/// Returns OS and architecture information.
/// Frontend: ipc.system.getSystemInfo()
#[tauri::command]
pub async fn get_system_info() -> AppResult<IpcResponse<SystemInfo>> {
    Ok(IpcResponse::ok(SystemInfo {
        os: std::env::consts::OS.to_string(),
        os_version: String::new(), // extend with os_info crate when needed
        arch: std::env::consts::ARCH.to_string(),
        locale: std::env::var("LANG")
            .or_else(|_| std::env::var("LC_ALL"))
            .unwrap_or_else(|_| "en-IN".to_string()),
    }))
}

/// Returns resolved app data/config/log directory paths.
/// Frontend: ipc.system.getAppPaths()
#[tauri::command]
pub async fn get_app_data_dir(
    app_handle: tauri::AppHandle,
) -> AppResult<IpcResponse<AppPaths>> {
    let app_data = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Internal(e.to_string()))?
        .to_string_lossy()
        .to_string();

    let app_config = app_handle
        .path()
        .app_config_dir()
        .map_err(|e| AppError::Internal(e.to_string()))?
        .to_string_lossy()
        .to_string();

    let app_log = app_handle
        .path()
        .app_log_dir()
        .map_err(|e| AppError::Internal(e.to_string()))?
        .to_string_lossy()
        .to_string();

    Ok(IpcResponse::ok(AppPaths {
        app_data_dir: app_data,
        app_config_dir: app_config,
        app_log_dir: app_log,
    }))
}
