// validation.rs
// Reusable input validation helpers for command handlers.
// All functions are available for future use — allow dead_code for scaffolding.
#![allow(dead_code)]

use crate::error::{AppError, AppResult};

/// Fail if a string is empty or whitespace-only.
pub fn require_non_empty(value: &str, field: &str) -> AppResult<()> {
    if value.trim().is_empty() {
        return Err(AppError::Validation(format!(
            "Field '{}' must not be empty",
            field
        )));
    }
    Ok(())
}

/// Fail if a string is shorter than the minimum length.
pub fn require_min_len(value: &str, min: usize, field: &str) -> AppResult<()> {
    if value.len() < min {
        return Err(AppError::Validation(format!(
            "Field '{}' must be at least {} characters",
            field, min
        )));
    }
    Ok(())
}

/// Fail if a numeric value is not positive (> 0).
pub fn require_positive(value: f64, field: &str) -> AppResult<()> {
    if value <= 0.0 {
        return Err(AppError::Validation(format!(
            "Field '{}' must be greater than zero, got {}",
            field, value
        )));
    }
    Ok(())
}

/// Fail if a numeric value is negative.
pub fn require_non_negative(value: f64, field: &str) -> AppResult<()> {
    if value < 0.0 {
        return Err(AppError::Validation(format!(
            "Field '{}' must not be negative, got {}",
            field, value
        )));
    }
    Ok(())
}

/// Fail if a string exceeds a maximum length.
pub fn require_max_len(value: &str, max: usize, field: &str) -> AppResult<()> {
    if value.len() > max {
        return Err(AppError::Validation(format!(
            "Field '{}' must not exceed {} characters",
            field, max
        )));
    }
    Ok(())
}

/// Fail if a value is not in an allowed set.
pub fn require_one_of<'a>(value: &str, allowed: &[&'a str], field: &str) -> AppResult<()> {
    if !allowed.contains(&value) {
        return Err(AppError::Validation(format!(
            "Field '{}' must be one of {:?}, got '{}'",
            field, allowed, value
        )));
    }
    Ok(())
}
