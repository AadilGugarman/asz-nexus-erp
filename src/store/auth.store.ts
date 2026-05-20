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
 *   - Access token  → Zustand memory only (lost on app restart → triggers refresh)
 *   - Refresh token → localStorage (persistent login between app restarts)
 *   - Password hash → Rust auth.json in app data dir (never touches frontend)
 *   - JWT secret    → Rust auth.json in app data dir (never touches frontend)
 *
 * Usage:
 *   const { isAuthenticated, login, logout, refreshTokens } = useAuthStore();
 */

import { create } from 'zustand';
import { ipc } from '@/ipc';
import { useLockStore } from './lock.store';
import type {
  AuthTokenResponse,
  SessionStatus,
  LoginRequest,
  SetupRequest,
  ChangePasswordRequest,
} from '@/ipc';

// ── Token storage keys ────────────────────────────────────────────────────────

const REFRESH_TOKEN_KEY = 'tfc_erp_rt';
const REFRESH_EXPIRY_KEY = 'tfc_erp_rt_exp';

// ── State shape ───────────────────────────────────────────────────────────────

export interface AuthUser {
  userId: string;
  role:   'admin' | 'manager' | 'staff';
}

interface AuthState {
  // ── Data ──────────────────────────────────────────────────────────────────
  accessToken:     string | null;
  accessExpiresAt: number | null;   // Unix timestamp
  user:            AuthUser | null;
  isAuthenticated: boolean;
  isSetupDone:     boolean;
  sessionExpiresAt: number | null; // refresh token expiry (unix timestamp)
  isLoading:       boolean;
  error:           string | null;

  // ── Actions ───────────────────────────────────────────────────────────────
  /** Called on app launch — checks session status and restores if possible. */
  initialize:      () => Promise<void>;
  /** First-run: create password and log in. */
  setup:           (req: SetupRequest) => Promise<void>;
  /** Verify password and obtain token pair. */
  login:           (req: LoginRequest) => Promise<void>;
  /** Rotate refresh token and get a new access token. */
  refreshTokens:   () => Promise<boolean>;
  /** Clear session and invalidate refresh token on the backend. */
  logout:          () => Promise<void>;
  /** Change password (requires active session). */
  changePassword:  (req: ChangePasswordRequest) => Promise<void>;
  /** Clears client-side auth/session state without backend IPC. */
  invalidateSession: () => void;
  /** Clear any displayed error. */
  clearError:      () => void;
}

// ── Refresh token helpers (localStorage) ─────────────────────────────────────

function saveRefreshToken(token: string, expiresAt: number): void {
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
    localStorage.setItem(REFRESH_EXPIRY_KEY, String(expiresAt));
  } catch {
    // localStorage unavailable — silent fail
  }
}

function loadRefreshToken(): { token: string; expiresAt: number } | null {
  try {
    const token     = localStorage.getItem(REFRESH_TOKEN_KEY);
    const expiresAt = localStorage.getItem(REFRESH_EXPIRY_KEY);
    if (!token || !expiresAt) return null;
    const exp = Number(expiresAt);
    // Discard if already expired
    if (exp < Math.floor(Date.now() / 1000)) {
      clearRefreshToken();
      return null;
    }
    return { token, expiresAt: exp };
  } catch {
    return null;
  }
}

function clearRefreshToken(): void {
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_EXPIRY_KEY);
  } catch { /* ignore */ }
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()((set, get) => ({
  accessToken:     null,
  accessExpiresAt: null,
  user:            null,
  isAuthenticated: false,
  isSetupDone:     false,
  sessionExpiresAt: null,
  isLoading:       true,   // true until initialize() completes
  error:           null,

  // ── initialize ─────────────────────────────────────────────────────────────
  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      // 1. Ask Rust for current session status
      const status: SessionStatus = await ipc.auth.check();

      set({ isSetupDone: status.setup_done });

      if (!status.setup_done) {
        set({ isLoading: false, sessionExpiresAt: null });
        return;
      }

      // 2. If Rust session is still valid (access token in memory), we're done
      if (status.authenticated && status.expires_in > 30) {
        const stored = loadRefreshToken();
        set({
          isAuthenticated: true,
          user: status.user_id
            ? { userId: status.user_id, role: (status.role ?? 'admin') as AuthUser['role'] }
            : null,
          sessionExpiresAt: stored?.expiresAt ?? null,
          isLoading: false,
        });
        return;
      }

      // 3. Try to restore from stored refresh token
      const stored = loadRefreshToken();
      if (stored) {
        const ok = await get().refreshTokens();
        if (ok) {
          set({ isLoading: false });
          return;
        }
      }

      // 4. No valid session — user must log in
      set({ isAuthenticated: false, sessionExpiresAt: null, isLoading: false });
    } catch {
      set({ isAuthenticated: false, sessionExpiresAt: null, isLoading: false });
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

  // ── refreshTokens ──────────────────────────────────────────────────────────
  refreshTokens: async () => {
    const stored = loadRefreshToken();
    if (!stored) return false;

    try {
      const resp: AuthTokenResponse = await ipc.auth.refresh({
        refresh_token: stored.token,
      });
      _applyTokens(set, resp);
      return true;
    } catch {
      // Refresh failed — clear stale token, force re-login
      clearRefreshToken();
      set({ isAuthenticated: false, accessToken: null, sessionExpiresAt: null, user: null });
      return false;
    }
  },

  // ── logout ─────────────────────────────────────────────────────────────────
  logout: async () => {
    try {
      await ipc.auth.logout();
    } catch { /* best-effort */ }
    clearRefreshToken();
    useLockStore.getState().clearSessionLock();
    set({
      accessToken:     null,
      accessExpiresAt: null,
      sessionExpiresAt: null,
      user:            null,
      isAuthenticated: false,
      error:           null,
    });
  },

  invalidateSession: () => {
    clearRefreshToken();
    useLockStore.getState().clearSessionLock();
    set({
      accessToken:     null,
      accessExpiresAt: null,
      sessionExpiresAt: null,
      user:            null,
      isAuthenticated: false,
      error:           null,
    });
  },

  // ── changePassword ─────────────────────────────────────────────────────────
  changePassword: async (req) => {
    set({ isLoading: true, error: null });
    try {
      await ipc.auth.changePassword(req);
      // Backend clears the session on password change — force re-login
      clearRefreshToken();
      set({
        accessToken:     null,
        accessExpiresAt: null,
        sessionExpiresAt: null,
        user:            null,
        isAuthenticated: false,
        isLoading:       false,
      });
    } catch (err) {
      set({ error: _msg(err), isLoading: false });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));

// ── Internal helpers ──────────────────────────────────────────────────────────

import type { StoreApi } from 'zustand';

type SetFn = StoreApi<AuthState>['setState'];

function _applyTokens(set: SetFn, resp: AuthTokenResponse): void {
  saveRefreshToken(resp.refresh_token, resp.refresh_expires_at);
  set({
    accessToken:     resp.access_token,
    accessExpiresAt: resp.access_expires_at,
    sessionExpiresAt: resp.refresh_expires_at,
    user:            { userId: resp.user_id, role: resp.role as AuthUser['role'] },
    isAuthenticated: true,
    isLoading:       false,
    error:           null,
  });
}

function _msg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
