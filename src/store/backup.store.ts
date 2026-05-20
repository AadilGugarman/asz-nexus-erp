/**
 * store/backup.store.ts
 * Zustand store for the backup & restore system.
 *
 * Owns all runtime state: backup list, loading flags, settings.
 * The backup.service.ts (scheduler, action orchestration) consumes this store.
 *
 * Persisted fields (localStorage key: "asz_backup_prefs"):
 *   autoBackup, backupFreq, backupRetention, encryptBackups
 *
 * Non-persisted fields (cleared on app restart):
 *   entries, isCreating, isRestoring, lastError
 *
 * Usage:
 *   import { useBackupStore } from '@/store';
 *   const { entries, createBackup, restoreBackup } = useBackupStore();
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BackupEntry } from '@/ipc/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type BackupFrequency = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface BackupPrefs {
  autoBackup: boolean;
  backupFreq: BackupFrequency;
  backupRetention: number;
  encryptBackups: boolean;
}

interface BackupState extends BackupPrefs {
  // Runtime state (not persisted)
  entries: BackupEntry[];
  isCreating: boolean;
  isRestoring: boolean;
  isLoadingList: boolean;
  lastError: string | null;
  backupDir: string | null;

  // Actions — implemented by backup.service.ts, bound here
  setEntries: (entries: BackupEntry[]) => void;
  appendEntry: (entry: BackupEntry) => void;
  removeEntry: (filename: string) => void;
  setIsCreating: (v: boolean) => void;
  setIsRestoring: (v: boolean) => void;
  setIsLoadingList: (v: boolean) => void;
  setLastError: (msg: string | null) => void;
  setBackupDir: (dir: string) => void;

  // Preference setters (persisted)
  setAutoBackup: (v: boolean) => void;
  setBackupFreq: (v: BackupFrequency) => void;
  setBackupRetention: (v: number) => void;
  setEncryptBackups: (v: boolean) => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useBackupStore = create<BackupState>()(
  persist(
    (set) => ({
      // ── Persisted preferences ──────────────────────────────────────────────
      autoBackup: false,
      backupFreq: 'daily',
      backupRetention: 30,
      encryptBackups: false,

      // ── Runtime state (not persisted — reset on app start) ─────────────────
      entries: [],
      isCreating: false,
      isRestoring: false,
      isLoadingList: false,
      lastError: null,
      backupDir: null,

      // ── Runtime setters ────────────────────────────────────────────────────
      setEntries: (entries) => set({ entries }),
      appendEntry: (entry) =>
        set((s) => ({ entries: [entry, ...s.entries] })),
      removeEntry: (filename) =>
        set((s) => ({ entries: s.entries.filter((e) => e.filename !== filename) })),
      setIsCreating: (v) => set({ isCreating: v }),
      setIsRestoring: (v) => set({ isRestoring: v }),
      setIsLoadingList: (v) => set({ isLoadingList: v }),
      setLastError: (msg) => set({ lastError: msg }),
      setBackupDir: (dir) => set({ backupDir: dir }),

      // ── Preference setters ─────────────────────────────────────────────────
      setAutoBackup: (v) => set({ autoBackup: v }),
      setBackupFreq: (v) => set({ backupFreq: v }),
      setBackupRetention: (v) => set({ backupRetention: Math.max(1, Math.min(365, v)) }),
      setEncryptBackups: (v) => set({ encryptBackups: v }),
    }),
    {
      name: 'asz_backup_prefs',
      storage: createJSONStorage(() => localStorage),
      // Only persist preferences — runtime state is always re-fetched from Rust
      partialize: (s): BackupPrefs => ({
        autoBackup: s.autoBackup,
        backupFreq: s.backupFreq,
        backupRetention: s.backupRetention,
        encryptBackups: s.encryptBackups,
      }),
    },
  ),
);
