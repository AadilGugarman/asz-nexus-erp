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

#[derive(Debug, Deserialize)]
pub struct LockConfigRequest {
    pub pin_enabled:      bool,
    pub app_pin:          Option<String>,
    pub auto_lock_minutes: i64,
}

#[derive(Debug, Serialize)]
pub struct LockConfigResponse {
    pub pin_enabled:      bool,
    pub auto_lock_minutes: i64,
}

#[derive(Debug, Deserialize)]
pub struct VerifyPinRequest {
    pub pin: String,
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

    let hash = auth_store.password_hash.as_deref().ok_or_else(|| {
        AppError::Internal("No password hash found despite setup_done=true".into())
    })?;

    // Constant-time password verification
    if !password::verify(&payload.password, hash)? {
        return Ok(IpcResponse::err("PERMISSION_DENIED", "Incorrect password"));
    }

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

#[tauri::command]
pub async fn auth_restore_session(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<AuthTokenResponse>> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Internal(format!("Cannot resolve app data dir: {e}")))?;

    let mut auth_store = store::load(&app_data_dir)?;
    let stored_refresh_token = auth_store.refresh_token.as_deref().ok_or_else(|| {
        AppError::PermissionDenied("No stored refresh token. Please log in again.".into())
    })?;
    let stored_jti = auth_store.refresh_jti.as_deref().ok_or_else(|| {
        AppError::PermissionDenied("No active refresh token metadata. Please log in again.".into())
    })?;

    let secret = store::get_or_create_jwt_secret(&app_data_dir)?;

    let (new_pair, _old_jti) = tokens::rotate(
        stored_refresh_token,
        stored_jti,
        "admin",
        &secret,
    )?;

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

// ── auth_get_lock_config ─────────────────────────────────────────────────────

#[tauri::command]
pub async fn auth_get_lock_config(
    app: tauri::AppHandle,
) -> AppResult<IpcResponse<LockConfigResponse>> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Internal(format!("Cannot resolve app data dir: {e}")))?;

    let auth_store = store::load(&app_data_dir)?;
    Ok(IpcResponse::ok(LockConfigResponse {
        pin_enabled: auth_store.pin_enabled,
        auto_lock_minutes: auth_store.auto_lock_minutes,
    }))
}

// ── auth_set_lock_config ─────────────────────────────────────────────────────

#[tauri::command]
pub async fn auth_set_lock_config(
    payload: LockConfigRequest,
    app: tauri::AppHandle,
) -> AppResult<IpcResponse<LockConfigResponse>> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Internal(format!("Cannot resolve app data dir: {e}")))?;

    let mut auth_store = store::load(&app_data_dir)?;

    if !payload.pin_enabled {
        auth_store.pin_enabled = false;
        auth_store.pin_hash = None;
        auth_store.pin_salt = None;
        auth_store.auto_lock_minutes = 0;
        store::save(&app_data_dir, &auth_store)?;
        return Ok(IpcResponse::ok(LockConfigResponse {
            pin_enabled: false,
            auto_lock_minutes: 0,
        }));
    }

    if let Some(pin_value) = payload.app_pin.clone() {
        validation::require_non_empty(&pin_value, "app_pin")?;
        validation::require_min_len(&pin_value, 4, "app_pin")?;
        validation::require_max_len(&pin_value, 6, "app_pin")?;
        auth_store.pin_hash = Some(password::hash(&pin_value)?);
        auth_store.pin_salt = None;
    } else if auth_store.pin_hash.is_none() {
        return Ok(IpcResponse::err("VALIDATION_ERROR", "A PIN must be provided when enabling lock protection."));
    }

    auth_store.pin_enabled = true;
    auth_store.auto_lock_minutes = payload.auto_lock_minutes.max(0);
    store::save(&app_data_dir, &auth_store)?;

    Ok(IpcResponse::ok(LockConfigResponse {
        pin_enabled: auth_store.pin_enabled,
        auto_lock_minutes: auth_store.auto_lock_minutes,
    }))
}

// ── auth_verify_pin ───────────────────────────────────────────────────────────

#[tauri::command]
pub async fn auth_verify_pin(
    payload: VerifyPinRequest,
    app: tauri::AppHandle,
) -> AppResult<IpcResponse<bool>> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Internal(format!("Cannot resolve app data dir: {e}")))?;

    let auth_store = store::load(&app_data_dir)?;
    if !auth_store.pin_enabled {
        return Ok(IpcResponse::ok(false));
    }

    let stored_hash = auth_store.pin_hash.as_deref().ok_or_else(|| {
        AppError::Internal("PIN lock is enabled but stored pin hash is missing.".into())
    })?;

    let ok = password::verify(&payload.pin, stored_hash)?;
    Ok(IpcResponse::ok(ok))
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

/// DANGEROUS: Deletes the auth.json file and clears the in-memory session.
/// This effectively resets the app to a "first-run" state.
#[tauri::command]
pub async fn auth_reset_app(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<bool>> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Internal(format!("Cannot resolve app data dir: {e}")))?;

    let path = app_data_dir.join("auth.json");
    if path.exists() {
        std::fs::remove_file(path).map_err(|e| AppError::Io(e))?;
    }

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
