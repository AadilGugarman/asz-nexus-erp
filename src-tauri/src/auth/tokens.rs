// auth/tokens.rs
// JWT access token and refresh token lifecycle.
//
// Design for a Tauri desktop app:
//   - Access token:  short-lived (15 min), signed HS256, held in memory only
//   - Refresh token: long-lived (30 days), signed HS256, stored in secure store
//   - Rotation:      every refresh issues a new refresh token and invalidates the old one
//   - Secret:        derived from a per-install random key stored in the secure store
//
// There is no HTTP transport — tokens travel only through Tauri IPC.
// The threat model is: prevent a different OS user from accessing the app
// on a shared machine, and prevent token replay if the app data dir is copied.

use chrono::Utc;
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::error::{AppError, AppResult};

// ── Token lifetimes ───────────────────────────────────────────────────────────

/// Access token valid for 15 minutes.
pub const ACCESS_TOKEN_TTL_SECS: i64 = 15 * 60;

/// Refresh token valid for 30 days.
pub const REFRESH_TOKEN_TTL_SECS: i64 = 30 * 24 * 60 * 60;

// ── Claims ────────────────────────────────────────────────────────────────────

/// Claims embedded in the access token.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessClaims {
    /// Subject — user ID (employee ID or "admin")
    pub sub: String,
    /// Role — "admin" | "manager" | "staff"
    pub role: String,
    /// Issued-at (Unix timestamp)
    pub iat: i64,
    /// Expiry (Unix timestamp)
    pub exp: i64,
    /// Token type discriminator
    pub typ: String, // "access"
}

/// Claims embedded in the refresh token.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefreshClaims {
    pub sub: String,
    pub iat: i64,
    pub exp: i64,
    /// Unique token ID — used to detect replay after rotation
    pub jti: String,
    pub typ: String, // "refresh"
}

// ── Token pair ────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenPair {
    pub access_token:  String,
    pub refresh_token: String,
    /// Unix timestamp when the access token expires
    pub access_expires_at: i64,
    /// Unix timestamp when the refresh token expires
    pub refresh_expires_at: i64,
}

// ── Issue ─────────────────────────────────────────────────────────────────────

/// Issue a fresh access + refresh token pair for a user.
pub fn issue(user_id: &str, role: &str, secret: &[u8]) -> AppResult<TokenPair> {
    let now = Utc::now().timestamp();
    let access_exp  = now + ACCESS_TOKEN_TTL_SECS;
    let refresh_exp = now + REFRESH_TOKEN_TTL_SECS;

    let access_claims = AccessClaims {
        sub:  user_id.to_string(),
        role: role.to_string(),
        iat:  now,
        exp:  access_exp,
        typ:  "access".to_string(),
    };

    let refresh_claims = RefreshClaims {
        sub: user_id.to_string(),
        iat: now,
        exp: refresh_exp,
        jti: Uuid::new_v4().to_string(),
        typ: "refresh".to_string(),
    };

    let key = EncodingKey::from_secret(secret);
    let header = Header::new(Algorithm::HS256);

    let access_token = encode(&header, &access_claims, &key)
        .map_err(|e| AppError::Internal(format!("JWT encode error: {e}")))?;

    let refresh_token = encode(&header, &refresh_claims, &key)
        .map_err(|e| AppError::Internal(format!("JWT encode error: {e}")))?;

    Ok(TokenPair {
        access_token,
        refresh_token,
        access_expires_at:  access_exp,
        refresh_expires_at: refresh_exp,
    })
}

// ── Validate access token ─────────────────────────────────────────────────────

/// Validate an access token and return its claims.
/// Returns Err if expired, malformed, or wrong type.
pub fn validate_access(token: &str, secret: &[u8]) -> AppResult<AccessClaims> {
    let key = DecodingKey::from_secret(secret);
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;

    let data = decode::<AccessClaims>(token, &key, &validation)
        .map_err(|e| AppError::PermissionDenied(format!("Invalid access token: {e}")))?;

    if data.claims.typ != "access" {
        return Err(AppError::PermissionDenied("Wrong token type".into()));
    }

    Ok(data.claims)
}

// ── Validate refresh token ────────────────────────────────────────────────────

/// Validate a refresh token and return its claims.
/// The caller must additionally check the jti against the stored value.
pub fn validate_refresh(token: &str, secret: &[u8]) -> AppResult<RefreshClaims> {
    let key = DecodingKey::from_secret(secret);
    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;

    let data = decode::<RefreshClaims>(token, &key, &validation)
        .map_err(|e| AppError::PermissionDenied(format!("Invalid refresh token: {e}")))?;

    if data.claims.typ != "refresh" {
        return Err(AppError::PermissionDenied("Wrong token type".into()));
    }

    Ok(data.claims)
}

// ── Rotate refresh token ──────────────────────────────────────────────────────

/// Validate the incoming refresh token, then issue a new token pair.
/// Returns the new pair and the old jti (caller must invalidate it in the store).
pub fn rotate(
    refresh_token: &str,
    stored_jti: &str,
    role: &str,
    secret: &[u8],
) -> AppResult<(TokenPair, String)> {
    let claims = validate_refresh(refresh_token, secret)?;

    // Replay detection — the stored jti must match
    if claims.jti != stored_jti {
        return Err(AppError::PermissionDenied(
            "Refresh token has already been used (replay detected)".into(),
        ));
    }

    let old_jti = claims.jti.clone();
    let new_pair = issue(&claims.sub, role, secret)?;
    Ok((new_pair, old_jti))
}
