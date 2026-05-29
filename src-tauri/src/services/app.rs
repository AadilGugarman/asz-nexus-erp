// services/app.rs
// Business logic for app-level operations.
// Called by commands/app.rs — no Tauri types here.

// use crate::error::AppResult;

/// Returns a formatted build stamp string.
pub fn build_stamp() -> String {
    format!(
        "{} v{} ({})",
        env!("CARGO_PKG_NAME"),
        env!("CARGO_PKG_VERSION"),
        if cfg!(debug_assertions) { "debug" } else { "release" }
    )
}
