/**
 * ipc/modules/backup.ipc.ts
 * Typed IPC wrappers for the Rust backup commands.
 *
 * All methods return strongly-typed data; errors surface as IpcCallError.
 *
 * Usage:
 *   import { ipc } from '@/ipc';
 *
 *   // Create a manual backup (retain last 30)
 *   const entry = await ipc.backup.create({ label: 'Manual', retain: 30 });
 *
 *   // List all backups
 *   const entries = await ipc.backup.list();
 *
 *   // Restore from a backup
 *   const result = await ipc.backup.restore({ filename: entry.filename });
 *
 *   // Delete a backup
 *   await ipc.backup.delete({ filename: entry.filename });
 */

import { ipcInvoke } from '../invoke';
import { CMD } from '../commands';
import type {
  BackupEntry,
  BackupCreateRequest,
  BackupDeleteRequest,
  BackupValidateRequest,
  BackupRestoreRequest,
  BackupPruneRequest,
  RestoreResult,
} from '../types';

export const backupIpc = {
  /**
   * Create a new backup snapshot.
   * @param label  - Displayed label in the backup history ("Manual", "Auto", …)
   * @param retain - If provided, old backups beyond this count are pruned automatically.
   */
  create(req: BackupCreateRequest = {}): Promise<BackupEntry> {
    return ipcInvoke<BackupEntry>(CMD.backup.create, req);
  },

  /** Return all backup entries sorted newest-first. */
  list(): Promise<BackupEntry[]> {
    return ipcInvoke<BackupEntry[]>(CMD.backup.list, {}, []);
  },

  /**
   * Run `PRAGMA quick_check` on a backup file and return whether it is valid.
   */
  validate(req: BackupValidateRequest): Promise<boolean> {
    return ipcInvoke<boolean>(CMD.backup.validate, req);
  },

  /** Permanently delete a backup file from disk. */
  delete(req: BackupDeleteRequest): Promise<void> {
    return ipcInvoke<void>(CMD.backup.delete, req);
  },

  /**
   * Restore the live database from a backup.
   * A pre-restore safety snapshot is created automatically.
   * Throws IpcCallError if the backup is corrupted or restore fails.
   */
  restore(req: BackupRestoreRequest): Promise<RestoreResult> {
    return ipcInvoke<RestoreResult>(CMD.backup.restore, req);
  },

  /**
   * Remove old backups keeping only the `keep` newest.
   * Returns how many files were deleted.
   */
  prune(req: BackupPruneRequest): Promise<number> {
    return ipcInvoke<number>(CMD.backup.prune, req);
  },

  /** Return the absolute path of the backups directory. */
  getDir(): Promise<string> {
    return ipcInvoke<string>(CMD.backup.getDir, {}, '');
  },
} as const;
