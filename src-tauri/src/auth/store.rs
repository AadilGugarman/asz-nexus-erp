// auth/store.rs
// Secure credential persistence.
//
// Storage strategy for a Tauri desktop app:
//   - Sensitive auth secrets are stored in the OS secure credential store.
//   - Non-sensitive metadata is stored as JSON in the app data directory.
//   - On Windows this uses Credential Manager, on macOS Keychain, and on
//     supported Linux desktops the native secret service.
//
// This change keeps the runtime auth data per-user and avoids writing
// password hashes, refresh tokens, JWT secrets, and similar secrets to disk.

use keyring::Entry;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use crate::error::{AppError, AppResult};

const KEYRING_SERVICE: &str = "asz-nexus-erp";
const KEYRING_USER: &str = "auth-store";

// ── Stored credential record ──────────────────────────────────────────────────

/// Everything persisted to disk for auth.
///
/// Sensitive fields are intentionally skipped during JSON serialization so
/// they remain protected in the OS secure credential store.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AuthStore {
    /// Argon2id PHC hash of the user's PIN/password.
    #[serde(skip_serializing, default)]
    pub password_hash: Option<String>,

    /// The currently valid refresh token string.
    #[serde(skip_serializing, default)]
    pub refresh_token: Option<String>,

    /// The jti of the currently valid refresh token.
    /// When a refresh rotates the token, this is updated atomically.
    /// On logout it is cleared.
    #[serde(skip_serializing, default)]
    pub refresh_jti: Option<String>,

    /// Per-install random 64-byte JWT signing secret, base64-encoded.
    /// Generated once on first run, never changes.
    #[serde(skip_serializing, default)]
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

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct SecretStore {
    pub password_hash: Option<String>,
    pub refresh_token: Option<String>,
    pub refresh_jti: Option<String>,
    pub jwt_secret_b64: Option<String>,
}

fn secret_entry() -> Entry {
    Entry::new(KEYRING_SERVICE, KEYRING_USER)
}

fn load_secret_store() -> AppResult<SecretStore> {
    let entry = secret_entry();
    let raw = match entry.get_password() {
        Ok(value) => value,
        Err(e) => {
            if matches!(e, keyring::Error::NoEntry) {
                return Ok(SecretStore::default());
            }
            return Err(AppError::Internal(format!("Secure storage error: {e}")));
        }
    };
    serde_json::from_str(&raw).map_err(|e| AppError::Serialization(e))
}

fn save_secret_store(store: &SecretStore) -> AppResult<()> {
    let entry = secret_entry();
    let json = serde_json::to_string(store)
        .map_err(|e| AppError::Serialization(e))?;
    entry.set_password(&json)
        .map_err(|e| AppError::Internal(format!("Secure storage error: {e}")))?;
    Ok(())
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
    let mut store = if !path.exists() {
        AuthStore::default()
    } else {
        let raw = std::fs::read_to_string(&path)
            .map_err(|e| AppError::Io(e))?;
        serde_json::from_str(&raw)
            .map_err(|e| AppError::Serialization(e))?
    };

    let secret_store = load_secret_store()?;
    store.password_hash = store.password_hash.or(secret_store.password_hash);
    store.refresh_token = store.refresh_token.or(secret_store.refresh_token);
    store.refresh_jti = store.refresh_jti.or(secret_store.refresh_jti);
    store.jwt_secret_b64 = store.jwt_secret_b64.or(secret_store.jwt_secret_b64);

    Ok(store)
}

/// Persist the auth store to disk atomically (write to .tmp, then rename).
pub fn save(app_data_dir: &Path, store: &AuthStore) -> AppResult<()> {
    std::fs::create_dir_all(app_data_dir)
        .map_err(|e| AppError::Io(e))?;

    let metadata = AuthStore {
        password_hash: None,
        refresh_token: None,
        refresh_jti: None,
        jwt_secret_b64: None,
        setup_done: store.setup_done,
        failed_login_attempts: store.failed_login_attempts,
        last_failed_login_at: store.last_failed_login_at,
    };

    let path = store_path(app_data_dir);
    let tmp = path.with_extension("json.tmp");

    let json = serde_json::to_string_pretty(&metadata)
        .map_err(|e| AppError::Serialization(e))?;

    std::fs::write(&tmp, json)
        .map_err(|e| AppError::Io(e))?;

    std::fs::rename(&tmp, &path)
        .map_err(|e| AppError::Io(e))?;

    let secret_store = SecretStore {
        password_hash: store.password_hash.clone(),
        refresh_token: store.refresh_token.clone(),
        refresh_jti: store.refresh_jti.clone(),
        jwt_secret_b64: store.jwt_secret_b64.clone(),
    };
    save_secret_store(&secret_store)?;

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
