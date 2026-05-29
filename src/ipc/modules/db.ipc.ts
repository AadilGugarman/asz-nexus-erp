/**
 * ipc/modules/db.ipc.ts
 * Frontend IPC module for database commands.
 *
 * Usage:
 *   import { ipc } from '@/ipc';
 *   const stats = await ipc.db.getStats();
 */

import { ipcInvoke } from "../invoke";
import { CMD } from "../commands";
import type { DbStats } from "../types";

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
        status: "not_connected",
        employees: { total: 0, active: 0, inactive: 0 },
      },
    );
  },

  /**
   * Company-scoped reset — deletes only rows belonging to the given company.
   * Production-safe: other companies' data is never touched.
   */
  resetCompanyData(
    companyId: string,
  ): Promise<{ deleted_counts: Record<string, number>; reset_at: string }> {
    return ipcInvoke(
      CMD.db.resetCompanyData,
      { payload: { company_id: companyId } },
      {
        deleted_counts: {},
        reset_at: new Date().toISOString(),
      },
    );
  },
};
