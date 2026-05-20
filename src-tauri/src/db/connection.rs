// db/connection.rs
// r2d2 connection pool for SQLite.
//
// One pool is created at startup and stored in AppState.
// Commands borrow a connection with state.db.get()? — the borrow is
// returned to the pool automatically when the guard drops.
//
// Pool configuration:
//   max_size = 4   — SQLite is single-writer; 4 readers is plenty
//   WAL mode       — enables concurrent reads while a write is in progress
//   foreign_keys   — enforced at connection open time
//   mmap_size      — memory-mapped I/O for faster sequential reads
//   cache_size     — 16 MB page cache per connection
//   synchronous    — NORMAL is safe with WAL and much faster than FULL

use std::path::Path;
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::OpenFlags;
use crate::error::{AppError, AppResult};

/// Shared connection pool type — stored in AppState.
pub type DbPool = Pool<SqliteConnectionManager>;

/// A single pooled connection — obtained with pool.get().
pub type DbConn = r2d2::PooledConnection<SqliteConnectionManager>;

/// Initialise the connection pool.
///
/// `db_path` — absolute path to the SQLite file.
/// The file and its parent directories are created if they don't exist.
pub fn init_pool(db_path: &Path) -> AppResult<DbPool> {
    // Ensure parent directory exists
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let manager = SqliteConnectionManager::file(db_path)
        .with_flags(
            OpenFlags::SQLITE_OPEN_READ_WRITE
                | OpenFlags::SQLITE_OPEN_CREATE
                | OpenFlags::SQLITE_OPEN_URI,
        )
        .with_init(|conn| {
            conn.execute_batch("
                -- WAL mode: concurrent reads during writes, no read-write contention
                PRAGMA journal_mode = WAL;

                -- NORMAL sync is safe with WAL and ~3x faster than FULL
                PRAGMA synchronous = NORMAL;

                -- 16 MB page cache per connection (default is ~2 MB)
                PRAGMA cache_size = -16384;

                -- 256 MB memory-mapped I/O — sequential reads bypass syscalls
                PRAGMA mmap_size = 268435456;

                -- 64 KB page size for large sequential reads (invoices, reports)
                -- Note: only effective on a new database; ignored if DB already exists
                PRAGMA page_size = 65536;

                -- Enforce foreign key constraints
                PRAGMA foreign_keys = ON;

                -- 5 s busy timeout so writers don't immediately fail under contention
                PRAGMA busy_timeout = 5000;

                -- Keep temp tables in memory
                PRAGMA temp_store = MEMORY;

                -- WAL auto-checkpoint at 1000 pages (~64 MB with 64K pages)
                PRAGMA wal_autocheckpoint = 1000;
            ")?;
            Ok(())
        });

    let pool = Pool::builder()
        // 1 writer + 3 readers is optimal for SQLite WAL mode
        .max_size(4)
        // Keep at least 1 connection warm to avoid cold-start latency
        .min_idle(Some(1))
        // Connections idle for > 10 min are recycled
        .idle_timeout(Some(std::time::Duration::from_secs(600)))
        // Connection acquisition timeout
        .connection_timeout(std::time::Duration::from_secs(10))
        .build(manager)
        .map_err(|e| AppError::Database(format!("Failed to create pool: {e}")))?;

    Ok(pool)
}

/// Convenience: borrow a connection from the pool, mapping the error.
pub fn get_conn(pool: &DbPool) -> AppResult<DbConn> {
    pool.get()
        .map_err(|e| AppError::Database(format!("Failed to get connection: {e}")))
}
