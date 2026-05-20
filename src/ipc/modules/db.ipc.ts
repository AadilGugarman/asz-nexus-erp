/**
 * ipc/modules/db.ipc.ts
 * Frontend IPC module for database commands.
 *
 * Currently a stub — expands when tauri-plugin-sql is wired on the Rust side.
 *
 * Usage:
 *   import { ipc } from '@/ipc';
 *   const stats = await ipc.db.getStats();
 *   console.log(stats.status); // 'not_connected' until plugin is ready
 */

import { ipcInvoke } from '../invoke';
import { CMD } from '../commands';
import type { DbStats } from '../types';

export const dbIpc = {
  /**
   * Returns the current database connection status.
   * Use this to check if SQLite is ready before running queries.
   */
  getStats(): Promise<DbStats> {
    return ipcInvoke<DbStats>(
      CMD.db.getStats,
      undefined,
      // Browser fallback
      {
        status: 'not_connected',
        employees: { total: 0, active: 0, inactive: 0 },
      },
    );
  },
};
