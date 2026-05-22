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
import { useLockStore } from "./lock.store";
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
  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const status: SessionStatus = await ipc.auth.check();
      set({ isSetupDone: status.setup_done });

      if (import.meta.env.DEV) {
        console.log("[AuthStore] Initialized with setup_done:", status.setup_done);
      }

      if (!status.setup_done) {
        set({ isAuthenticated: false, isLoading: false });
        return;
      }

      const restored = await get().restoreSession();
      if (restored) {
        set({ isLoading: false });
        return;
      }

      set({
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        accessExpiresAt: null,
        sessionExpiresAt: null,
        user: null,
        isLoading: false,
      });
    } catch {
      set({
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        accessExpiresAt: null,
        sessionExpiresAt: null,
        user: null,
        isLoading: false,
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
  restoreSession: async () => {
    try {
      const resp: AuthTokenResponse = await ipc.auth.restoreSession();
      _applyTokens(set, resp);
      return true;
    } catch {
      return false;
    }
  },

  // ── refreshTokens ──────────────────────────────────────────────────────────
  refreshTokens: async () => {
    const refreshToken = get().refreshToken;
    if (!refreshToken) return false;

    try {
      const resp: AuthTokenResponse = await ipc.auth.refresh({
        refresh_token: refreshToken,
      });
      _applyTokens(set, resp);
      return true;
    } catch {
      get().invalidateSession();
      return false;
    }
  },

  // ── logout ─────────────────────────────────────────────────────────────────
  logout: async () => {
    try {
      await ipc.auth.logout();
    } catch {
      /* best-effort */
    }
    useLockStore.getState().clearSessionLock();
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
      /* best-effort */
    }
    localStorage.clear();
    window.location.reload();
  },

  invalidateSession: () => {
    useLockStore.getState().clearSessionLock();
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
