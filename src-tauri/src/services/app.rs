// services/app.rs
// Business logic for app-level operations.
// Called by commands/app.rs — no Tauri types here.

use crate::error::AppResult;

/// Returns a formatted build stamp string.
pub fn build_stamp() -> String {
    format!(
        "{} v{} ({})",
        env!("CARGO_PKG_NAME"),
        env!("CARGO_PKG_VERSION"),
        if cfg!(debug_assertions) { "debug" } else { "release" }
    )
}

/// Validates a ping message and returns the echo string.
/// Enforces a max length so the frontend can't send arbitrarily large payloads.
pub fn process_ping(message: &str) -> AppResult<String> {
    use crate::validation;
    validation::require_non_empty(message, "message")?;
    validation::require_max_len(message, 256, "message")?;
    Ok(message.to_string())
}
