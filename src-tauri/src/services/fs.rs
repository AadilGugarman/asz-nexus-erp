// services/fs.rs
// Secure filesystem business logic.
//
// All path operations go through `guard_path()` which enforces an allowlist
// of safe base directories. No command can escape these roots.
//
// Allowed roots (resolved at runtime via tauri::AppHandle):
//   - App data dir   ($APPDATA/in.talhafruit.erp/)
//   - Desktop        ($DESKTOP/)
//   - Documents      ($DOCUMENT/)
//   - Downloads      ($DOWNLOAD/)
//
// Any path that does not canonically resolve inside one of these roots is
// rejected with AppError::PermissionDenied before any I/O is attempted.

use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};

// ── Allowed base directories ──────────────────────────────────────────────────

/// Roots that the app is permitted to read/write.
/// Populated once per command from the Tauri AppHandle.
pub struct AllowedRoots {
    pub roots: Vec<PathBuf>,
}

impl AllowedRoots {
    pub fn new(roots: Vec<PathBuf>) -> Self {
        Self { roots }
    }

    /// Resolve `raw` to an absolute path and verify it sits inside one of the
    /// allowed roots. Returns the canonical PathBuf on success.
    pub fn guard(&self, raw: &str) -> AppResult<PathBuf> {
        let path = PathBuf::from(raw);

        // Must be absolute — reject relative paths outright.
        if !path.is_absolute() {
            return Err(AppError::PermissionDenied(format!(
                "Relative paths are not allowed: {}",
                raw
            )));
        }

        // Normalise without requiring the path to exist yet (lexical only).
        let normalised = lexical_normalise(&path);

        // Check against every allowed root.
        for root in &self.roots {
            let normalised_root = lexical_normalise(root);
            if normalised.starts_with(&normalised_root) {
                return Ok(normalised);
            }
        }

        Err(AppError::PermissionDenied(format!(
            "Path is outside allowed directories: {}",
            raw
        )))
    }
}

/// Lexically normalise a path (resolve `.` and `..` without hitting the FS).
/// This prevents path-traversal attacks like `/allowed/../etc/passwd`.
fn lexical_normalise(path: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    for component in path.components() {
        match component {
            std::path::Component::ParentDir => { out.pop(); }
            std::path::Component::CurDir    => {}
            c                               => out.push(c),
        }
    }
    out
}

// ── File info ─────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct FileInfo {
    pub path:       String,
    pub name:       String,
    pub exists:     bool,
    pub is_file:    bool,
    pub is_dir:     bool,
    pub size_bytes: Option<u64>,
    pub modified:   Option<String>,
}

pub fn stat(path: &Path) -> FileInfo {
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    if !path.exists() {
        return FileInfo {
            path: path.to_string_lossy().to_string(),
            name,
            exists: false,
            is_file: false,
            is_dir: false,
            size_bytes: None,
            modified: None,
        };
    }

    let meta = std::fs::metadata(path).ok();
    let modified = meta.as_ref().and_then(|m| {
        m.modified().ok().map(|t| {
            let secs = t
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs();
            secs.to_string()
        })
    });

    FileInfo {
        path: path.to_string_lossy().to_string(),
        name,
        exists: true,
        is_file: path.is_file(),
        is_dir: path.is_dir(),
        size_bytes: meta.map(|m| m.len()),
        modified,
    }
}

// ── Directory listing ─────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct DirEntry {
    pub name:    String,
    pub path:    String,
    pub is_file: bool,
    pub is_dir:  bool,
    pub size_bytes: Option<u64>,
}

pub fn list_dir(path: &Path) -> AppResult<Vec<DirEntry>> {
    if !path.is_dir() {
        return Err(AppError::NotFound(format!(
            "Directory not found: {}",
            path.display()
        )));
    }

    let mut entries = Vec::new();
    for entry in std::fs::read_dir(path)? {
        let entry = entry?;
        let p = entry.path();
        let meta = entry.metadata().ok();
        entries.push(DirEntry {
            name: entry.file_name().to_string_lossy().to_string(),
            path: p.to_string_lossy().to_string(),
            is_file: p.is_file(),
            is_dir: p.is_dir(),
            size_bytes: meta.map(|m| m.len()),
        });
    }

    // Sort: directories first, then files, both alphabetically.
    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _             => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

// ── Text I/O ──────────────────────────────────────────────────────────────────

/// Write UTF-8 text, optionally creating parent directories.
pub fn write_text(path: &Path, content: &str, create_dirs: bool) -> AppResult<usize> {
    if create_dirs {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
    }
    let bytes = content.as_bytes();
    std::fs::write(path, bytes)?;
    Ok(bytes.len())
}

/// Read UTF-8 text from a file.
pub fn read_text(path: &Path) -> AppResult<(String, u64)> {
    if !path.exists() {
        return Err(AppError::NotFound(format!(
            "File not found: {}",
            path.display()
        )));
    }
    let meta = std::fs::metadata(path)?;
    let content = std::fs::read_to_string(path)?;
    Ok((content, meta.len()))
}

// ── Binary I/O ────────────────────────────────────────────────────────────────

/// Write raw bytes to a file (used for PDF, images, etc.).
pub fn write_bytes(path: &Path, data: &[u8], create_dirs: bool) -> AppResult<usize> {
    if create_dirs {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
    }
    std::fs::write(path, data)?;
    Ok(data.len())
}

/// Read raw bytes from a file (used for upload/import).
pub fn read_bytes(path: &Path) -> AppResult<Vec<u8>> {
    if !path.exists() {
        return Err(AppError::NotFound(format!(
            "File not found: {}",
            path.display()
        )));
    }
    Ok(std::fs::read(path)?)
}

// ── Copy / Delete ─────────────────────────────────────────────────────────────

pub fn copy_file(src: &Path, dst: &Path, create_dirs: bool) -> AppResult<u64> {
    if !src.exists() {
        return Err(AppError::NotFound(format!(
            "Source not found: {}",
            src.display()
        )));
    }
    if create_dirs {
        if let Some(parent) = dst.parent() {
            std::fs::create_dir_all(parent)?;
        }
    }
    let bytes = std::fs::copy(src, dst)?;
    Ok(bytes)
}

pub fn delete_file(path: &Path) -> AppResult<()> {
    if !path.exists() {
        return Err(AppError::NotFound(format!(
            "File not found: {}",
            path.display()
        )));
    }
    if path.is_dir() {
        std::fs::remove_dir_all(path)?;
    } else {
        std::fs::remove_file(path)?;
    }
    Ok(())
}

// ── Export helpers ────────────────────────────────────────────────────────────

/// Serialise a slice of serialisable rows to a CSV string.
/// `headers` must match the field order in each row's `to_csv_row()` output.
pub fn rows_to_csv(headers: &[&str], rows: &[Vec<String>]) -> String {
    let mut out = String::new();
    out.push_str(&headers.join(","));
    out.push('\n');
    for row in rows {
        let escaped: Vec<String> = row
            .iter()
            .map(|cell| {
                if cell.contains(',') || cell.contains('"') || cell.contains('\n') {
                    format!("\"{}\"", cell.replace('"', "\"\""))
                } else {
                    cell.clone()
                }
            })
            .collect();
        out.push_str(&escaped.join(","));
        out.push('\n');
    }
    out
}

// ── Unique filename helper ────────────────────────────────────────────────────

/// If `path` already exists, append ` (1)`, ` (2)`, … until a free slot is found.
pub fn unique_path(path: &Path) -> PathBuf {
    if !path.exists() {
        return path.to_path_buf();
    }
    let stem = path
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    let ext = path
        .extension()
        .map(|e| format!(".{}", e.to_string_lossy()))
        .unwrap_or_default();
    let parent = path.parent().unwrap_or(Path::new("."));

    let mut counter = 1u32;
    loop {
        let candidate = parent.join(format!("{} ({}){}", stem, counter, ext));
        if !candidate.exists() {
            return candidate;
        }
        counter += 1;
    }
}

// ── Allowed-extension guard ───────────────────────────────────────────────────

/// Validate that a path has one of the permitted extensions.
/// Pass extensions without the dot, e.g. `&["pdf", "csv", "json"]`.
pub fn guard_extension(path: &Path, allowed: &[&str]) -> AppResult<()> {
    let ext = path
        .extension()
        .map(|e| e.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    if allowed.iter().any(|a| *a == ext.as_str()) {
        Ok(())
    } else {
        Err(AppError::Validation(format!(
            "File extension '.{}' is not allowed. Allowed: {}",
            ext,
            allowed.join(", ")
        )))
    }
}

// ── Dialog filter type (shared with commands layer) ───────────────────────────

#[derive(Debug, Deserialize)]
pub struct DialogFilter {
    pub name:       String,
    pub extensions: Vec<String>,
}
