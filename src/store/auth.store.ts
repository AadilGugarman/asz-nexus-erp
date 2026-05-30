/**
 * store/auth.store.ts
 * Zustand auth store — single source of truth for authentication state.
 *
 * Responsibilities:
 *   - Hold access token + claims in memory (never persisted to localStorage)
 *   - Persist refresh token to localStorage for app restart recovery
 *   - Drive login / logout / refresh flows
 *   - Expose reactive auth state to components and route guards
 *
 * Token storage strategy (desktop Tauri app):
 *   - Access token  → Zustand memory only for active runtime use
 *   - Refresh token → stored securely in Rust native app data storage
 *   - Password hash → Rust auth.json in app data dir (never touches frontend)
 *   - JWT secret    → Rust auth.json in app data dir (never touches frontend)
 *
 * Usage:
 *   const { isAuthenticated, login, logout, refreshTokens } = useAuthStore();
 */

import { create } from "zustand";
import { ipc } from "@/ipc";
import { startup } from "@/services/startup";
import type {
  AuthTokenResponse,
  SessionStatus,
  LoginRequest,
  SetupRequest,
  ChangePasswordRequest,
} from "@/ipc";

// ── State shape ───────────────────────────────────────────────────────────────

export interface AuthUser {
  userId: string;
  role: "admin" | "manager" | "staff";
}

interface AuthState {
  // ── Data ──────────────────────────────────────────────────────────────────
  accessToken: string | null;
  refreshToken: string | null;
  accessExpiresAt: number | null; // Unix timestamp
  user: AuthUser | null;
  isAuthenticated: boolean;
  isSetupDone: boolean;
  sessionExpiresAt: number | null; // refresh token expiry (unix timestamp)
  isLoading: boolean;
  error: string | null;

  // ── Actions ───────────────────────────────────────────────────────────────
  /** Called on app launch — checks session status and restores if possible. */
  initialize: () => Promise<void>;
  /** First-run: create password and log in. */
  setup: (req: SetupRequest) => Promise<void>;
  /** Verify password and obtain token pair. */
  login: (req: LoginRequest) => Promise<void>;
  /** Restore an existing session from secure native storage. */
  restoreSession: () => Promise<boolean>;
  /** Rotate refresh token and get a new access token. */
  refreshTokens: () => Promise<boolean>;
  /** Clear session and invalidate refresh token on the backend. */
  logout: () => Promise<void>;
  /** Change password (requires active session). */
  changePassword: (req: ChangePasswordRequest) => Promise<void>;
  /** DANGEROUS: Resets the app to a fresh state. */
  resetApp: () => Promise<void>;
  /** Clears client-side auth/session state without backend IPC. */
  invalidateSession: () => void;
  /** Clear any displayed error. */
  clearError: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken: null,
  refreshToken: null,
  accessExpiresAt: null,
  sessionExpiresAt: null,
  user: null,
  isAuthenticated: false,
  isSetupDone: false,
  isLoading: true,
  error: null,

  // ── initialize ─────────────────────────────────────────────────────────────
  // Optimized for speed: skip auth_check() and go straight to restoreSession().
  // This saves an IPC round-trip (~100-150ms) on every startup.
  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      // First, attempt to restore session from stored refresh token.
      // This also validates setup_done on the backend and rotates tokens.
      const restored = await get().restoreSession();
      if (restored) {
        // Success: user is authenticated and setup is done
        set({ isSetupDone: true, isLoading: false });
        if (import.meta.env.DEV) {
          console.debug("[AuthStore] Session restored from refresh token");
        }
        return;
      }

      // If restoreSession() failed, check if setup is even done.
      // This call is only made if the previous one failed, reducing hot-path latency.
      const status: SessionStatus = await ipc.auth.check();
      set({ isSetupDone: status.setup_done, isLoading: false });

      if (import.meta.env.DEV) {
        console.debug(
          "[AuthStore] Check after failed restore: setup_done=",
          status.setup_done,
        );
      }
      return;
    } catch (err) {
      // Fallback: authentication failed entirely
      set({
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        accessExpiresAt: null,
        sessionExpiresAt: null,
        user: null,
        isSetupDone: false,
        isLoading: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  // ── setup ──────────────────────────────────────────────────────────────────
  setup: async (req) => {
    set({ isLoading: true, error: null });
    try {
      const resp: AuthTokenResponse = await ipc.auth.setup(req);
      _applyTokens(set, resp);
      set({ isSetupDone: true });
    } catch (err) {
      set({ error: _msg(err), isLoading: false });
      throw err;
    }
  },

  // ── login ──────────────────────────────────────────────────────────────────
  login: async (req) => {
    set({ isLoading: true, error: null });
    try {
      const resp: AuthTokenResponse = await ipc.auth.login(req);
      _applyTokens(set, resp);
    } catch (err) {
      set({ error: _msg(err), isLoading: false });
      throw err;
    }
  },

  // ── restoreSession ─────────────────────────────────────────────────────────
  // Attempt to restore session using the stored refresh token.
  // This is the critical path on app startup — must be fast and reliable.
  restoreSession: async () => {
    try {
      const resp: AuthTokenResponse = await ipc.auth.restoreSession();
      _applyTokens(set, resp);
      return true;
    } catch (err) {
      // Log the failure for debugging, but don't spam console in production
      if (import.meta.env.DEV) {
        console.debug(
          "[AuthStore] Session restoration failed (expected on first run or after logout):",
          err instanceof Error ? err.message : String(err),
        );
      }
      return false;
    }
  },

  // ── refreshTokens ──────────────────────────────────────────────────────────
  // Rotate the refresh token and get a new access token.
  // Called proactively by useAutoRefresh before expiry, or on demand.
  refreshTokens: async () => {
    // Read token just-in-time to avoid stale reference (defensive)
    const refreshToken = get().refreshToken;
    if (!refreshToken) {
      if (import.meta.env.DEV) {
        console.debug("[AuthStore] No refresh token available for rotation");
      }
      return false;
    }

    try {
      const resp: AuthTokenResponse = await ipc.auth.refresh({
        refresh_token: refreshToken,
      });
      _applyTokens(set, resp);
      if (import.meta.env.DEV) {
        console.debug("[AuthStore] Token rotated successfully");
      }
      return true;
    } catch (err) {
      if (import.meta.env.DEV) {
        console.debug(
          "[AuthStore] Token refresh failed:",
          err instanceof Error ? err.message : String(err),
        );
      }
      get().invalidateSession();
      return false;
    }
  },

  // ── logout ─────────────────────────────────────────────────────────────────
  logout: async () => {
    // Attempt the backend logout up to 2 times. If both fail we still clear
    // the frontend state — but we log a warning because the refresh token
    // may still be valid on disk, meaning the next startup could auto-restore
    // the session. In practice this only happens if the app data dir is
    // unwritable, which is an OS-level problem.
    let logoutOk = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await ipc.auth.logout();
        logoutOk = true;
        break;
      } catch {
        if (attempt === 0) await new Promise((r) => setTimeout(r, 200));
      }
    }
    if (!logoutOk && import.meta.env.DEV) {
      console.warn(
        "[AuthStore] logout IPC failed after 2 attempts — " +
          "refresh token may still be valid on disk. " +
          "The user will need to log in again on next startup.",
      );
    }
    set({
      accessToken: null,
      refreshToken: null,
      accessExpiresAt: null,
      sessionExpiresAt: null,
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },

  resetApp: async () => {
    try {
      await ipc.auth.resetApp();
    } catch {
      /* best-effort — auth.json may already be gone */
    }
    // Clear all frontend storage: localStorage, sessionStorage, Cache API, IndexedDB.
    try {
      localStorage.clear();
    } catch {}
    try {
      sessionStorage.clear();
    } catch {}
    try {
      if (typeof caches !== "undefined") {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch {}
    try {
      if (
        typeof indexedDB !== "undefined" &&
        typeof (indexedDB as any).databases === "function"
      ) {
        const dbs = await (indexedDB as any).databases();
        await Promise.all(
          dbs.map((d: any) =>
            d.name
              ? new Promise((res) => {
                  const req = indexedDB.deleteDatabase(d.name);
                  req.onsuccess = () => res(null);
                  req.onerror = () => res(null);
                  req.onblocked = () => res(null);
                })
              : Promise.resolve(null),
          ),
        );
      }
    } catch {}

    // Reset all Zustand stores explicitly before navigating.
    // In Tauri's webview, window.location.reload/replace does NOT destroy
    // the JS context — module-level singletons keep their state. We must
    // zero them out so the startup sequence re-runs cleanly on next mount.
    const { useStartupStore, _resetInitFlag } = await import("./startup.store");
    const { useSettingsStore } = await import("./settings.store");
    const { useCompanyStore } = await import("./company.store");

    useStartupStore.setState({
      phase: "idle",
      uiReady: false,
      initialized: false,
      isDbReady: false,
      isAppReady: false,
      isHydrated: false,
      isBootstrapped: false,
      isRoutingReady: false,
      error: null,
      message: "Preparing application...",
    });

    // Reset the module-level init lock so the startup sequence re-runs
    // after the page reload. In Tauri's webview, window.location.replace
    // does NOT destroy the JS context — module singletons keep their state.
    _resetInitFlag();

    // Reset this store (auth) — isSetupDone must be false so routing goes to /setup
    set({
      accessToken: null,
      refreshToken: null,
      accessExpiresAt: null,
      sessionExpiresAt: null,
      user: null,
      isAuthenticated: false,
      isSetupDone: false,
      isLoading: true,
      error: null,
    });

    useSettingsStore.setState({
      companies: [],
      activeCompanyId: null,
      isLoaded: false,
    });
    useCompanyStore.setState({
      hasCompany: false,
      activeCompanyId: null,
      initialized: false,
    });

    // Force a full reload. Use replace then reload to avoid HMR keeping module state.
    try {
      window.location.replace(
        window.location.origin + window.location.pathname,
      );
      // Give the replace a moment to take effect, then reload forcibly.
      setTimeout(() => {
        try {
          window.location.reload();
        } catch {}
      }, 100);
    } catch {
      try {
        window.location.reload();
      } catch {}
    }
  },

  invalidateSession: () => {
    set({
      accessToken: null,
      refreshToken: null,
      accessExpiresAt: null,
      sessionExpiresAt: null,
      user: null,
      isAuthenticated: false,
      error: null,
    });
  },

  // ── changePassword ─────────────────────────────────────────────────────────
  changePassword: async (req) => {
    set({ isLoading: true, error: null });
    try {
      await ipc.auth.changePassword(req);
      get().invalidateSession();
      set({ isLoading: false });
    } catch (err) {
      set({ error: _msg(err), isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));

// ── Internal helpers ──────────────────────────────────────────────────────────

import type { StoreApi } from "zustand";

type SetFn = StoreApi<AuthState>["setState"];

function _applyTokens(set: SetFn, resp: AuthTokenResponse): void {
  set({
    accessToken: resp.access_token,
    refreshToken: resp.refresh_token,
    accessExpiresAt: resp.access_expires_at,
    sessionExpiresAt: resp.refresh_expires_at,
    user: { userId: resp.user_id, role: resp.role as AuthUser["role"] },
    isAuthenticated: true,
    isLoading: false,
    error: null,
  });

  void startup.afterLogin();
}

function _msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
