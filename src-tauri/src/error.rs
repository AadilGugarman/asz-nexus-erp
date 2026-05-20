// error.rs
// Centralised error type for the entire Tauri backend.
// PermissionDenied is scaffolded for future auth use.
#![allow(dead_code)]

use serde::Serialize;
use thiserror::Error;

/// All possible backend errors.
#[derive(Debug, Error)]
pub enum AppError {
    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Validation error: {0}")]
    Validation(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("Database error: {0}")]
    Database(String),

    #[error("Permission denied: {0}")]
    PermissionDenied(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

/// The wire format sent to the frontend on error.
/// Matches the TypeScript `IpcError` interface in src/ipc/types.ts.
#[derive(Debug, Serialize)]
pub struct SerializedError {
    pub code: &'static str,
    pub message: String,
    pub details: Option<String>,
}

impl AppError {
    /// Map each variant to a stable string code the frontend can switch on.
    pub fn code(&self) -> &'static str {
        match self {
            AppError::NotFound(_)        => "NOT_FOUND",
            AppError::Validation(_)      => "VALIDATION_ERROR",
            AppError::Io(_)              => "IO_ERROR",
            AppError::Serialization(_)   => "SERIALIZATION_ERROR",
            AppError::Database(_)        => "DATABASE_ERROR",
            AppError::PermissionDenied(_)=> "PERMISSION_DENIED",
            AppError::Internal(_)        => "INTERNAL_ERROR",
        }
    }
}

/// Tauri requires command errors to implement Serialize.
/// We serialise to SerializedError so the frontend gets structured data.
impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        SerializedError {
            code: self.code(),
            message: self.to_string(),
            details: None,
        }
        .serialize(serializer)
    }
}

/// Convenience alias used throughout command handlers.
pub type AppResult<T> = Result<T, AppError>;
