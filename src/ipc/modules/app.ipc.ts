/**
 * ipc/modules/app.ipc.ts
 * Frontend IPC module for app-level commands.
 *
 * Usage:
 *   import { ipc } from '@/ipc';
 *   const info = await ipc.app.getAppInfo();
 *   const pong = await ipc.app.ping('hello');
 */

import { ipcInvoke } from '../invoke';
import { CMD } from '../commands';
import type { AppInfo } from '../types';

export const appIpc = {
  /**
   * Fetch static app metadata from the Rust backend.
   * Returns name, version, tauri_version, debug flag.
   */
  getAppInfo(): Promise<AppInfo> {
    return ipcInvoke<AppInfo>(
      CMD.app.getAppInfo,
      undefined,
      // Browser fallback — matches AppInfo shape
      {
        name: 'ASZ Nexus ERP',
        version: '0.0.0-dev',
        tauri_version: 'N/A',
        debug: true,
        build_stamp: 'dev',
      },
    );
  },
};
