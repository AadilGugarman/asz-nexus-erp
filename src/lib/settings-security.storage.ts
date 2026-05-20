export interface SecurityLocalPreferences {
  sessionTimeout: string;
  twoFactorEnabled: boolean;
  allowExport: boolean;
  auditLog: boolean;
  dbEncryption: boolean;
}

import { useSecurityStore } from '@/store/security.store';

export function loadSecurityLocalPreferences(): SecurityLocalPreferences {
  const state = useSecurityStore.getState();
  return {
    sessionTimeout: state.sessionTimeout,
    twoFactorEnabled: state.twoFactorEnabled,
    allowExport: state.allowExport,
    auditLog: state.auditLog,
    dbEncryption: state.dbEncryption,
  };
}

export function setSecuritySessionTimeout(value: string): void {
  useSecurityStore.getState().setSessionTimeout(value);
}

export function setSecurityTwoFactorEnabled(value: boolean): void {
  useSecurityStore.getState().setTwoFactorEnabled(value);
}

export function setSecurityAllowExport(value: boolean): void {
  useSecurityStore.getState().setAllowExport(value);
}

export function setSecurityAuditLog(value: boolean): void {
  useSecurityStore.getState().setAuditLog(value);
}

export function setSecurityDbEncryption(value: boolean): void {
  useSecurityStore.getState().setDbEncryption(value);
}
