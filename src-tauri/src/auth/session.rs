// auth/session.rs
#![allow(dead_code)]
// In-memory session state — held in AppState, never written to disk.
//
// The access token lives here only. It is cleared on app exit.
// The refresh token jti is persisted in auth/store.rs.

use std::sync::RwLock;
use crate::auth::tokens::AccessClaims;

/// Runtime session — stored in AppState behind an RwLock.
#[derive(Debug, Default)]
pub struct Session {
    inner: RwLock<SessionInner>,
}

#[derive(Debug, Default, Clone)]
struct SessionInner {
    /// The raw access token string (held in memory only).
    pub access_token: Option<String>,
    /// Decoded claims from the current access token.
    pub claims: Option<AccessClaims>,
    /// Whether the user has completed initial setup.
    pub setup_done: bool,
}

impl Session {
    pub fn new() -> Self {
        Self::default()
    }

    /// Store a validated access token and its claims.
    pub fn set_access_token(&self, token: String, claims: AccessClaims) {
        let mut inner = self.inner.write().unwrap();
        inner.access_token = Some(token);
        inner.claims = Some(claims);
    }

    /// Clear the session (logout).
    pub fn clear(&self) {
        let mut inner = self.inner.write().unwrap();
        inner.access_token = None;
        inner.claims = None;
    }

    /// Returns true if there is a valid (non-expired) access token in memory.
    pub fn is_authenticated(&self) -> bool {
        let inner = self.inner.read().unwrap();
        if let Some(ref claims) = inner.claims {
            let now = chrono::Utc::now().timestamp();
            return claims.exp > now;
        }
        false
    }

    /// Get a clone of the current claims, if any.
    pub fn claims(&self) -> Option<AccessClaims> {
        self.inner.read().unwrap().claims.clone()
    }

    /// Get the current access token string.
    pub fn access_token(&self) -> Option<String> {
        self.inner.read().unwrap().access_token.clone()
    }

    pub fn set_setup_done(&self, done: bool) {
        self.inner.write().unwrap().setup_done = done;
    }

    pub fn setup_done(&self) -> bool {
        self.inner.read().unwrap().setup_done
    }
}
