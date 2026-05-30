// db/mod.rs
// SQLite database layer.
//
// Modules:
//   connection  — r2d2 pool initialisation and accessor
//   migrations  — versioned migration runner
//   helpers     — reusable query utilities (pagination, exists, count)
//
// The pool lives in AppState and is injected into every command that
// needs DB access via:
//   state: tauri::State<'_, AppState>
//   let conn = state.db.get()?;

pub mod connection;
pub mod helpers;
pub mod migrations;

// Re-export the pool type so callers don't need to import r2d2 directly.
pub use connection::DbPool;
