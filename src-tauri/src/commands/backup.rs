// commands/backup.rs
// Production-grade SQLite backup & restore commands.
//
// Strategy:
//   Backup  — VACUUM INTO for atomic, consistent snapshots (WAL-safe)
//   Restore — rusqlite backup API for in-place restore without pool teardown
//   Safety  — pre-restore rollback snapshot + post-restore integrity check
//   Pruning — configurable retention applied on every create
//
// All backup files live in {app_data_dir}/backups/*.db
// Filename format: backup_{Label}_{YYYYMMDD_HHMMSS_mmm}.db

use std::path::{Path, PathBuf};
use std::time::Duration;

use chrono::Utc;
use rusqlite::{backup as sqlite_backup, Connection, OpenFlags};
use serde::{Deserialize, Serialize};
use tauri::Manager;

use crate::db::connection::get_conn;
use crate::error::{AppError, AppResult};
use crate::ipc::IpcResponse;
use crate::state::AppState;

// ── Types ─────────────────────────────────────────────────────────────────────

/// Metadata returned to the frontend for each backup file.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BackupEntry {
    /// Unique ID — filename without the .db extension.
    pub id: String,
    /// Bare filename, e.g. "backup_Manual_20260521_143022_123.db".
    pub filename: String,
    /// Human-readable label: "Manual" | "Auto" | "PreRestore".
    pub label: String,
    /// Raw byte size of the backup file.
    pub size_bytes: u64,
    /// Human-readable size string, e.g. "2.4 MB".
    pub size_display: String,
    /// ISO-8601 UTC timestamp of when the file was last modified.
    pub created_at: String,
    /// Absolute path — internal use only; not shown in UI.
    pub path: String,
    /// Whether `PRAGMA quick_check` passed on this file.
    pub is_valid: bool,
}

/// Result returned to the frontend after a restore operation.
#[derive(Debug, Serialize)]
pub struct RestoreResult {
    /// True when the restore succeeded and the DB passed integrity checks.
    pub success: bool,
    /// Filename of the automatic pre-restore safety snapshot.
    pub rollback_filename: Option<String>,
    /// Human-readable status message.
    pub message: String,
}

// ── Private helpers ───────────────────────────────────────────────────────────

/// Returns (and creates) the backups directory: {app_data_dir}/backups/
fn backups_dir(app: &tauri::AppHandle) -> AppResult<PathBuf> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Internal(format!("Cannot resolve app data dir: {e}")))?
        .join("backups");

    std::fs::create_dir_all(&dir)
        .map_err(|e| AppError::Io(e))?;

    Ok(dir)
}

/// Returns the main database path: {app_data_dir}/tfc_erp.db
fn main_db_path(app: &tauri::AppHandle) -> AppResult<PathBuf> {
    app.path()
        .app_data_dir()
        .map(|d| d.join("tfc_erp.db"))
        .map_err(|e| AppError::Internal(format!("Cannot resolve app data dir: {e}")))
}

/// Format raw bytes into a compact, human-readable string.
fn fmt_size(bytes: u64) -> String {
    const KB: u64 = 1_024;
    const MB: u64 = 1_024 * KB;
    if bytes >= MB {
        format!("{:.2} MB", bytes as f64 / MB as f64)
    } else if bytes >= KB {
        format!("{:.1} KB", bytes as f64 / KB as f64)
    } else {
        format!("{} B", bytes)
    }
}

/// Run `PRAGMA quick_check` on a file without touching the main pool.
/// Returns `true` only when the check reports "ok".
fn validate_db_file(path: &Path) -> bool {
    Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .and_then(|conn| {
        conn.query_row("PRAGMA quick_check", [], |row| row.get::<_, String>(0))
    })
    .map(|result| result == "ok")
    .unwrap_or(false)
}

/// Build a `BackupEntry` from a filesystem path.
/// Returns `None` if the file cannot be read or is not a .db file.
fn entry_from_path(path: &Path) -> Option<BackupEntry> {
    if path.extension().and_then(|e| e.to_str()) != Some("db") {
        return None;
    }

    let filename = path.file_name()?.to_str()?.to_string();
    let meta = std::fs::metadata(path).ok()?;
    let size_bytes = meta.len();

    // Parse label from filename: backup_{Label}_{timestamp}.db
    let stem = path.file_stem()?.to_str()?;
    let label = stem
        .split('_')
        .nth(1)
        .unwrap_or("Unknown")
        .to_string();

    // Derive created_at from file modification time.
    let created_at = meta
        .modified()
        .ok()
        .and_then(|t| {
            t.duration_since(std::time::UNIX_EPOCH).ok().map(|d| {
                chrono::DateTime::<Utc>::from_timestamp(d.as_secs() as i64, 0)
                    .unwrap_or_else(Utc::now)
                    .to_rfc3339()
            })
        })
        .unwrap_or_else(|| Utc::now().to_rfc3339());

    let is_valid = validate_db_file(path);

    Some(BackupEntry {
        id: stem.to_string(),
        filename,
        label,
        size_bytes,
        size_display: fmt_size(size_bytes),
        created_at,
        path: path.to_string_lossy().into_owned(),
        is_valid,
    })
}

/// Restore a backup file into `dst_conn` using the SQLite online backup API.
/// Does NOT close the pool — safe for a single-user desktop app.
fn run_backup_api(src_path: &Path, dst: &mut Connection) -> AppResult<()> {
    let src = Connection::open_with_flags(
        src_path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .map_err(|e| AppError::Database(format!("Cannot open source db: {e}")))?;

    let progress = Some(|p: sqlite_backup::Progress| {
        log::debug!(
            "[backup] {} / {} pages copied",
            p.pagecount - p.remaining,
            p.pagecount
        );
    });

    sqlite_backup::Backup::new(&src, dst)
        .map_err(|e| AppError::Database(format!("Backup init error: {e}")))?
        .run_to_completion(256, Duration::from_millis(50), progress)
        .map_err(|e| AppError::Database(format!("Backup run error: {e}")))
}

// ── Public commands ───────────────────────────────────────────────────────────

/// Create a named backup snapshot of the live database.
///
/// Steps:
///   1. WAL checkpoint → flush WAL into the main file
///   2. VACUUM INTO → atomic, defragmented copy
///   3. integrity check → validate the new file
///   4. prune old backups if `retain` is supplied
///
/// Frontend: ipc.backup.create({ label?, retain? })
#[tauri::command]
pub async fn backup_create(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    label: Option<String>,
    retain: Option<u32>,
) -> AppResult<IpcResponse<BackupEntry>> {
    let label = label.unwrap_or_else(|| "Manual".to_string());

    // Reject labels that could escape the filename
    if label.contains(['/', '\\', ':', '*', '?', '"', '<', '>', '|']) {
        return Err(AppError::Validation("Backup label contains invalid characters".to_string()));
    }

    let dir = backups_dir(&app)?;
    let now = Utc::now();
    let ts = now.format("%Y%m%d_%H%M%S_%3f");
    let filename = format!("backup_{label}_{ts}.db");
    let backup_path = dir.join(&filename);

    // 1. WAL checkpoint
    {
        let conn = get_conn(&state.db)?;
        conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")?;
    }

    // 2. VACUUM INTO — atomic snapshot
    {
        let conn = get_conn(&state.db)?;
        // Normalise path separators for SQLite (uses forward slashes even on Windows)
        let path_str = backup_path.to_string_lossy().replace('\\', "/");
        conn.execute_batch(&format!("VACUUM INTO '{path_str}';"))?;
    }

    // 3. Validate
    if !validate_db_file(&backup_path) {
        let _ = std::fs::remove_file(&backup_path);
        return Err(AppError::Internal(
            "Backup validation failed immediately after creation".to_string(),
        ));
    }

    let meta = std::fs::metadata(&backup_path)?;
    let size_bytes = meta.len();

    let entry = BackupEntry {
        id: filename.trim_end_matches(".db").to_string(),
        filename: filename.clone(),
        label: label.clone(),
        size_bytes,
        size_display: fmt_size(size_bytes),
        created_at: now.to_rfc3339(),
        path: backup_path.to_string_lossy().into_owned(),
        is_valid: true,
    };

    log::info!("[backup] Created: {} ({})", entry.filename, entry.size_display);

    // 4. Optional pruning — apply AFTER we've confirmed the new backup is good
    if let Some(keep) = retain {
        if keep > 0 {
            prune_backups_internal(&dir, keep);
        }
    }

    Ok(IpcResponse::ok(entry))
}

/// List all backup files sorted newest-first.
///
/// Frontend: ipc.backup.list()
#[tauri::command]
pub async fn backup_list(
    app: tauri::AppHandle,
) -> AppResult<IpcResponse<Vec<BackupEntry>>> {
    let dir = backups_dir(&app)?;

    let mut entries: Vec<BackupEntry> = std::fs::read_dir(&dir)
        .map_err(|e| AppError::Io(e))?
        .filter_map(|res| res.ok())
        .filter_map(|e| entry_from_path(&e.path()))
        .collect();

    // Newest first
    entries.sort_by(|a, b| b.created_at.cmp(&a.created_at));

    Ok(IpcResponse::ok(entries))
}

/// Validate a single backup file and return whether it passes integrity check.
///
/// Frontend: ipc.backup.validate({ filename })
#[tauri::command]
pub async fn backup_validate(
    app: tauri::AppHandle,
    filename: String,
) -> AppResult<IpcResponse<bool>> {
    let filename = sanitize_filename(&filename)?;
    let dir = backups_dir(&app)?;
    let path = dir.join(&filename);

    if !path.exists() {
        return Err(AppError::NotFound(format!("Backup not found: {filename}")));
    }

    Ok(IpcResponse::ok(validate_db_file(&path)))
}

/// Delete a single backup file.
///
/// Frontend: ipc.backup.delete({ filename })
#[tauri::command]
pub async fn backup_delete(
    app: tauri::AppHandle,
    filename: String,
) -> AppResult<IpcResponse<()>> {
    let filename = sanitize_filename(&filename)?;
    let dir = backups_dir(&app)?;
    let path = dir.join(&filename);

    if !path.exists() {
        return Err(AppError::NotFound(format!("Backup not found: {filename}")));
    }

    std::fs::remove_file(&path)?;
    log::info!("[backup] Deleted: {filename}");
    Ok(IpcResponse::ok(()))
}

/// Restore the database from a backup file.
///
/// Safety flow:
///   1. Validate backup file integrity
///   2. WAL checkpoint on live DB
///   3. VACUUM INTO → safety rollback snapshot
///   4. rusqlite backup API → copy backup into live connection
///   5. quick_check on restored DB
///   6. On any failure → restore from rollback snapshot
///
/// Frontend: ipc.backup.restore({ filename })
#[tauri::command]
pub async fn backup_restore(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    filename: String,
) -> AppResult<IpcResponse<RestoreResult>> {
    let filename = sanitize_filename(&filename)?;
    let dir = backups_dir(&app)?;
    let backup_path = dir.join(&filename);

    if !backup_path.exists() {
        return Err(AppError::NotFound(format!("Backup not found: {filename}")));
    }

    // Step 1 — Validate backup integrity before doing anything destructive
    if !validate_db_file(&backup_path) {
        return Err(AppError::Validation(format!(
            "Backup file failed integrity check and cannot be restored: {filename}"
        )));
    }

    // Step 2 — WAL checkpoint + safety snapshot
    let rollback_filename = {
        let ts = Utc::now().format("%Y%m%d_%H%M%S_%3f");
        format!("backup_PreRestore_{ts}.db")
    };
    let rollback_path = dir.join(&rollback_filename);

    {
        let conn = get_conn(&state.db)?;
        conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")?;
        let rp = rollback_path.to_string_lossy().replace('\\', "/");
        conn.execute_batch(&format!("VACUUM INTO '{rp}';"))?;
    }

    log::info!("[backup] Pre-restore snapshot: {rollback_filename}");

    // Step 3 — Restore via online backup API
    let restore_outcome: AppResult<()> = {
        let mut dst_conn = get_conn(&state.db)?;
        run_backup_api(&backup_path, &mut *dst_conn)
    };

    match restore_outcome {
        Ok(()) => {
            // Step 4 — Post-restore integrity check
            let db_path = main_db_path(&app)?;
            if validate_db_file(&db_path) {
                log::info!("[backup] Restore successful from {filename}");
                Ok(IpcResponse::ok(RestoreResult {
                    success: true,
                    rollback_filename: Some(rollback_filename),
                    message: "Database restored successfully.".to_string(),
                }))
            } else {
                // Integrity check failed after restore — rollback
                log::error!("[backup] Integrity check failed after restore; rolling back");
                attempt_rollback(&state, &rollback_path);
                Err(AppError::Internal(
                    "Restore produced an invalid database; previous state has been recovered."
                        .to_string(),
                ))
            }
        }
        Err(e) => {
            log::error!("[backup] Restore operation failed: {e}; attempting rollback");
            attempt_rollback(&state, &rollback_path);
            Err(e)
        }
    }
}

/// Remove old backup files, keeping the `keep` newest.
/// PreRestore snapshots are counted separately and always kept at ≥1.
///
/// Frontend: ipc.backup.prune({ keep })
#[tauri::command]
pub async fn backup_prune(
    app: tauri::AppHandle,
    keep: u32,
) -> AppResult<IpcResponse<u32>> {
    if keep == 0 {
        return Err(AppError::Validation(
            "Retention must be at least 1".to_string(),
        ));
    }

    let dir = backups_dir(&app)?;
    let deleted = prune_backups_internal(&dir, keep);
    Ok(IpcResponse::ok(deleted))
}

/// Return the absolute path of the backups directory.
///
/// Frontend: ipc.backup.getDir()
#[tauri::command]
pub async fn backup_get_dir(
    app: tauri::AppHandle,
) -> AppResult<IpcResponse<String>> {
    let dir = backups_dir(&app)?;
    Ok(IpcResponse::ok(dir.to_string_lossy().into_owned()))
}

// ── Private helpers (sync) ────────────────────────────────────────────────────

/// Reject filenames that could cause path traversal.
fn sanitize_filename(name: &str) -> AppResult<String> {
    let clean = Path::new(name)
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| AppError::Validation("Invalid filename".to_string()))?
        .to_string();

    if !clean.ends_with(".db") {
        return Err(AppError::Validation(
            "Only .db backup files are accepted".to_string(),
        ));
    }

    Ok(clean)
}

/// Best-effort emergency rollback: copy `rollback_path` back into the live DB.
fn attempt_rollback(state: &AppState, rollback_path: &Path) {
    if !rollback_path.exists() {
        log::error!("[backup] Rollback file not found: {:?}", rollback_path);
        return;
    }

    match get_conn(&state.db) {
        Ok(mut dst) => {
            match run_backup_api(rollback_path, &mut *dst) {
                Ok(()) => log::info!("[backup] Emergency rollback succeeded"),
                Err(e) => log::error!("[backup] Emergency rollback failed: {e}"),
            }
        }
        Err(e) => log::error!("[backup] Cannot get connection for rollback: {e}"),
    }
}

/// Delete the oldest regular backups (not PreRestore) until `≤ keep` remain.
/// Returns how many files were deleted.
fn prune_backups_internal(dir: &Path, keep: u32) -> u32 {
    // Collect non-PreRestore entries sorted newest-first by mtime
    let mut entries: Vec<(PathBuf, std::time::SystemTime)> = match std::fs::read_dir(dir) {
        Ok(rd) => rd
            .filter_map(|e| e.ok())
            .filter(|e| {
                let name = e.file_name();
                let name = name.to_string_lossy();
                name.ends_with(".db") && !name.contains("PreRestore")
            })
            .filter_map(|e| {
                let path = e.path();
                let mtime = std::fs::metadata(&path).ok()?.modified().ok()?;
                Some((path, mtime))
            })
            .collect(),
        Err(e) => {
            log::warn!("[backup] Cannot read backups dir for pruning: {e}");
            return 0;
        }
    };

    entries.sort_by(|a, b| b.1.cmp(&a.1)); // newest first

    let mut deleted = 0u32;
    if entries.len() as u32 > keep {
        for (path, _) in entries.into_iter().skip(keep as usize) {
            match std::fs::remove_file(&path) {
                Ok(()) => {
                    log::info!("[backup] Pruned: {:?}", path.file_name());
                    deleted += 1;
                }
                Err(e) => log::warn!("[backup] Prune failed for {:?}: {e}", path),
            }
        }
    }

    deleted
}
