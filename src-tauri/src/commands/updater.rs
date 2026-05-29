// commands/updater.rs
// App update commands — tauri-plugin-updater.
// Stub — wire up when tauri-plugin-updater is added to Cargo.toml.
//
// Frontend command names:
//   "updater_check"    → updater_check()
//   "updater_install"  → updater_install()

use serde::Serialize;
use crate::ipc::IpcResponse;
use crate::error::AppResult;

// ── Payload types ─────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct UpdateCheckResult {
    pub available: bool,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub release_notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct UpdateInstallResult {
    pub started: bool,
    pub message: String,
}

// ── Command handlers ──────────────────────────────────────────────────────────

/// Check whether an app update is available.
/// Frontend: ipc.updater.check()
#[tauri::command]
pub async fn updater_check() -> AppResult<IpcResponse<UpdateCheckResult>> {
    Ok(IpcResponse::ok(UpdateCheckResult {
        available: false,
        current_version: env!("CARGO_PKG_VERSION").to_string(),
        latest_version: None,
        release_notes: None,
    }))
}

/// Download and install the pending update.
/// Frontend: ipc.updater.install()
#[tauri::command]
pub async fn updater_install() -> AppResult<IpcResponse<UpdateInstallResult>> {
    Ok(IpcResponse::ok(UpdateInstallResult {
        started: false,
        message: "Updater not configured in this build".to_string(),
    }))
}
