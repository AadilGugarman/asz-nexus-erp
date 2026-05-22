import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/config";

export interface SecurityPreferences {
  sessionTimeout: string;
  twoFactorEnabled: boolean;
  allowExport: boolean;
  auditLog: boolean;
  dbEncryption: boolean;
}

interface SecurityState extends SecurityPreferences {
  setSessionTimeout: (value: string) => void;
  setTwoFactorEnabled: (value: boolean) => void;
  setAllowExport: (value: boolean) => void;
  setAuditLog: (value: boolean) => void;
  setDbEncryption: (value: boolean) => void;
}

const STORAGE_KEY = STORAGE_KEYS.securityPrefs;

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set) => ({
      sessionTimeout: "60",
      twoFactorEnabled: false,
      allowExport: true,
      auditLog: false,
      dbEncryption: false,

      setSessionTimeout: (value) => set({ sessionTimeout: value }),
      setTwoFactorEnabled: (value) => set({ twoFactorEnabled: value }),
      setAllowExport: (value) => set({ allowExport: value }),
      setAuditLog: (value) => set({ auditLog: value }),
      setDbEncryption: (value) => set({ dbEncryption: value }),
    }),
    {
      name: STORAGE_KEY,
    },
  ),
);
