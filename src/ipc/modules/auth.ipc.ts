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
  LockConfigRequest,
  LockConfigResponse,
  VerifyPinRequest,
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
  isSetupDone: (): Promise<boolean> =>
    ipcInvoke<boolean>(
      CMD.auth.isSetupDone,
      {},
      localStorage.getItem("tfc_erp_setup_done") === "true",
    ),

  setup: (req: SetupRequest): Promise<AuthTokenResponse> =>
    ipcInvoke<AuthTokenResponse>(CMD.auth.setup, req, {
      ...DEV_TOKEN_RESP,
    }).then((res) => {
      if (!APP_CONFIG.isTauri) {
        localStorage.setItem("tfc_erp_setup_done", "true");
        localStorage.setItem("tfc_erp_authenticated", "true");
      }
      return res;
    }),

  login: (req: LoginRequest): Promise<AuthTokenResponse> =>
    ipcInvoke<AuthTokenResponse>(CMD.auth.login, req, {
      ...DEV_TOKEN_RESP,
    }).then((res) => {
      if (!APP_CONFIG.isTauri) {
        localStorage.setItem("tfc_erp_authenticated", "true");
      }
      return res;
    }),

  refresh: (req: RefreshRequest): Promise<AuthTokenResponse> =>
    ipcInvoke<AuthTokenResponse>(CMD.auth.refresh, req, DEV_TOKEN_RESP),

  restoreSession: (): Promise<AuthTokenResponse> => {
    const authenticated =
      localStorage.getItem("tfc_erp_authenticated") === "true";
    return ipcInvoke<AuthTokenResponse>(
      CMD.auth.restoreSession,
      {},
      authenticated ? DEV_TOKEN_RESP : (undefined as any),
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
      }
      return res;
    }),

  check: (): Promise<SessionStatus> =>
    ipcInvoke<SessionStatus>(CMD.auth.check, {}, getDevStatus()),

  changePassword: (req: ChangePasswordRequest): Promise<boolean> =>
    ipcInvoke<boolean>(CMD.auth.changePassword, req, true),

  getLockConfig: (): Promise<LockConfigResponse> =>
    ipcInvoke<LockConfigResponse>(
      CMD.auth.getLockConfig,
      {},
      { pin_enabled: false, auto_lock_minutes: 0 },
    ),

  setLockConfig: (req: LockConfigRequest): Promise<LockConfigResponse> =>
    ipcInvoke<LockConfigResponse>(CMD.auth.setLockConfig, req, {
      pin_enabled: false,
      auto_lock_minutes: 0,
    }),

  verifyPin: (req: VerifyPinRequest): Promise<boolean> =>
    ipcInvoke<boolean>(CMD.auth.verifyPin, req, true),
};
