// auth/mod.rs
// Authentication module.
//
// Submodules:
//   tokens    — JWT generation, validation, refresh rotation
//   password  — Argon2 hashing and verification
//   store     — Secure credential persistence (OS keychain via app data)
//   session   — In-memory session state held in AppState
//   guards    — Middleware helpers for command-level auth checks

pub mod guards;
pub mod password;
pub mod session;
pub mod store;
pub mod tokens;
