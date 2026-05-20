/**
 * ipc/modules/system.ipc.ts
 * Frontend IPC module for system-level commands.
 *
 * Usage:
 *   import { ipc } from '@/ipc';
 *   const info = await ipc.system.getSystemInfo();
 *   const paths = await ipc.system.getAppPaths();
 */

import { ipcInvoke } from '../invoke';
import { CMD } from '../commands';
import type { SystemInfo, AppPaths } from '../types';

export const systemIpc = {
  /**
   * Returns OS name, architecture, and locale.
   */
  getSystemInfo(): Promise<SystemInfo> {
    return ipcInvoke<SystemInfo>(
      CMD.system.getSystemInfo,
      undefined,
      {
        os: 'browser',
        os_version: '',
        arch: 'unknown',
        locale: 'en-IN',
      },
    );
  },

  /**
   * Returns resolved app data, config, and log directory paths.
   */
  getAppPaths(): Promise<AppPaths> {
    return ipcInvoke<AppPaths>(
      CMD.system.getAppPaths,
      undefined,
      {
        app_data_dir: '',
        app_config_dir: '',
        app_log_dir: '',
      },
    );
  },
};
