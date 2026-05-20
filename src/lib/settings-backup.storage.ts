export interface BackupHistoryEntry {
  id: string;
  name: string;
  type: string;
  size: string;
  date: string;
  encrypted: boolean;
}

export interface BackupLocalPreferences {
  autoBackup: boolean;
  backupFreq: string;
  backupLocation: string;
  backupRetention: number;
  encryptBackups: boolean;
  backupHistory: BackupHistoryEntry[];
}

import { useBackupStore } from '@/store/backup.store';

export function loadBackupLocalPreferences(): BackupLocalPreferences {
  const state = useBackupStore.getState();
  return {
    autoBackup: state.autoBackup,
    backupFreq: state.backupFreq,
    backupLocation: state.backupLocation,
    backupRetention: state.backupRetention,
    encryptBackups: state.encryptBackups,
    backupHistory: state.entries.map((entry) => ({
      id: entry.id,
      name: entry.label,
      type: entry.label,
      size: entry.size_display,
      date: entry.created_at,
      encrypted: entry.is_valid,
    })),
  };
}

export function setBackupAutoBackup(value: boolean): void {
  useBackupStore.getState().setAutoBackup(value);
}

export function setBackupFrequency(value: string): void {
  useBackupStore.getState().setBackupFreq(value as import('@/store').BackupFrequency);
}

export function setBackupLocation(value: string): void {
  useBackupStore.getState().setBackupLocation(value);
}

export function setBackupRetention(value: number): void {
  useBackupStore.getState().setBackupRetention(value);
}

export function setBackupEncryptBackups(value: boolean): void {
  useBackupStore.getState().setEncryptBackups(value);
}

export function setBackupHistory(value: BackupHistoryEntry[]): void {
  useBackupStore.getState().setEntries(
    value.map((entry) => ({
      id: entry.id,
      filename: `${entry.name}.db`,
      label: entry.type,
      size_bytes: 0,
      size_display: entry.size,
      created_at: entry.date,
      path: '',
      is_valid: entry.encrypted,
    })),
  );
}
