// db/migrations.rs
// Versioned migration runner.
//
// How it works:
//   1. On startup, ensures the `_migrations` tracking table exists.
//   2. Reads every migration in MIGRATIONS (ordered by version number).
//   3. Skips migrations already recorded in `_migrations`.
//   4. Runs pending migrations inside a single transaction — all-or-nothing.
//   5. Records each applied migration with a timestamp.
//
// Adding a new migration:
//   1. Create src/db/migrations/NNNN_description.sql
//   2. Add an entry to the MIGRATIONS slice below.
//   That's it — the runner handles the rest on next app launch.

use rusqlite::Connection;
use crate::error::{AppError, AppResult};

/// A single migration definition.
pub struct Migration {
    /// Monotonically increasing version number.
    pub version: i64,
    /// Human-readable description (stored in _migrations table).
    pub description: &'static str,
    /// Raw SQL — embedded at compile time via include_str!.
    pub sql: &'static str,
}

/// All migrations in version order.
/// NEVER reorder or remove entries — only append.
static MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        description: "initial schema",
        sql: include_str!("migrations/0001_initial.sql"),
    },
    Migration {
        version: 2,
        description: "add employee department",
        sql: include_str!("migrations/0002_employee_department.sql"),
    },
    Migration {
        version: 3,
        description: "erp core schema",
        sql: include_str!("migrations/0003_erp_schema.sql"),
    },
];

/// Run all pending migrations against an open connection.
/// Safe to call on every startup — already-applied migrations are skipped.
pub fn run(conn: &Connection) -> AppResult<()> {
    // Ensure the tracking table exists
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _migrations (
            version     INTEGER PRIMARY KEY,
            description TEXT    NOT NULL,
            applied_at  TEXT    NOT NULL DEFAULT (datetime('now'))
        );",
    )
    .map_err(|e| AppError::Database(format!("Failed to create _migrations table: {e}")))?;

    for migration in MIGRATIONS {
        let already_applied: bool = conn
            .query_row(
                "SELECT COUNT(*) FROM _migrations WHERE version = ?1",
                [migration.version],
                |row| row.get::<_, i64>(0),
            )
            .map(|count| count > 0)
            .map_err(|e| AppError::Database(format!("Migration check failed: {e}")))?;

        if already_applied {
            continue;
        }

        // Run the migration SQL + record it atomically
        conn.execute_batch("BEGIN;")
            .map_err(|e| AppError::Database(format!("BEGIN failed: {e}")))?;

        let result = (|| -> AppResult<()> {
            conn.execute_batch(migration.sql)
                .map_err(|e| AppError::Database(format!(
                    "Migration v{} '{}' failed: {e}",
                    migration.version, migration.description
                )))?;

            conn.execute(
                "INSERT INTO _migrations (version, description) VALUES (?1, ?2)",
                rusqlite::params![migration.version, migration.description],
            )
            .map_err(|e| AppError::Database(format!("Failed to record migration: {e}")))?;

            Ok(())
        })();

        match result {
            Ok(()) => {
                conn.execute_batch("COMMIT;")
                    .map_err(|e| AppError::Database(format!("COMMIT failed: {e}")))?;
                log::info!(
                    "[migrations] Applied v{}: {}",
                    migration.version,
                    migration.description
                );
            }
            Err(e) => {
                let _ = conn.execute_batch("ROLLBACK;");
                return Err(e);
            }
        }
    }

    Ok(())
}
