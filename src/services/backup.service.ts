/**
 * services/backup.service.ts
 * Production-grade backup orchestration layer.
 *
 * Responsibilities:
 *   - createBackup()  — manual & auto backup with pruning
 *   - restoreBackup() — full safety flow (validate → rollback → restore → verify)
 *   - deleteBackup()  — delete a backup entry from disk + store
 *   - loadBackups()   — populate store from disk on startup
 *   - loadBackupDir() — resolve and cache the backups directory path
 *   - startScheduler() / stopScheduler() — auto-backup cron via setInterval
 *
 * This module does NOT import React — it is safe to call from anywhere.
 * It reads/writes the useBackupStore directly.
 *
 * Usage:
 *   // On app startup
 *   await backupService.init();
 *
 *   // Manual backup from a button handler
 *   await backupService.createBackup({ label: 'Manual' });
 *
 *   // Restore flow
 *   await backupService.restoreBackup(entry.filename);
 */

import { toast } from 'sonner';
import { ipc } from '@/ipc';
import { IpcCallError } from '@/ipc';
import { useBackupStore } from '@/store';
import type { BackupFrequency } from '@/store';
import { APP_CONFIG } from '@/config';
import { invalidateStartupCache } from '@/store/settings.store';

// ── Schedule intervals ────────────────────────────────────────────────────────

const FREQ_MS: Record<BackupFrequency, number> = {
  hourly:  60 * 60 * 1_000,
  daily:   24 * 60 * 60 * 1_000,
  weekly:  7 * 24 * 60 * 60 * 1_000,
  monthly: 30 * 24 * 60 * 60 * 1_000,
};

// ── Internal scheduler state ──────────────────────────────────────────────────

let _schedulerTimer: ReturnType<typeof setInterval> | null = null;
let _initialized = false;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Whether the app is running inside Tauri (real filesystem available). */
const isTauri = APP_CONFIG.isTauri;

/** Get the latest store snapshot without subscribing to re-renders. */
function store() {
  return useBackupStore.getState();
}

// ── Public API ────────────────────────────────────────────────────────────────

export const backupService = {
  /**
   * Initialize the backup service.
   * Call once on app startup (e.g. inside App.tsx or a startup service).
   * Safe to call multiple times — idempotent.
   */
  async init(): Promise<void> {
    if (_initialized) return;
    _initialized = true;

    if (!isTauri) {
      console.info('[backup] Not in Tauri — service running in no-op mode');
      return;
    }

    try {
      await backupService.loadBackupDir();
      await backupService.loadBackups();
    } catch (err) {
      console.error('[backup] Init failed:', err);
      if (import.meta.env.DEV) console.warn('[backup] Init error (dev details):', err);
    }

    // Restart scheduler based on persisted preferences
    const { autoBackup, backupFreq } = store();
    if (autoBackup) {
      backupService.startScheduler(backupFreq);
    }
  },

  /**
   * Resolve and cache the backups directory path.
   */
  async loadBackupDir(): Promise<void> {
    if (!isTauri) return;
    try {
      const dir = await ipc.backup.getDir();
      store().setBackupDir(dir);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[backup] Failed to resolve backup dir:', err);
    }
  },

  /**
   * Refresh the backup list from disk into the store.
   */
  async loadBackups(): Promise<void> {
    if (!isTauri) return;
    const s = store();
    s.setIsLoadingList(true);
    s.setLastError(null);
    try {
      const entries = await ipc.backup.list();
      s.setEntries(entries);
    } catch (err) {
      const msg = err instanceof IpcCallError ? err.message : 'Failed to load backups';
      s.setLastError(msg);
      if (import.meta.env.DEV) console.error('[backup] loadBackups error:', err);
    } finally {
      s.setIsLoadingList(false);
    }
  },

  /**
   * Create a backup snapshot.
   *
   * @param options.label  - Label shown in backup history. Defaults to "Manual".
   * @param options.silent - When true, suppresses toast notifications (used by scheduler).
   */
  async createBackup(options: { label?: string; silent?: boolean } = {}): Promise<void> {
    if (!isTauri) {
      toast.info('Backup unavailable in browser mode');
      return;
    }

    const { label = 'Manual', silent = false } = options;
    const s = store();

    if (s.isCreating) return; // debounce concurrent calls

    s.setIsCreating(true);
    s.setLastError(null);

    const loadingToastId = silent ? undefined : toast.loading(`Creating ${label} backup…`);

    try {
      const entry = await ipc.backup.create({
        label,
        retain: s.backupRetention,
      });

      // Reload full list so pruned entries are reflected accurately
      await backupService.loadBackups();

      if (!silent) {
        toast.dismiss(loadingToastId);
        toast.success('Backup Created', {
          description: `${entry.filename} — ${entry.size_display}`,
        });
      }
    } catch (err) {
      const msg = err instanceof IpcCallError ? err.message : 'Backup creation failed';
      s.setLastError(msg);

      if (!silent) {
        toast.dismiss(loadingToastId);
        toast.error('Backup Failed', { description: msg });
      } else {
        console.error('[backup] Scheduled backup failed:', err);
      }
    } finally {
      s.setIsCreating(false);
    }
  },

  /**
   * Restore the database from a specific backup.
   *
   * Safety flow:
   *   1. Validate backup integrity via Rust
   *   2. Rust creates automatic pre-restore rollback snapshot
   *   3. Rust restores via SQLite online backup API
   *   4. Rust verifies restored DB integrity
   *   5. On failure, Rust rolls back automatically
   *   6. UI notifies outcome
   */
  async restoreBackup(filename: string): Promise<void> {
    if (!isTauri) {
      toast.info('Restore unavailable in browser mode');
      return;
    }

    const s = store();

    if (s.isRestoring) return;
    s.setIsRestoring(true);
    s.setLastError(null);

    const loadingToastId = toast.loading('Restoring database…');

    try {
      // Step 1: Quick client-side validate before the round-trip restore
      const isValid = await ipc.backup.validate({ filename });
      if (!isValid) {
        throw new IpcCallError({
          code: 'VALIDATION_ERROR',
          message: 'Backup file failed integrity check and cannot be restored.',
        });
      }

      // Step 2: Restore (Rust handles rollback internally on failure)
      const result = await ipc.backup.restore({ filename });

      toast.dismiss(loadingToastId);
      toast.success('Database Restored', {
        description: result.message,
      });

      // Invalidate the localStorage startup cache so the next cold start
      // reads fresh data from the restored SQLite DB instead of stale cache.
      invalidateStartupCache();

      // Reload backup list — restore creates a new PreRestore entry
      await backupService.loadBackups();

      // Reload the app after a short delay so all stores re-hydrate from the restored DB
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      const msg = err instanceof IpcCallError ? err.message : 'Restore failed';
      s.setLastError(msg);

      toast.dismiss(loadingToastId);
      toast.error('Restore Failed', {
        description: msg,
      });
    } finally {
      s.setIsRestoring(false);
    }
  },

  /**
   * Delete a backup file from disk and remove it from the store.
   */
  async deleteBackup(filename: string): Promise<void> {
    if (!isTauri) {
      // In browser mode, just remove from store
      store().removeEntry(filename);
      return;
    }

    try {
      await ipc.backup.delete({ filename });
      store().removeEntry(filename);
      toast.info('Backup Deleted', { description: filename });
    } catch (err) {
      const msg = err instanceof IpcCallError ? err.message : 'Failed to delete backup';
      toast.error('Delete Failed', { description: msg });
    }
  },

  /**
   * Start the automatic backup scheduler.
   * Replaces any previously running scheduler.
   *
   * @param freq - Backup interval ("hourly" | "daily" | "weekly" | "monthly")
   */
  startScheduler(freq: BackupFrequency): void {
    backupService.stopScheduler();

    const interval = FREQ_MS[freq] ?? FREQ_MS.daily;

    _schedulerTimer = setInterval(() => {
      backupService.createBackup({ label: 'Auto', silent: true });
    }, interval);

    console.info(`[backup] Scheduler started — interval: ${freq} (${interval}ms)`);
  },

  /**
   * Stop the automatic backup scheduler if running.
   */
  stopScheduler(): void {
    if (_schedulerTimer !== null) {
      clearInterval(_schedulerTimer);
      _schedulerTimer = null;
      console.info('[backup] Scheduler stopped');
    }
  },

  /**
   * Apply a new auto-backup preference:
   *   - persist it via the store
   *   - start or stop the scheduler accordingly
   */
  applyAutoBackupPreference(enabled: boolean, freq: BackupFrequency): void {
    const s = store();
    s.setAutoBackup(enabled);
    s.setBackupFreq(freq);

    if (enabled) {
      backupService.startScheduler(freq);
    } else {
      backupService.stopScheduler();
    }
  },
} as const;
