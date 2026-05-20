// commands/file.rs
// File system commands — thin handlers that delegate to services/file.rs.
//
// Frontend command names:
//   "write_text_file"  → write_text_file()
//   "read_text_file"   → read_text_file()
//   "stat_path"        → stat_path_cmd()

use serde::{Deserialize, Serialize};
use crate::ipc::IpcResponse;
use crate::error::AppResult;
use crate::services::file as file_service;

// ── Payload types ─────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct WriteFileRequest {
    pub path: String,
    pub content: String,
    pub create_dirs: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct WriteFileResponse {
    pub path: String,
    pub bytes_written: usize,
}

#[derive(Debug, Deserialize)]
pub struct ReadFileRequest {
    pub path: String,
}

#[derive(Debug, Serialize)]
pub struct ReadFileResponse {
    pub path: String,
    pub content: String,
    pub size_bytes: u64,
}

#[derive(Debug, Deserialize)]
pub struct StatPathRequest {
    pub path: String,
}

// ── Command handlers ──────────────────────────────────────────────────────────

/// Write UTF-8 text to a file on disk.
/// Frontend: ipc.file.writeTextFile({ path, content, create_dirs? })
#[tauri::command]
pub async fn write_text_file(
    payload: WriteFileRequest,
) -> AppResult<IpcResponse<WriteFileResponse>> {
    let path = file_service::resolve_path(&payload.path)?;
    let bytes = file_service::write_text(
        &path,
        &payload.content,
        payload.create_dirs.unwrap_or(false),
    )?;
    Ok(IpcResponse::ok(WriteFileResponse {
        path: payload.path,
        bytes_written: bytes,
    }))
}

/// Read UTF-8 text from a file on disk.
/// Frontend: ipc.file.readTextFile({ path })
#[tauri::command]
pub async fn read_text_file(
    payload: ReadFileRequest,
) -> AppResult<IpcResponse<ReadFileResponse>> {
    let path = file_service::resolve_path(&payload.path)?;
    let (content, size_bytes) = file_service::read_text(&path)?;
    Ok(IpcResponse::ok(ReadFileResponse {
        path: payload.path,
        content,
        size_bytes,
    }))
}

/// Stat a path — check existence, type, and size without reading content.
/// Frontend: ipc.file.statPath({ path })
#[tauri::command]
pub async fn stat_path_cmd(
    payload: StatPathRequest,
) -> AppResult<IpcResponse<file_service::PathInfo>> {
    let path = std::path::PathBuf::from(&payload.path);
    Ok(IpcResponse::ok(file_service::stat_path(&path)))
}
