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

const KEYS = {
  autoBackup: 'apex_auto_backup',
  backupFreq: 'apex_backup_freq',
  backupLocation: 'apex_backup_loc',
  backupRetention: 'apex_backup_ret',
  encryptBackups: 'apex_encrypt_bk',
  backupHistory: 'apex_backup_history',
} as const;

export function loadBackupLocalPreferences(): BackupLocalPreferences {
  return {
    autoBackup: JSON.parse(localStorage.getItem(KEYS.autoBackup) || 'false'),
    backupFreq: localStorage.getItem(KEYS.backupFreq) || 'weekly',
    backupLocation: localStorage.getItem(KEYS.backupLocation) || '/backups',
    backupRetention: parseInt(localStorage.getItem(KEYS.backupRetention) || '30'),
    encryptBackups: JSON.parse(localStorage.getItem(KEYS.encryptBackups) || 'false'),
    backupHistory: JSON.parse(localStorage.getItem(KEYS.backupHistory) || '[]'),
  };
}

export function setBackupAutoBackup(value: boolean): void {
  localStorage.setItem(KEYS.autoBackup, JSON.stringify(value));
}

export function setBackupFrequency(value: string): void {
  localStorage.setItem(KEYS.backupFreq, value);
}

export function setBackupLocation(value: string): void {
  localStorage.setItem(KEYS.backupLocation, value);
}

export function setBackupRetention(value: number): void {
  localStorage.setItem(KEYS.backupRetention, String(value));
}

export function setBackupEncryptBackups(value: boolean): void {
  localStorage.setItem(KEYS.encryptBackups, JSON.stringify(value));
}

export function setBackupHistory(value: BackupHistoryEntry[]): void {
  localStorage.setItem(KEYS.backupHistory, JSON.stringify(value));
}
