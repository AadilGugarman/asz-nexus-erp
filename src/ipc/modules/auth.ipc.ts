/**
 * ipc/modules/auth.ipc.ts
 * Frontend IPC module for authentication commands.
 *
 * Usage:
 *   import { ipc } from '@/ipc';
 *
 *   // First-run setup
 *   const tokens = await ipc.auth.setup({ password: '...' });
 *
 *   // Login
 *   const tokens = await ipc.auth.login({ password: '...' });
 *
 *   // Refresh (called automatically by useAutoRefresh)
 *   const tokens = await ipc.auth.refresh({ refresh_token: '...' });
 *
 *   // Check session status on app resume
 *   const status = await ipc.auth.check();
 *
 *   // Logout
 *   await ipc.auth.logout();
 *
 *   // Change password
 *   await ipc.auth.changePassword({ current_password, new_password });
 */

import { ipcInvoke } from "../invoke";
import { CMD } from "../commands";
import { APP_CONFIG } from "@/config";
import type {
  AuthTokenResponse,
  SessionStatus,
  LoginRequest,
  SetupRequest,
  RefreshRequest,
  ChangePasswordRequest,
} from "../types";

const DEV_TOKEN_RESP: AuthTokenResponse = {
  access_token: "dev_access_token",
  refresh_token: "dev_refresh_token",
  access_expires_at: Math.floor(Date.now() / 1000) + 900,
  refresh_expires_at: Math.floor(Date.now() / 1000) + 2592000,
  user_id: "admin",
  role: "admin",
};

const DEV_STATUS: SessionStatus = {
  authenticated: true,
  setup_done: true,
  user_id: "admin",
  role: "admin",
  expires_in: 900,
};

const getDevStatus = (): SessionStatus => {
  const setupDone = localStorage.getItem("tfc_erp_setup_done") === "true";
  const authenticated =
    localStorage.getItem("tfc_erp_authenticated") === "true";
  return {
    authenticated,
    setup_done: setupDone,
    user_id: authenticated ? "admin" : null,
    role: authenticated ? "admin" : null,
    expires_in: authenticated ? 900 : 0,
  };
};

export const authIpc = {
  /**
   * Diagnostic: test if the IPC bridge is working.
   * Returns the current timestamp from Rust to verify real communication.
   */
  ping: (): Promise<{ timestamp: string; backend: string }> =>
    ipcInvoke<{ timestamp: string; backend: string }>(
      "auth_ping",
      {},
      { timestamp: new Date().toISOString(), backend: "browser-mock" },
    ),

  isSetupDone: (): Promise<boolean> =>
    ipcInvoke<boolean>(
      CMD.auth.isSetupDone,
      {},
      // Browser fallback: read from localStorage
      localStorage.getItem("tfc_erp_setup_done") === "true",
    ),

  setup: (req: SetupRequest): Promise<AuthTokenResponse> =>
    ipcInvoke<AuthTokenResponse>(
      CMD.auth.setup,
      { payload: req },
      {
        ...DEV_TOKEN_RESP,
      },
    ).then((res) => {
      if (!APP_CONFIG.isTauri) {
        // Store the password so browser-mode login can validate against it
        localStorage.setItem("tfc_erp_dev_password", req.password);
        localStorage.setItem("tfc_erp_setup_done", "true");
        localStorage.setItem("tfc_erp_authenticated", "true");
      }
      return res;
    }),

  login: (req: LoginRequest): Promise<AuthTokenResponse> => {
    // In Tauri mode: no fallback — Rust MUST verify the password.
    // Passing undefined means ipcInvoke throws NOT_IN_TAURI if somehow
    // called outside Tauri, making the failure loud and explicit.
    //
    // In browser dev mode: validate against the stored dev password so the
    // login screen is not completely bypassed. The stored password is set
    // during setup. If no password has been set yet, accept any non-empty
    // input so first-run still works.
    const browserFallback: AuthTokenResponse | undefined = APP_CONFIG.isTauri
      ? undefined
      : (() => {
          const storedPassword = localStorage.getItem("tfc_erp_dev_password");
          if (storedPassword && req.password !== storedPassword) {
            return undefined; // wrong password → ipcInvoke throws
          }
          return { ...DEV_TOKEN_RESP };
        })();

    return ipcInvoke<AuthTokenResponse>(
      CMD.auth.login,
      { payload: req },
      browserFallback,
    ).then((res) => {
      if (!APP_CONFIG.isTauri) {
        localStorage.setItem("tfc_erp_authenticated", "true");
      }
      return res;
    });
  },

  refresh: (req: RefreshRequest): Promise<AuthTokenResponse> =>
    // No fallback in Tauri — a failed refresh must force re-login.
    ipcInvoke<AuthTokenResponse>(
      CMD.auth.refresh,
      { payload: req },
      APP_CONFIG.isTauri ? undefined : DEV_TOKEN_RESP,
    ),

  restoreSession: (): Promise<AuthTokenResponse> => {
    // In Tauri mode: no fallback — if the refresh token is missing or
    // expired, the user MUST log in with their password. Passing undefined
    // ensures ipcInvoke throws on any failure, which restoreSession() in
    // auth.store.ts catches and converts to isAuthenticated: false.
    //
    // In browser dev mode: only restore if localStorage says authenticated.
    const authenticated =
      localStorage.getItem("tfc_erp_authenticated") === "true";
    const browserFallback = APP_CONFIG.isTauri
      ? undefined
      : authenticated
        ? DEV_TOKEN_RESP
        : undefined;

    return ipcInvoke<AuthTokenResponse>(
      CMD.auth.restoreSession,
      {},
      browserFallback,
    );
  },

  logout: (): Promise<boolean> =>
    ipcInvoke<boolean>(CMD.auth.logout, {}, true).then((res) => {
      if (!APP_CONFIG.isTauri) {
        localStorage.removeItem("tfc_erp_authenticated");
      }
      return res;
    }),

  resetApp: (): Promise<boolean> =>
    ipcInvoke<boolean>(CMD.auth.resetApp, {}, true).then((res) => {
      if (!APP_CONFIG.isTauri) {
        localStorage.removeItem("tfc_erp_setup_done");
        localStorage.removeItem("tfc_erp_authenticated");
        localStorage.removeItem("tfc_erp_dev_password");
      }
      return res;
    }),

  check: (): Promise<SessionStatus> =>
    ipcInvoke<SessionStatus>(CMD.auth.check, {}, getDevStatus()),

  changePassword: (req: ChangePasswordRequest): Promise<boolean> =>
    // No fallback in Tauri — password change must be verified by Rust.
    ipcInvoke<boolean>(
      CMD.auth.changePassword,
      { payload: req },
      APP_CONFIG.isTauri ? undefined : true,
    ),
};
