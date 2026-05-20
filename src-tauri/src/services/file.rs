// services/file.rs
// Business logic for file system operations.
// Called by commands/file.rs — no Tauri types here.

use std::path::{Path, PathBuf};
use crate::error::{AppError, AppResult};

/// Resolve and validate a path — must be absolute.
pub fn resolve_path(raw: &str) -> AppResult<PathBuf> {
    let path = PathBuf::from(raw);
    if !path.is_absolute() {
        return Err(AppError::Validation(format!(
            "Path must be absolute, got: {}",
            raw
        )));
    }
    Ok(path)
}

/// Write UTF-8 content to a file, optionally creating parent dirs.
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

/// Read UTF-8 content from a file.
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

/// Check whether a path exists and return its type.
#[derive(Debug, serde::Serialize)]
pub struct PathInfo {
    pub exists: bool,
    pub is_file: bool,
    pub is_dir: bool,
    pub size_bytes: Option<u64>,
}

pub fn stat_path(path: &Path) -> PathInfo {
    if !path.exists() {
        return PathInfo { exists: false, is_file: false, is_dir: false, size_bytes: None };
    }
    let meta = std::fs::metadata(path).ok();
    PathInfo {
        exists: true,
        is_file: path.is_file(),
        is_dir: path.is_dir(),
        size_bytes: meta.map(|m| m.len()),
    }
}
