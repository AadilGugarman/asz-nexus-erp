export interface SecurityLocalPreferences {
  sessionTimeout: string;
  twoFactorEnabled: boolean;
  allowExport: boolean;
  auditLog: boolean;
  dbEncryption: boolean;
}

const KEYS = {
  sessionTimeout: 'apex_session_timeout',
  twoFactorEnabled: 'apex_2fa',
  allowExport: 'apex_allow_export',
  auditLog: 'apex_audit_log',
  dbEncryption: 'apex_db_encrypt',
} as const;

export function loadSecurityLocalPreferences(): SecurityLocalPreferences {
  return {
    sessionTimeout: localStorage.getItem(KEYS.sessionTimeout) || '60',
    twoFactorEnabled: localStorage.getItem(KEYS.twoFactorEnabled) === 'true',
    allowExport: localStorage.getItem(KEYS.allowExport) !== 'false',
    auditLog: localStorage.getItem(KEYS.auditLog) === 'true',
    dbEncryption: localStorage.getItem(KEYS.dbEncryption) === 'true',
  };
}

export function setSecuritySessionTimeout(value: string): void {
  localStorage.setItem(KEYS.sessionTimeout, value);
}

export function setSecurityTwoFactorEnabled(value: boolean): void {
  localStorage.setItem(KEYS.twoFactorEnabled, String(value));
}

export function setSecurityAllowExport(value: boolean): void {
  localStorage.setItem(KEYS.allowExport, String(value));
}

export function setSecurityAuditLog(value: boolean): void {
  localStorage.setItem(KEYS.auditLog, String(value));
}

export function setSecurityDbEncryption(value: boolean): void {
  localStorage.setItem(KEYS.dbEncryption, String(value));
}
