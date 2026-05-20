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

import { ipcInvoke } from '../invoke';
import { CMD } from '../commands';
import type {
  AuthTokenResponse,
  SessionStatus,
  LoginRequest,
  SetupRequest,
  RefreshRequest,
  ChangePasswordRequest,
} from '../types';

const DEV_TOKEN_RESP: AuthTokenResponse = {
  access_token:       'dev_access_token',
  refresh_token:      'dev_refresh_token',
  access_expires_at:  Math.floor(Date.now() / 1000) + 900,
  refresh_expires_at: Math.floor(Date.now() / 1000) + 2592000,
  user_id:            'admin',
  role:               'admin',
};

const DEV_STATUS: SessionStatus = {
  authenticated: true,
  setup_done:    true,
  user_id:       'admin',
  role:          'admin',
  expires_in:    900,
};

export const authIpc = {
  isSetupDone: (): Promise<boolean> =>
    ipcInvoke<boolean>(CMD.auth.isSetupDone, {}, true),

  setup: (req: SetupRequest): Promise<AuthTokenResponse> =>
    ipcInvoke<AuthTokenResponse>(CMD.auth.setup, req, DEV_TOKEN_RESP),

  login: (req: LoginRequest): Promise<AuthTokenResponse> =>
    ipcInvoke<AuthTokenResponse>(CMD.auth.login, req, DEV_TOKEN_RESP),

  refresh: (req: RefreshRequest): Promise<AuthTokenResponse> =>
    ipcInvoke<AuthTokenResponse>(CMD.auth.refresh, req, DEV_TOKEN_RESP),

  logout: (): Promise<boolean> =>
    ipcInvoke<boolean>(CMD.auth.logout, {}, true),

  check: (): Promise<SessionStatus> =>
    ipcInvoke<SessionStatus>(CMD.auth.check, {}, DEV_STATUS),

  changePassword: (req: ChangePasswordRequest): Promise<boolean> =>
    ipcInvoke<boolean>(CMD.auth.changePassword, req, true),
};
