// auth/store.rs
// Secure credential persistence.
//
// Storage strategy for a Tauri desktop app:
//   - Credentials (password hash, refresh token jti, JWT secret) are stored
//     in a JSON file inside the app's data directory.
//   - The file is readable only by the OS user who owns the app data dir.
//   - On Windows this is %APPDATA%\asz-nexus-erp\, protected by NTFS ACLs.
//   - The JWT signing secret is a random 64-byte key generated once on first
//     run and stored alongside the credentials. It never leaves the machine.
//
// For higher security on supported platforms, this can be upgraded to use
// the OS keychain (Windows Credential Manager, macOS Keychain, libsecret)
// via the `keyring` crate — the interface here is designed to make that swap
// a one-file change.

use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};

// ── Stored credential record ──────────────────────────────────────────────────

/// Everything persisted to disk for auth.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AuthStore {
    /// Argon2id PHC hash of the user's PIN/password.
    pub password_hash: Option<String>,

    /// The currently valid refresh token string, persisted securely.
    pub refresh_token: Option<String>,

    /// The jti of the currently valid refresh token.
    /// When a refresh rotates the token, this is updated atomically.
    /// On logout it is cleared.
    pub refresh_jti: Option<String>,

    /// Per-install random 64-byte JWT signing secret, base64-encoded.
    /// Generated once on first run, never changes.
    pub jwt_secret_b64: Option<String>,

    /// Whether initial setup has been completed.
    pub setup_done: bool,

    /// Number of consecutive failed login attempts since last success.
    /// Reset to 0 on successful login or after the cooldown window passes.
    #[serde(default)]
    pub failed_login_attempts: Option<u32>,

    /// Unix timestamp of the most recent failed login attempt.
    /// Used to calculate the remaining cooldown window.
    #[serde(default)]
    pub last_failed_login_at: Option<i64>,
}

// ── File path ─────────────────────────────────────────────────────────────────

fn store_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join("auth.json")
}

// ── Load / Save ───────────────────────────────────────────────────────────────

/// Load the auth store from disk. Returns a default (empty) store if the
/// file doesn't exist yet (first run).
pub fn load(app_data_dir: &Path) -> AppResult<AuthStore> {
    let path = store_path(app_data_dir);

    if !path.exists() {
        return Ok(AuthStore::default());
    }

    let raw = std::fs::read_to_string(&path)
        .map_err(|e| AppError::Io(e))?;

    serde_json::from_str(&raw)
        .map_err(|e| AppError::Serialization(e))
}

/// Persist the auth store to disk atomically (write to .tmp, then rename).
pub fn save(app_data_dir: &Path, store: &AuthStore) -> AppResult<()> {
    std::fs::create_dir_all(app_data_dir)
        .map_err(|e| AppError::Io(e))?;

    let path = store_path(app_data_dir);
    let tmp  = path.with_extension("json.tmp");

    let json = serde_json::to_string_pretty(store)
        .map_err(|e| AppError::Serialization(e))?;

    std::fs::write(&tmp, json)
        .map_err(|e| AppError::Io(e))?;

    std::fs::rename(&tmp, &path)
        .map_err(|e| AppError::Io(e))?;

    Ok(())
}

// ── JWT secret management ─────────────────────────────────────────────────────

/// Return the JWT signing secret, generating and persisting it on first call.
pub fn get_or_create_jwt_secret(app_data_dir: &Path) -> AppResult<Vec<u8>> {
    let mut store = load(app_data_dir)?;

    if let Some(ref b64) = store.jwt_secret_b64 {
        return base64_decode(b64);
    }

    // First run — generate a cryptographically random 64-byte secret
    let secret = generate_random_bytes(64);
    store.jwt_secret_b64 = Some(base64_encode(&secret));
    save(app_data_dir, &store)?;

    Ok(secret)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn generate_random_bytes(len: usize) -> Vec<u8> {
    use argon2::password_hash::rand_core::{OsRng, RngCore};
    let mut bytes = vec![0u8; len];
    OsRng.fill_bytes(&mut bytes);
    bytes
}

fn base64_encode(bytes: &[u8]) -> String {
    use base64::{engine::general_purpose::STANDARD, Engine};
    STANDARD.encode(bytes)
}

fn base64_decode(s: &str) -> AppResult<Vec<u8>> {
    use base64::{engine::general_purpose::STANDARD, Engine};
    STANDARD
        .decode(s)
        .map_err(|e| AppError::Internal(format!("Base64 decode error: {e}")))
}
