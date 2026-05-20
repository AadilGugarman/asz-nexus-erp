/**
 * ipc/modules/updater.ipc.ts
 * Frontend IPC module for app update commands.
 *
 * Currently a stub — expands when tauri-plugin-updater is wired on the Rust side.
 *
 * Usage:
 *   import { ipc } from '@/ipc';
 *
 *   // Check for updates
 *   const result = await ipc.updater.check();
 *   if (result.available) {
 *     console.log(`Update available: ${result.latest_version}`);
 *   }
 *
 *   // Install pending update
 *   await ipc.updater.install();
 */

import { ipcInvoke } from '../invoke';
import { CMD } from '../commands';
import type { UpdateCheckResult, UpdateInstallResult } from '../types';

export const updaterIpc = {
  /**
   * Check whether a newer version is available.
   * Returns { available: false } until the updater plugin is wired.
   */
  check(): Promise<UpdateCheckResult> {
    return ipcInvoke<UpdateCheckResult>(
      CMD.updater.check,
      undefined,
      // Browser fallback
      {
        available: false,
        current_version: '0.0.0-dev',
        latest_version: null,
        release_notes: null,
      },
    );
  },

  /**
   * Download and install the pending update.
   * The app will restart automatically after installation.
   */
  install(): Promise<UpdateInstallResult> {
    return ipcInvoke<UpdateInstallResult>(
      CMD.updater.install,
      undefined,
      { started: false, message: 'DEV mode — updater not available' },
    );
  },
};
