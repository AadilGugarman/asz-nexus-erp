// commands/fs.rs
// Secure filesystem commands with desktop dialog support.
//
// All path arguments are validated through AllowedRoots before any I/O.
// Binary data (PDF, uploads) is transferred as base64 strings to stay
// within Tauri's JSON IPC boundary.
//
// Frontend command names:
//   "fs_stat"              → fs_stat()
//   "fs_list_dir"          → fs_list_dir()
//   "fs_read_text"         → fs_read_text()
//   "fs_write_text"        → fs_write_text()
//   "fs_read_bytes"        → fs_read_bytes()   (returns base64)
//   "fs_write_bytes"       → fs_write_bytes()  (accepts base64)
//   "fs_copy"              → fs_copy()
//   "fs_delete"            → fs_delete()
//   "fs_export_csv"        → fs_export_csv()
//   "fs_export_json"       → fs_export_json()
//   "fs_save_pdf"          → fs_save_pdf()     (accepts base64 PDF bytes)
//   "fs_dialog_open"       → fs_dialog_open()
//   "fs_dialog_save"       → fs_dialog_save()
//   "fs_get_allowed_roots" → fs_get_allowed_roots()

use serde::{Deserialize, Serialize};
use tauri::Manager;
use base64::{Engine as _, engine::general_purpose::STANDARD as B64};

use crate::ipc::IpcResponse;
use crate::error::{AppError, AppResult};
use crate::services::fs as fs_svc;

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Build the AllowedRoots from the Tauri AppHandle.
/// Includes: app-data dir, desktop, documents, downloads.
fn allowed_roots(app: &tauri::AppHandle) -> AppResult<fs_svc::AllowedRoots> {
    let path_resolver = app.path();

    let mut roots = Vec::new();

    // App data directory is always allowed.
    if let Ok(p) = path_resolver.app_data_dir() {
        roots.push(p);
    }
    if let Ok(p) = path_resolver.app_config_dir() {
        roots.push(p);
    }

    // User-facing directories for exports / imports.
    if let Ok(p) = path_resolver.desktop_dir() {
        roots.push(p);
    }
    if let Ok(p) = path_resolver.document_dir() {
        roots.push(p);
    }
    if let Ok(p) = path_resolver.download_dir() {
        roots.push(p);
    }
    if let Ok(p) = path_resolver.home_dir() {
        roots.push(p);
    }

    if roots.is_empty() {
        return Err(AppError::Internal(
            "Could not resolve any allowed root directories".to_string(),
        ));
    }

    Ok(fs_svc::AllowedRoots::new(roots))
}

// ── Payload types ─────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct StatRequest {
    pub path: String,
}

#[derive(Debug, Deserialize)]
pub struct ListDirRequest {
    pub path: String,
}

#[derive(Debug, Deserialize)]
pub struct ReadTextRequest {
    pub path: String,
}

#[derive(Debug, Serialize)]
pub struct ReadTextResponse {
    pub path:       String,
    pub content:    String,
    pub size_bytes: u64,
}

#[derive(Debug, Deserialize)]
pub struct WriteTextRequest {
    pub path:        String,
    pub content:     String,
    pub create_dirs: Option<bool>,
    pub unique:      Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct WriteTextResponse {
    pub path:          String,
    pub bytes_written: usize,
}

#[derive(Debug, Deserialize)]
pub struct ReadBytesRequest {
    pub path: String,
}

#[derive(Debug, Serialize)]
pub struct ReadBytesResponse {
    /// Base64-encoded file contents.
    pub path:    String,
    pub data_b64: String,
    pub size_bytes: u64,
}

#[derive(Debug, Deserialize)]
pub struct WriteBytesRequest {
    pub path:        String,
    /// Base64-encoded bytes to write.
    pub data_b64:    String,
    pub create_dirs: Option<bool>,
    pub unique:      Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct WriteBytesResponse {
    pub path:          String,
    pub bytes_written: usize,
}

#[derive(Debug, Deserialize)]
pub struct CopyRequest {
    pub src:         String,
    pub dst:         String,
    pub create_dirs: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct CopyResponse {
    pub src:          String,
    pub dst:          String,
    pub bytes_copied: u64,
}

#[derive(Debug, Deserialize)]
pub struct DeleteRequest {
    pub path: String,
}

#[derive(Debug, Deserialize)]
pub struct ExportCsvRequest {
    pub path:        String,
    pub headers:     Vec<String>,
    pub rows:        Vec<Vec<String>>,
    pub create_dirs: Option<bool>,
    pub unique:      Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ExportJsonRequest {
    pub path:        String,
    /// Pre-serialised JSON string from the frontend.
    pub json:        String,
    pub create_dirs: Option<bool>,
    pub unique:      Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct SavePdfRequest {
    pub path:        String,
    /// Base64-encoded PDF bytes generated on the frontend.
    pub data_b64:    String,
    pub create_dirs: Option<bool>,
    pub unique:      Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct SavePdfResponse {
    pub path:          String,
    pub bytes_written: usize,
}

#[derive(Debug, Deserialize)]
pub struct DialogOpenRequest {
    pub title:       Option<String>,
    pub default_path: Option<String>,
    pub multiple:    Option<bool>,
    pub directory:   Option<bool>,
    pub filters:     Option<Vec<fs_svc::DialogFilter>>,
}

#[derive(Debug, Serialize)]
pub struct DialogOpenResponse {
    /// Null when the user cancelled.
    pub paths: Option<Vec<String>>,
    pub cancelled: bool,
}

#[derive(Debug, Deserialize)]
pub struct DialogSaveRequest {
    pub title:        Option<String>,
    pub default_path: Option<String>,
    pub filters:      Option<Vec<fs_svc::DialogFilter>>,
}

#[derive(Debug, Serialize)]
pub struct DialogSaveResponse {
    /// Null when the user cancelled.
    pub path:      Option<String>,
    pub cancelled: bool,
}

#[derive(Debug, Serialize)]
pub struct AllowedRootsResponse {
    pub roots: Vec<String>,
}

// ── Commands ──────────────────────────────────────────────────────────────────

/// Stat a path — existence, type, size, modified time.
/// Never throws NOT_FOUND; returns { exists: false } instead.
#[tauri::command]
pub async fn fs_stat(
    app: tauri::AppHandle,
    payload: StatRequest,
) -> AppResult<IpcResponse<fs_svc::FileInfo>> {
    let roots = allowed_roots(&app)?;
    let path = roots.guard(&payload.path)?;
    Ok(IpcResponse::ok(fs_svc::stat(&path)))
}

/// List directory contents (one level deep).
#[tauri::command]
pub async fn fs_list_dir(
    app: tauri::AppHandle,
    payload: ListDirRequest,
) -> AppResult<IpcResponse<Vec<fs_svc::DirEntry>>> {
    let roots = allowed_roots(&app)?;
    let path = roots.guard(&payload.path)?;
    let entries = fs_svc::list_dir(&path)?;
    Ok(IpcResponse::ok(entries))
}

/// Read UTF-8 text from a file.
#[tauri::command]
pub async fn fs_read_text(
    app: tauri::AppHandle,
    payload: ReadTextRequest,
) -> AppResult<IpcResponse<ReadTextResponse>> {
    let roots = allowed_roots(&app)?;
    let path = roots.guard(&payload.path)?;
    let (content, size_bytes) = fs_svc::read_text(&path)?;
    Ok(IpcResponse::ok(ReadTextResponse {
        path: path.to_string_lossy().to_string(),
        content,
        size_bytes,
    }))
}

/// Write UTF-8 text to a file.
/// Set `unique: true` to auto-suffix the filename if it already exists.
#[tauri::command]
pub async fn fs_write_text(
    app: tauri::AppHandle,
    payload: WriteTextRequest,
) -> AppResult<IpcResponse<WriteTextResponse>> {
    let roots = allowed_roots(&app)?;
    let mut path = roots.guard(&payload.path)?;

    if payload.unique.unwrap_or(false) {
        path = fs_svc::unique_path(&path);
    }

    let bytes = fs_svc::write_text(&path, &payload.content, payload.create_dirs.unwrap_or(false))?;
    Ok(IpcResponse::ok(WriteTextResponse {
        path: path.to_string_lossy().to_string(),
        bytes_written: bytes,
    }))
}

/// Read raw bytes from a file, returned as a base64 string.
/// Use for importing binary files (images, PDFs, etc.).
#[tauri::command]
pub async fn fs_read_bytes(
    app: tauri::AppHandle,
    payload: ReadBytesRequest,
) -> AppResult<IpcResponse<ReadBytesResponse>> {
    let roots = allowed_roots(&app)?;
    let path = roots.guard(&payload.path)?;
    let data = fs_svc::read_bytes(&path)?;
    let size_bytes = data.len() as u64;
    let data_b64 = B64.encode(&data);
    Ok(IpcResponse::ok(ReadBytesResponse {
        path: path.to_string_lossy().to_string(),
        data_b64,
        size_bytes,
    }))
}

/// Write raw bytes (supplied as base64) to a file.
/// Use for downloading binary files.
#[tauri::command]
pub async fn fs_write_bytes(
    app: tauri::AppHandle,
    payload: WriteBytesRequest,
) -> AppResult<IpcResponse<WriteBytesResponse>> {
    let roots = allowed_roots(&app)?;
    let mut path = roots.guard(&payload.path)?;

    if payload.unique.unwrap_or(false) {
        path = fs_svc::unique_path(&path);
    }

    let data = B64.decode(&payload.data_b64).map_err(|e| {
        AppError::Validation(format!("Invalid base64 data: {}", e))
    })?;

    let bytes = fs_svc::write_bytes(&path, &data, payload.create_dirs.unwrap_or(false))?;
    Ok(IpcResponse::ok(WriteBytesResponse {
        path: path.to_string_lossy().to_string(),
        bytes_written: bytes,
    }))
}

/// Copy a file from src to dst.
#[tauri::command]
pub async fn fs_copy(
    app: tauri::AppHandle,
    payload: CopyRequest,
) -> AppResult<IpcResponse<CopyResponse>> {
    let roots = allowed_roots(&app)?;
    let src = roots.guard(&payload.src)?;
    let dst = roots.guard(&payload.dst)?;
    let bytes_copied = fs_svc::copy_file(&src, &dst, payload.create_dirs.unwrap_or(false))?;
    Ok(IpcResponse::ok(CopyResponse {
        src: src.to_string_lossy().to_string(),
        dst: dst.to_string_lossy().to_string(),
        bytes_copied,
    }))
}

/// Delete a file or directory.
#[tauri::command]
pub async fn fs_delete(
    app: tauri::AppHandle,
    payload: DeleteRequest,
) -> AppResult<IpcResponse<bool>> {
    let roots = allowed_roots(&app)?;
    let path = roots.guard(&payload.path)?;
    fs_svc::delete_file(&path)?;
    Ok(IpcResponse::ok(true))
}

/// Export data as a CSV file.
/// `headers` and `rows` are plain string arrays — no serialisation needed.
#[tauri::command]
pub async fn fs_export_csv(
    app: tauri::AppHandle,
    payload: ExportCsvRequest,
) -> AppResult<IpcResponse<WriteTextResponse>> {
    let roots = allowed_roots(&app)?;
    let mut path = roots.guard(&payload.path)?;

    fs_svc::guard_extension(&path, &["csv"])?;

    if payload.unique.unwrap_or(true) {
        path = fs_svc::unique_path(&path);
    }

    let header_refs: Vec<&str> = payload.headers.iter().map(|s| s.as_str()).collect();
    let csv = fs_svc::rows_to_csv(&header_refs, &payload.rows);
    let bytes = fs_svc::write_text(&path, &csv, payload.create_dirs.unwrap_or(true))?;

    Ok(IpcResponse::ok(WriteTextResponse {
        path: path.to_string_lossy().to_string(),
        bytes_written: bytes,
    }))
}

/// Export data as a JSON file.
/// `json` is a pre-serialised JSON string from the frontend.
#[tauri::command]
pub async fn fs_export_json(
    app: tauri::AppHandle,
    payload: ExportJsonRequest,
) -> AppResult<IpcResponse<WriteTextResponse>> {
    let roots = allowed_roots(&app)?;
    let mut path = roots.guard(&payload.path)?;

    fs_svc::guard_extension(&path, &["json"])?;

    // Validate that the string is actually valid JSON before writing.
    serde_json::from_str::<serde_json::Value>(&payload.json)
        .map_err(|e| AppError::Validation(format!("Invalid JSON: {}", e)))?;

    if payload.unique.unwrap_or(true) {
        path = fs_svc::unique_path(&path);
    }

    let bytes = fs_svc::write_text(&path, &payload.json, payload.create_dirs.unwrap_or(true))?;

    Ok(IpcResponse::ok(WriteTextResponse {
        path: path.to_string_lossy().to_string(),
        bytes_written: bytes,
    }))
}

/// Save a PDF file from base64-encoded bytes.
/// Typically called after the frontend renders a PDF with a library like jsPDF.
#[tauri::command]
pub async fn fs_save_pdf(
    app: tauri::AppHandle,
    payload: SavePdfRequest,
) -> AppResult<IpcResponse<SavePdfResponse>> {
    let roots = allowed_roots(&app)?;
    let mut path = roots.guard(&payload.path)?;

    fs_svc::guard_extension(&path, &["pdf"])?;

    if payload.unique.unwrap_or(true) {
        path = fs_svc::unique_path(&path);
    }

    let data = B64.decode(&payload.data_b64).map_err(|e| {
        AppError::Validation(format!("Invalid base64 PDF data: {}", e))
    })?;

    // Validate PDF magic bytes (%PDF-)
    if data.len() < 5 || &data[..5] != b"%PDF-" {
        return Err(AppError::Validation(
            "Data does not appear to be a valid PDF (missing %PDF- header)".to_string(),
        ));
    }

    let bytes = fs_svc::write_bytes(&path, &data, payload.create_dirs.unwrap_or(true))?;

    Ok(IpcResponse::ok(SavePdfResponse {
        path: path.to_string_lossy().to_string(),
        bytes_written: bytes,
    }))
}

/// Show a native file-open dialog.
/// Returns the selected path(s), or `cancelled: true` if the user dismissed.
#[tauri::command]
pub async fn fs_dialog_open(
    app: tauri::AppHandle,
    payload: DialogOpenRequest,
) -> AppResult<IpcResponse<DialogOpenResponse>> {
    use tauri_plugin_dialog::DialogExt;

    let mut builder = app.dialog().file();

    if let Some(title) = &payload.title {
        builder = builder.set_title(title);
    }
    if let Some(default_path) = &payload.default_path {
        builder = builder.set_directory(default_path);
    }
    if let Some(filters) = &payload.filters {
        for f in filters {
            let exts: Vec<&str> = f.extensions.iter().map(|s| s.as_str()).collect();
            builder = builder.add_filter(&f.name, &exts);
        }
    }

    if payload.directory.unwrap_or(false) {
        // Pick a directory.
        let result = builder.blocking_pick_folder();
        let response = match result {
            Some(fp) => DialogOpenResponse {
                paths: Some(vec![file_path_to_string(fp)]),
                cancelled: false,
            },
            None => DialogOpenResponse { paths: None, cancelled: true },
        };
        return Ok(IpcResponse::ok(response));
    }

    if payload.multiple.unwrap_or(false) {
        let result = builder.blocking_pick_files();
        let response = match result {
            Some(fps) => DialogOpenResponse {
                paths: Some(fps.into_iter().map(file_path_to_string).collect()),
                cancelled: false,
            },
            None => DialogOpenResponse { paths: None, cancelled: true },
        };
        return Ok(IpcResponse::ok(response));
    }

    // Single file.
    let result = builder.blocking_pick_file();
    let response = match result {
        Some(fp) => DialogOpenResponse {
            paths: Some(vec![file_path_to_string(fp)]),
            cancelled: false,
        },
        None => DialogOpenResponse { paths: None, cancelled: true },
    };
    Ok(IpcResponse::ok(response))
}

/// Show a native file-save dialog.
/// Returns the chosen path, or `cancelled: true` if the user dismissed.
#[tauri::command]
pub async fn fs_dialog_save(
    app: tauri::AppHandle,
    payload: DialogSaveRequest,
) -> AppResult<IpcResponse<DialogSaveResponse>> {
    use tauri_plugin_dialog::DialogExt;

    let mut builder = app.dialog().file();

    if let Some(title) = &payload.title {
        builder = builder.set_title(title);
    }
    if let Some(default_path) = &payload.default_path {
        // Split into directory + filename for the dialog API.
        let p = std::path::Path::new(default_path);
        if let Some(parent) = p.parent() {
            builder = builder.set_directory(parent);
        }
        if let Some(name) = p.file_name() {
            builder = builder.set_file_name(name.to_string_lossy().as_ref());
        }
    }
    if let Some(filters) = &payload.filters {
        for f in filters {
            let exts: Vec<&str> = f.extensions.iter().map(|s| s.as_str()).collect();
            builder = builder.add_filter(&f.name, &exts);
        }
    }

    let result = builder.blocking_save_file();
    let response = match result {
        Some(fp) => DialogSaveResponse {
            path: Some(file_path_to_string(fp)),
            cancelled: false,
        },
        None => DialogSaveResponse { path: None, cancelled: true },
    };
    Ok(IpcResponse::ok(response))
}

/// Return the list of allowed root directories so the frontend can build
/// default paths without hard-coding OS-specific locations.
#[tauri::command]
pub async fn fs_get_allowed_roots(
    app: tauri::AppHandle,
) -> AppResult<IpcResponse<AllowedRootsResponse>> {
    let roots = allowed_roots(&app)?;
    Ok(IpcResponse::ok(AllowedRootsResponse {
        roots: roots.roots.iter().map(|p| p.to_string_lossy().to_string()).collect(),
    }))
}

// ── Private helpers ───────────────────────────────────────────────────────────

fn file_path_to_string(fp: tauri_plugin_dialog::FilePath) -> String {
    match fp {
        tauri_plugin_dialog::FilePath::Path(p) => p.to_string_lossy().to_string(),
        tauri_plugin_dialog::FilePath::Url(u)  => u.to_string(),
    }
}
