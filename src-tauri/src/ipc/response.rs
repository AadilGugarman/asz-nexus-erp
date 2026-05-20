// ipc/response.rs
// Typed response envelope for all Tauri commands.
// err_detail is scaffolded for future use.
#![allow(dead_code)]

use serde::Serialize;

/// Standard response envelope.
/// `data` is present on success; `error` is present on failure.
#[derive(Debug, Serialize)]
pub struct IpcResponse<T: Serialize> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<IpcErrorPayload>,
}

/// Structured error payload inside the envelope.
#[derive(Debug, Serialize)]
pub struct IpcErrorPayload {
    pub code: String,
    pub message: String,
    pub details: Option<String>,
}

impl<T: Serialize> IpcResponse<T> {
    /// Successful response with data.
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    /// Error response — no data.
    pub fn err(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(IpcErrorPayload {
                code: code.into(),
                message: message.into(),
                details: None,
            }),
        }
    }

    /// Error response with extra detail string.
    pub fn err_detail(
        code: impl Into<String>,
        message: impl Into<String>,
        details: impl Into<String>,
    ) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(IpcErrorPayload {
                code: code.into(),
                message: message.into(),
                details: Some(details.into()),
            }),
        }
    }
}

/// Allow converting AppError directly into an IpcResponse.
impl<T: Serialize> From<crate::error::AppError> for IpcResponse<T> {
    fn from(err: crate::error::AppError) -> Self {
        Self::err(err.code(), err.to_string())
    }
}
