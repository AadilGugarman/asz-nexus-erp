// auth/guards.rs
#![allow(dead_code)]
// Command-level authentication guards.
//
// Usage in any command handler:
//
//   use crate::auth::guards;
//
//   #[tauri::command]
//   pub async fn some_protected_command(
//       state: tauri::State<'_, AppState>,
//   ) -> AppResult<IpcResponse<SomeData>> {
//       guards::require_auth(&state.session)?;
//       guards::require_role(&state.session, "admin")?;
//       // ... rest of handler
//   }

use crate::auth::session::Session;
use crate::error::{AppError, AppResult};

/// Fail with PERMISSION_DENIED if no valid session exists.
pub fn require_auth(session: &Session) -> AppResult<()> {
    if !session.is_authenticated() {
        return Err(AppError::PermissionDenied(
            "Authentication required. Please log in.".into(),
        ));
    }
    Ok(())
}

/// Fail if the authenticated user does not have the required role.
/// Role hierarchy: admin > manager > staff
pub fn require_role(session: &Session, required_role: &str) -> AppResult<()> {
    require_auth(session)?;

    let claims = session.claims().ok_or_else(|| {
        AppError::PermissionDenied("No session claims found".into())
    })?;

    if !role_satisfies(&claims.role, required_role) {
        return Err(AppError::PermissionDenied(format!(
            "Role '{}' required, but user has role '{}'",
            required_role, claims.role
        )));
    }

    Ok(())
}

/// Returns true if `user_role` satisfies the `required_role` level.
/// admin satisfies any role; manager satisfies manager/staff; staff only staff.
fn role_satisfies(user_role: &str, required_role: &str) -> bool {
    match required_role {
        "staff"   => matches!(user_role, "admin" | "manager" | "staff"),
        "manager" => matches!(user_role, "admin" | "manager"),
        "admin"   => user_role == "admin",
        _         => false,
    }
}
