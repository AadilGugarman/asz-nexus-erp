// auth/password.rs
// Argon2id password hashing and verification.
//
// Uses argon2 crate with OWASP-recommended parameters:
//   - Argon2id variant (hybrid, resistant to both side-channel and GPU attacks)
//   - m = 19 MiB memory cost
//   - t = 2 iterations
//   - p = 1 parallelism
//   - 32-byte output
//
// The hash is stored as a PHC string (includes algorithm, params, salt, hash)
// so it is self-describing and forward-compatible with parameter upgrades.

use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2, Params, Version,
};
use crate::error::{AppError, AppResult};

/// Hash a plaintext password/PIN using Argon2id.
/// Returns a PHC-format string safe to store in the DB or config file.
pub fn hash(password: &str) -> AppResult<String> {
    let salt = SaltString::generate(&mut OsRng);

    // OWASP recommended minimum: 19 MiB, 2 iterations, 1 thread
    let params = Params::new(19_456, 2, 1, Some(32))
        .map_err(|e| AppError::Internal(format!("Argon2 params error: {e}")))?;

    let argon2 = Argon2::new(argon2::Algorithm::Argon2id, Version::V0x13, params);

    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| AppError::Internal(format!("Argon2 hash error: {e}")))?
        .to_string();

    Ok(hash)
}

/// Verify a plaintext password against a stored PHC hash string.
/// Returns Ok(true) on match, Ok(false) on mismatch.
/// Returns Err only on malformed hash strings (not on wrong password).
pub fn verify(password: &str, hash_str: &str) -> AppResult<bool> {
    let parsed = PasswordHash::new(hash_str)
        .map_err(|e| AppError::Internal(format!("Invalid hash format: {e}")))?;

    let argon2 = Argon2::default();

    match argon2.verify_password(password.as_bytes(), &parsed) {
        Ok(()) => Ok(true),
        Err(argon2::password_hash::Error::Password) => Ok(false),
        Err(e) => Err(AppError::Internal(format!("Argon2 verify error: {e}"))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_and_verify_roundtrip() {
        let pw = "secure_pin_1234";
        let h = hash(pw).unwrap();
        assert!(verify(pw, &h).unwrap());
        assert!(!verify("wrong", &h).unwrap());
    }
}
