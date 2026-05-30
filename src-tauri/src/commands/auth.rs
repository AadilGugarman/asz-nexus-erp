// commands/auth.rs
// Authentication command handlers.
//
// Commands:
//   auth_setup        — first-run: set password, mark setup done
//   auth_login        — verify password, issue token pair
//   auth_refresh      — rotate refresh token, issue new access token
//   auth_logout       — clear session and invalidate refresh token
//   auth_check        — return current session status (used on app resume)
//   auth_change_password — change password (requires current password)
//   auth_is_setup_done   — check if initial setup has been completed

use serde::{Deserialize, Serialize};
use tauri::Manager;
use crate::auth::{guards, password, store, tokens};
use crate::error::{AppError, AppResult};
use crate::ipc::IpcResponse;
use crate::state::AppState;
use crate::validation;

// ── Response types ────────────────────────────────────────────────────────────

/// Returned after a successful login or token refresh.
#[derive(Debug, Serialize)]
pub struct AuthTokenResponse {
    pub access_token:       String,
    pub refresh_token:      String,
    pub access_expires_at:  i64,
    pub refresh_expires_at: i64,
    pub user_id:            String,
    pub role:               String,
}

/// Returned by auth_check — tells the frontend the current session state.
#[derive(Debug, Serialize)]
pub struct SessionStatus {
    pub authenticated: bool,
    pub setup_done:    bool,
    pub user_id:       Option<String>,
    pub role:          Option<String>,
    /// Seconds until the access token expires (negative = already expired)
    pub expires_in:    i64,
}

// ── Request types ─────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct SetupRequest {
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct RefreshRequest {
    pub refresh_token: String,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password:     String,
}


// ── auth_is_setup_done ────────────────────────────────────────────────────────

/// Check whether the app has been set up (password created).
/// Called on app launch to decide whether to show setup or login.
#[tauri::command]
pub async fn auth_is_setup_done(
    app: tauri::AppHandle,
) -> AppResult<IpcResponse<bool>> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Internal(format!("Cannot resolve app data dir: {e}")))?;

    let auth_store = store::load(&app_data_dir)?;
    Ok(IpcResponse::ok(auth_store.setup_done && auth_store.password_hash.is_some()))
}

// ── auth_setup ────────────────────────────────────────────────────────────────

/// First-run setup: hash and store the password, generate JWT secret.
/// Fails if setup has already been completed.
#[tauri::command]
pub async fn auth_setup(
    payload: SetupRequest,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<AuthTokenResponse>> {
    validation::require_non_empty(&payload.password, "password")?;
    validation::require_min_len(&payload.password, 4, "password")?;
    validation::require_max_len(&payload.password, 128, "password")?;

    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Internal(format!("Cannot resolve app data dir: {e}")))?;

    let mut auth_store = store::load(&app_data_dir)?;

    if auth_store.setup_done {
        return Ok(IpcResponse::err("VALIDATION_ERROR", "Setup has already been completed"));
    }

    // Hash password with Argon2id
    let hash = password::hash(&payload.password)?;

    // Ensure JWT secret exists
    let secret = store::get_or_create_jwt_secret(&app_data_dir)?;

    // Issue initial token pair for the admin user
    let pair = tokens::issue("admin", "admin", &secret)?;

    // Persist credentials
    auth_store.password_hash = Some(hash);
    auth_store.refresh_token = Some(pair.refresh_token.clone());
    auth_store.refresh_jti   = Some(extract_jti(&pair.refresh_token, &secret)?);
    auth_store.setup_done    = true;
    store::save(&app_data_dir, &auth_store)?;

    // Update in-memory session
    let claims = tokens::validate_access(&pair.access_token, &secret)?;
    state.session.set_access_token(pair.access_token.clone(), claims);
    state.session.set_setup_done(true);

    Ok(IpcResponse::ok(AuthTokenResponse {
        access_token:       pair.access_token,
        refresh_token:      pair.refresh_token,
        access_expires_at:  pair.access_expires_at,
        refresh_expires_at: pair.refresh_expires_at,
        user_id:            "admin".to_string(),
        role:               "admin".to_string(),
    }))
}

// ── auth_login ────────────────────────────────────────────────────────────────

/// Verify password and issue a new token pair.
/// Enforces a 5-attempt lockout with 30-second cooldown to prevent brute force.
#[tauri::command]
pub async fn auth_login(
    payload: LoginRequest,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<AuthTokenResponse>> {
    validation::require_non_empty(&payload.password, "password")?;

    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Internal(format!("Cannot resolve app data dir: {e}")))?;

    let mut auth_store = store::load(&app_data_dir)?;

    if !auth_store.setup_done {
        return Ok(IpcResponse::err("VALIDATION_ERROR", "App not set up yet. Please complete setup first."));
    }

    // ── Brute-force protection ────────────────────────────────────────────────
    let now_secs = chrono::Utc::now().timestamp();
    let failed_attempts = auth_store.failed_login_attempts.unwrap_or(0);
    let last_failed_at  = auth_store.last_failed_login_at.unwrap_or(0);

    // After 5 consecutive failures, enforce a 30-second cooldown.
    if failed_attempts >= 5 {
        let elapsed = now_secs - last_failed_at;
        if elapsed < 30 {
            let remaining = 30 - elapsed;
            return Ok(IpcResponse::err(
                "RATE_LIMITED",
                &format!("Too many failed attempts. Try again in {remaining} seconds."),
            ));
        }
        // Cooldown passed — reset the counter so they get 5 more attempts.
        auth_store.failed_login_attempts = Some(0);
    }

    let hash = auth_store.password_hash.as_deref().ok_or_else(|| {
        AppError::Internal("No password hash found despite setup_done=true".into())
    })?;

    // Constant-time password verification
    if !password::verify(&payload.password, hash)? {
        // Record the failure
        auth_store.failed_login_attempts = Some(failed_attempts + 1);
        auth_store.last_failed_login_at  = Some(now_secs);
        let _ = store::save(&app_data_dir, &auth_store);

        let attempts_left = 5_u32.saturating_sub(failed_attempts + 1);
        let msg = if attempts_left == 0 {
            "Incorrect password. Account locked for 30 seconds.".to_string()
        } else {
            format!("Incorrect password. {attempts_left} attempt(s) remaining.")
        };
        return Ok(IpcResponse::err("PERMISSION_DENIED", &msg));
    }

    // Success — clear the failure counter
    auth_store.failed_login_attempts = Some(0);
    auth_store.last_failed_login_at  = Some(0);

    let secret = store::get_or_create_jwt_secret(&app_data_dir)?;
    let pair   = tokens::issue("admin", "admin", &secret)?;
    let jti    = extract_jti(&pair.refresh_token, &secret)?;

    // Persist the new refresh token alongside its jti.
    auth_store.refresh_token = Some(pair.refresh_token.clone());
    auth_store.refresh_jti   = Some(jti);
    store::save(&app_data_dir, &auth_store)?;

    // Update in-memory session
    let claims = tokens::validate_access(&pair.access_token, &secret)?;
    state.session.set_access_token(pair.access_token.clone(), claims);

    Ok(IpcResponse::ok(AuthTokenResponse {
        access_token:       pair.access_token,
        refresh_token:      pair.refresh_token,
        access_expires_at:  pair.access_expires_at,
        refresh_expires_at: pair.refresh_expires_at,
        user_id:            "admin".to_string(),
        role:               "admin".to_string(),
    }))
}

// ── auth_refresh ──────────────────────────────────────────────────────────────

/// Rotate the refresh token and issue a new access token.
/// The old refresh token is invalidated immediately (replay protection).
#[tauri::command]
pub async fn auth_refresh(
    payload: RefreshRequest,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<AuthTokenResponse>> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Internal(format!("Cannot resolve app data dir: {e}")))?;

    let mut auth_store = store::load(&app_data_dir)?;

    let stored_jti = auth_store.refresh_jti.as_deref().ok_or_else(|| {
        AppError::PermissionDenied("No active refresh token. Please log in again.".into())
    })?;

    let secret = store::get_or_create_jwt_secret(&app_data_dir)?;

    // Rotate: validates old token, checks jti, issues new pair
    let (new_pair, _old_jti) = tokens::rotate(
        &payload.refresh_token,
        stored_jti,
        "admin",
        &secret,
    )?;

    let new_jti = extract_jti(&new_pair.refresh_token, &secret)?;

    // Atomically replace the stored refresh token and its jti.
    auth_store.refresh_token = Some(new_pair.refresh_token.clone());
    auth_store.refresh_jti   = Some(new_jti);
    store::save(&app_data_dir, &auth_store)?;

    // Update in-memory session with new access token
    let claims = tokens::validate_access(&new_pair.access_token, &secret)?;
    state.session.set_access_token(new_pair.access_token.clone(), claims);

    Ok(IpcResponse::ok(AuthTokenResponse {
        access_token:       new_pair.access_token,
        refresh_token:      new_pair.refresh_token,
        access_expires_at:  new_pair.access_expires_at,
        refresh_expires_at: new_pair.refresh_expires_at,
        user_id:            "admin".to_string(),
        role:               "admin".to_string(),
    }))
}

// ── auth_restore_session ──────────────────────────────────────────────────────

/// Attempt to restore a session using the stored refresh token.
/// Called on app startup — if the refresh token is missing, expired, or
/// invalid, this returns PermissionDenied and the user must log in.
/// This is intentionally strict: a missing token means the user logged out
/// or the app was reset, and they must authenticate with their password.
#[tauri::command]
pub async fn auth_restore_session(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<AuthTokenResponse>> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Internal(format!("Cannot resolve app data dir: {e}")))?;

    let mut auth_store = store::load(&app_data_dir)?;

    // If setup is not done, there is nothing to restore.
    if !auth_store.setup_done {
        return Ok(IpcResponse::err("VALIDATION_ERROR", "App not set up yet."));
    }

    let stored_refresh_token = match auth_store.refresh_token.as_deref() {
        Some(t) => t.to_string(),
        None => return Ok(IpcResponse::err(
            "PERMISSION_DENIED",
            "No stored session. Please log in with your password.",
        )),
    };
    let stored_jti = match auth_store.refresh_jti.as_deref() {
        Some(j) => j.to_string(),
        None => return Ok(IpcResponse::err(
            "PERMISSION_DENIED",
            "Session metadata missing. Please log in with your password.",
        )),
    };

    let secret = store::get_or_create_jwt_secret(&app_data_dir)?;

    let (new_pair, _old_jti) = match tokens::rotate(
        &stored_refresh_token,
        &stored_jti,
        "admin",
        &secret,
    ) {
        Ok(pair) => pair,
        Err(_) => {
            // Token expired or invalid — clear it so next startup is clean
            auth_store.refresh_token = None;
            auth_store.refresh_jti = None;
            let _ = store::save(&app_data_dir, &auth_store);
            return Ok(IpcResponse::err(
                "PERMISSION_DENIED",
                "Session expired. Please log in with your password.",
            ));
        }
    };

    let new_jti = extract_jti(&new_pair.refresh_token, &secret)?;
    auth_store.refresh_token = Some(new_pair.refresh_token.clone());
    auth_store.refresh_jti   = Some(new_jti);
    store::save(&app_data_dir, &auth_store)?;

    let claims = tokens::validate_access(&new_pair.access_token, &secret)?;
    state.session.set_access_token(new_pair.access_token.clone(), claims);

    Ok(IpcResponse::ok(AuthTokenResponse {
        access_token:       new_pair.access_token,
        refresh_token:      new_pair.refresh_token,
        access_expires_at:  new_pair.access_expires_at,
        refresh_expires_at: new_pair.refresh_expires_at,
        user_id:            "admin".to_string(),
        role:               "admin".to_string(),
    }))
}

// ── auth_logout ───────────────────────────────────────────────────────────────

/// Clear the session and invalidate the stored refresh token.
#[tauri::command]
pub async fn auth_logout(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<bool>> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Internal(format!("Cannot resolve app data dir: {e}")))?;

    let mut auth_store = store::load(&app_data_dir)?;
    auth_store.refresh_token = None;
    auth_store.refresh_jti = None;
    store::save(&app_data_dir, &auth_store)?;

    state.session.clear();

    Ok(IpcResponse::ok(true))
}

// ── auth_reset_app ────────────────────────────────────────────────────────────

/// DANGEROUS: Full factory reset.
/// Deletes auth.json AND the SQLite database file (+ WAL/SHM).
/// On next startup the DB is recreated from migrations and the user
/// goes through first-run setup with a completely clean slate.
#[tauri::command]
pub async fn auth_reset_app(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<bool>> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Internal(format!("Cannot resolve app data dir: {e}")))?;

    // 1. Delete auth.json (password hash, tokens, setup_done flag)
    let auth_path = app_data_dir.join("auth.json");
    if auth_path.exists() {
        std::fs::remove_file(&auth_path).map_err(|e| AppError::Io(e))?;
    }

    // 2. Delete the SQLite database and its WAL/SHM journal files.
    //    The pool holds open connections, so we close them first by
    //    dropping all connections back to the pool, then delete the files.
    //    On next startup, init_pool() + migrations::run() recreate everything.
    let db_path     = app_data_dir.join("asz_nexus_erp.db");
    let db_wal_path = app_data_dir.join("asz_nexus_erp.db-wal");
    let db_shm_path = app_data_dir.join("asz_nexus_erp.db-shm");

    // Execute a checkpoint + truncate WAL before deleting so the main file
    // is fully up-to-date and the WAL is empty (safe to delete).
    if let Ok(conn) = state.db.get() {
        let _ = conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);");
    }
    // Drop all pooled connections by letting the borrow end here.
    // The pool itself stays alive in AppState but the files will be gone —
    // any subsequent DB access will fail, which is fine because the frontend
    // reloads immediately after this call.

    // Windows safety: Rename files first to clear the file paths, then delete
    let timestamp = chrono::Utc::now().timestamp_millis();
    let paths = vec![db_path, db_wal_path, db_shm_path];
    for path in paths {
        if path.exists() {
            let deleted_path = path.with_extension(format!("{timestamp}.deleted"));
            if let Ok(_) = std::fs::rename(&path, &deleted_path) {
                let _ = std::fs::remove_file(deleted_path);
            }
        }
    }

    // Clear all backup files inside backups folder
    let backups_dir = app_data_dir.join("backups");
    if backups_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&backups_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let _ = std::fs::remove_file(path);
                }
            }
        }
    }


    // 3. Clear the in-memory session
    state.session.clear();

    Ok(IpcResponse::ok(true))
}

// ── auth_check ────────────────────────────────────────────────────────────────

/// Return the current session status without requiring a password.
/// Called on app resume / window focus to check if the access token is still valid.
#[tauri::command]
pub async fn auth_check(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<SessionStatus>> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Internal(format!("Cannot resolve app data dir: {e}")))?;

    let auth_store = store::load(&app_data_dir)?;
    let authenticated = state.session.is_authenticated();
    let claims = state.session.claims();
    let now = chrono::Utc::now().timestamp();

    Ok(IpcResponse::ok(SessionStatus {
        authenticated,
        setup_done: auth_store.setup_done,
        user_id:    claims.as_ref().map(|c| c.sub.clone()),
        role:       claims.as_ref().map(|c| c.role.clone()),
        expires_in: claims.map(|c| c.exp - now).unwrap_or(0),
    }))
}

// ── auth_change_password ──────────────────────────────────────────────────────

/// Change the password. Requires the current password and an active session.
#[tauri::command]
pub async fn auth_change_password(
    payload: ChangePasswordRequest,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<bool>> {
    guards::require_auth(&state.session)?;

    validation::require_non_empty(&payload.new_password, "new_password")?;
    validation::require_min_len(&payload.new_password, 4, "new_password")?;
    validation::require_max_len(&payload.new_password, 128, "new_password")?;

    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Internal(format!("Cannot resolve app data dir: {e}")))?;

    let mut auth_store = store::load(&app_data_dir)?;

    let hash = auth_store.password_hash.as_deref().ok_or_else(|| {
        AppError::Internal("No password hash found".into())
    })?;

    if !password::verify(&payload.current_password, hash)? {
        return Ok(IpcResponse::err("PERMISSION_DENIED", "Current password is incorrect"));
    }

    auth_store.password_hash = Some(password::hash(&payload.new_password)?);
    // Invalidate all refresh tokens on password change
    auth_store.refresh_token = None;
    auth_store.refresh_jti = None;
    store::save(&app_data_dir, &auth_store)?;

    // Force re-login
    state.session.clear();

    Ok(IpcResponse::ok(true))
}

// ── Helper ────────────────────────────────────────────────────────────────────

/// Decode a refresh token just to extract its jti (without full validation overhead).
fn extract_jti(refresh_token: &str, secret: &[u8]) -> AppResult<String> {
    let claims = tokens::validate_refresh(refresh_token, secret)?;
    Ok(claims.jti)
}
