// state.rs
// Shared application state managed by Tauri's state system.
//
// AppState is initialised once in lib.rs and injected into any command
// that declares `state: tauri::State<'_, AppState>`.

use std::sync::Arc;
use tokio::sync::RwLock;
use crate::auth::session::Session;
use crate::db::DbPool;

/// Runtime configuration that can be updated without restarting.
#[derive(Debug, Clone)]
pub struct RuntimeConfig {
    pub app_name: String,
    pub version:  String,
    pub debug:    bool,
}

impl Default for RuntimeConfig {
    fn default() -> Self {
        Self {
            app_name: env!("CARGO_PKG_NAME").to_string(),
            version:  env!("CARGO_PKG_VERSION").to_string(),
            debug:    cfg!(debug_assertions),
        }
    }
}

/// Top-level shared state injected into Tauri commands.
pub struct AppState {
    /// Runtime configuration — readable from any command.
    pub config: Arc<RwLock<RuntimeConfig>>,
    /// SQLite connection pool — borrow with state.db.get().
    pub db: DbPool,
    /// In-memory authentication session.
    pub session: Session,
}

impl AppState {
    pub fn new(db: DbPool) -> Self {
        Self {
            config:  Arc::new(RwLock::new(RuntimeConfig::default())),
            db,
            session: Session::new(),
        }
    }
}
