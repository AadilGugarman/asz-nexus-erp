# Security Audit - Recommended Fixes

## Overview
This document provides concrete, copy-paste-ready fixes for the security findings in the ASZ Nexus ERP application.

---

## Issue #1: SQL String Formatting in Backup (MEDIUM)

**File:** `src-tauri/src/commands/backup.rs`  
**Line:** 222  
**Risk:** SQL injection if path contains single quotes (unlikely but defense-in-depth)

### Current Code
```rust
let path_str = backup_path.to_string_lossy().replace('\\', "/");
conn.execute_batch(&format!("VACUUM INTO '{path_str}';"))?;
```

### Fixed Code
```rust
let path_str = backup_path.to_string_lossy().replace('\\', "/");
// Escape single quotes for SQLite (double them)
let escaped_path = path_str.replace('\'', "''");
conn.execute_batch(&format!("VACUUM INTO '{}';", escaped_path))?;
```

### Alternative (Even More Defensive)
```rust
// Use path URI format which has stricter parsing
let path_str = backup_path.to_string_lossy().replace('\\', "/");
let escaped_path = path_str.replace('\'', "''");
let uri = format!("'{}?mode=ro'", escaped_path);
conn.execute_batch(&format!("VACUUM INTO {};", uri))?;
```

### Testing
```rust
#[test]
fn test_backup_path_with_quotes() {
    let path = "/some/path/with'quote/backup.db";
    let escaped = path.replace('\'', "''");
    assert_eq!(escaped, "/some/path/with''quote/backup.db");
}
```

---

## Issue #2: Add Quote Escaping at Line 363 (MEDIUM)

**File:** `src-tauri/src/commands/backup.rs`  
**Line:** 363 (Pre-restore rollback snapshot)

### Current Code
```rust
conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")?;
conn.execute_batch(&format!("VACUUM INTO '{rp}';"))?;
```

### Fixed Code
```rust
conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")?;
let escaped_rollback = rp.replace('\\', "/").replace('\'', "''");
conn.execute_batch(&format!("VACUUM INTO '{}';", escaped_rollback))?;
```

---

## Issue #3: Rate Limiting on Auth (MEDIUM PRIORITY)

This should be implemented in v1.1, but here's the complete implementation for v1.0.1 if needed.

### Step 1: Update Auth Store Structure

**File:** `src-tauri/src/auth/store.rs`

Add fields to `AuthStore`:
```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthStore {
    pub setup_done: bool,
    pub password_hash: Option<String>,
    pub refresh_jti: Option<String>,
    
    // Rate limiting fields
    #[serde(default)]
    pub failed_attempts: u32,
    
    #[serde(default)]
    pub locked_until: Option<i64>,  // Unix timestamp
    
    #[serde(default)]
    pub last_attempt: Option<i64>,  // Unix timestamp for timestamp-based limiting
}

impl Default for AuthStore {
    fn default() -> Self {
        Self {
            setup_done: false,
            password_hash: None,
            refresh_jti: None,
            failed_attempts: 0,
            locked_until: None,
            last_attempt: None,
        }
    }
}
```

### Step 2: Update Auth Command

**File:** `src-tauri/src/commands/auth.rs`

Replace the `auth_login` function:
```rust
#[tauri::command]
pub async fn auth_login(
    payload: LoginRequest,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
) -> AppResult<IpcResponse<AuthTokenResponse>> {
    use chrono::Utc;
    
    validation::require_non_empty(&payload.password, "password")?;

    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| AppError::Internal(format!("Cannot resolve app data dir: {e}")))?;

    let mut auth_store = store::load(&app_data_dir)?;

    // Check if account is locked due to too many failed attempts
    if let Some(locked_until) = auth_store.locked_until {
        let now = Utc::now().timestamp();
        if locked_until > now {
            let remaining = locked_until - now;
            return Ok(IpcResponse::err(
                "ACCOUNT_LOCKED",
                format!("Account locked. Try again in {} seconds.", remaining),
            ));
        } else {
            // Lock period expired, reset
            auth_store.locked_until = None;
            auth_store.failed_attempts = 0;
        }
    }

    // Progressive delay based on failed attempts
    if auth_store.failed_attempts > 0 {
        let delay_secs = std::cmp::min(
            2_u64.pow(auth_store.failed_attempts - 1) as u64,
            120, // Max 2 minute delay
        );
        std::thread::sleep(std::time::Duration::from_secs(delay_secs));
    }

    // Check password
    let password_hash = auth_store.password_hash.as_ref()
        .ok_or_else(|| AppError::PermissionDenied("Setup not completed".to_string()))?;

    match password::verify(&payload.password, password_hash)? {
        true => {
            // Password correct - reset failed attempts
            auth_store.failed_attempts = 0;
            auth_store.locked_until = None;
            auth_store.last_attempt = Some(Utc::now().timestamp());
            store::save(&app_data_dir, &auth_store)?;

            // Issue new token pair
            let secret = store::get_or_create_jwt_secret(&app_data_dir)?;
            let pair = tokens::issue("admin", "admin", &secret)?;
            let jti = extract_jti(&pair.refresh_token, &secret)?;

            auth_store.refresh_jti = Some(jti);
            store::save(&app_data_dir, &auth_store)?;

            let claims = tokens::validate_access(&pair.access_token, &secret)?;
            state.session.set_access_token(pair.access_token.clone(), claims);

            Ok(IpcResponse::ok(AuthTokenResponse {
                access_token: pair.access_token,
                refresh_token: pair.refresh_token,
                access_expires_at: pair.access_expires_at,
                refresh_expires_at: pair.refresh_expires_at,
                user_id: "admin".to_string(),
                role: "admin".to_string(),
            }))
        }
        false => {
            // Password incorrect - increment failed attempts
            auth_store.failed_attempts += 1;

            // Lock account after 5 failures for 30 minutes
            if auth_store.failed_attempts >= 5 {
                auth_store.locked_until = Some(Utc::now().timestamp() + 1800); // 30 min
                store::save(&app_data_dir, &auth_store)?;

                return Ok(IpcResponse::err(
                    "ACCOUNT_LOCKED",
                    "Account locked after too many failed attempts. Try again in 30 minutes.",
                ));
            }

            auth_store.last_attempt = Some(Utc::now().timestamp());
            store::save(&app_data_dir, &auth_store)?;

            Ok(IpcResponse::err(
                "INVALID_PASSWORD",
                format!("Incorrect password. {} attempts remaining before lock.",
                    5 - auth_store.failed_attempts),
            ))
        }
    }
}
```

### Step 3: Update Frontend Error Handling

**File:** `src/store/auth.store.ts`

Update the login error handling:
```typescript
login: async (req) => {
  set({ isLoading: true, error: null });
  try {
    const resp: AuthTokenResponse = await ipc.auth.login(req);
    _applyTokens(set, resp);
  } catch (err) {
    const message = _msg(err);
    // Special handling for account locked
    if (err instanceof IpcCallError && err.code === 'ACCOUNT_LOCKED') {
      set({ error: message, isLoading: false });
      // Could show a countdown timer here
    } else {
      set({ error: message, isLoading: false });
    }
    throw err;
  }
},
```

---

## Issue #4: Recommend Refresh Token Storage

While not a critical fix, consider implementing Tauri secure storage in a future version.

### For v1.1: Add Tauri Secure Storage

**File:** `src-tauri/Cargo.toml`

Add dependency:
```toml
[dependencies]
tauri-plugin-store = "2"
```

**File:** `src-tauri/src/lib.rs`

Add plugin:
```rust
.plugin(tauri_plugin_store::Builder::default().build())
```

**File:** `src/store/auth.store.ts`

Update token storage:
```typescript
// Use Tauri store instead of localStorage (if available)
import { Store } from '@tauri-apps/plugin-store';

const secureStore = new Store('.auth.dat');

function saveRefreshToken(token: string, expiresAt: number): void {
  try {
    if (import.meta.env.TAURI) {
      // Tauri secure storage
      secureStore.set(REFRESH_TOKEN_KEY, token);
      secureStore.set(REFRESH_EXPIRY_KEY, expiresAt.toString());
    } else {
      // Fallback to localStorage for dev
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
      localStorage.setItem(REFRESH_EXPIRY_KEY, String(expiresAt));
    }
  } catch {
    // silent fail
  }
}
```

---

## Checklist for Production Release

- [ ] Apply SQL injection fix (Issue #1)
- [ ] Apply SQL injection fix (Issue #2)
- [ ] Run `npm audit` and fix any vulnerabilities
- [ ] Run `cargo audit` and fix any vulnerabilities
- [ ] Review SECURITY_AUDIT_REPORT.md
- [ ] Test all authentication flows
- [ ] Test backup/restore with large databases
- [ ] Create .env template for production
- [ ] Test build: `npm run build:prod`
- [ ] Verify source maps not in dist/
- [ ] Verify console statements removed from bundle
- [ ] Create production deployment guide
- [ ] Document rate limiting requirement for v1.1
- [ ] Have security-conscious team member review code

---

## Testing Commands

### Verify SQL Escaping Works
```bash
# In src-tauri/src/commands/backup.rs, add this test:
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_path_escaping() {
        let path = "backup_20260521_143022.db".to_string();
        let escaped = path.replace('\'', "''");
        assert_eq!(escaped, "backup_20260521_143022.db");
        
        let path_with_quote = "backup_20260521_143'022.db".to_string();
        let escaped = path_with_quote.replace('\'', "''");
        assert_eq!(escaped, "backup_20260521_143''022.db");
    }
}
```

Run:
```bash
cd src-tauri
cargo test
```

### Verify Build Configuration
```bash
npm run build:prod
# Check that:
# 1. dist/assets/*.js files are minified
# 2. No *.map files in dist/
# 3. console.log statements removed
unzip -l dist/*.zip | grep -E "\\.map|console" # Should be empty
```

---

## Security Checklist for v1.1+

### Authentication Hardening
- [ ] Implement rate limiting (5 failures → 30 min lock)
- [ ] Add password reset flow
- [ ] Add password strength validation (min 8 chars)
- [ ] Implement session timeout after inactivity

### Data Protection
- [ ] Consider encryption for sensitive fields
- [ ] Implement audit logging for all mutations
- [ ] Add data retention policies for old backups
- [ ] Encrypt database backups in transit (if syncing)

### Operational Security
- [ ] Implement security event logging
- [ ] Create incident response procedures
- [ ] Set up production monitoring
- [ ] Regular security audits (quarterly)
- [ ] Dependency update schedule (monthly)

---

## References

- [OWASP Desktop Application Security](https://cheatsheetseries.owasp.org/cheatsheets/Deskt
