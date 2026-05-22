import { create } from "zustand";
import { ipc } from "@/ipc";

type LockReason = "startup" | "inactivity" | null;

interface LockState {
  pinEnabled: boolean;
  autoLockMinutes: number;

  isLocked: boolean;
  lockReason: LockReason;
  lastActivityAt: number;

  configureSecurity: (input: {
    pinEnabled: boolean;
    appPin: string;
    autoLockMinutes: number;
  }) => Promise<void>;
  bootstrapForStartup: (isAuthenticated: boolean) => Promise<void>;
  lock: (reason: Exclude<LockReason, null>) => void;
  unlock: (pin: string) => Promise<boolean>;
  recordActivity: () => void;
  lockIfInactive: () => void;
  clearSessionLock: () => void;
}

export const useLockStore = create<LockState>()((set, get) => ({
  pinEnabled: false,
  autoLockMinutes: 0,
  isLocked: false,
  lockReason: null,
  lastActivityAt: Date.now(),

  configureSecurity: async ({ pinEnabled, appPin, autoLockMinutes }) => {
    const pin = appPin.trim();

    if (!pinEnabled) {
      await ipc.auth.setLockConfig({
        pin_enabled: false,
        app_pin: null,
        auto_lock_minutes: 0,
      });

      set({
        pinEnabled: false,
        autoLockMinutes: 0,
      });
      return;
    }

    const request = {
      pin_enabled: true,
      app_pin: pin.length > 0 ? pin : null,
      auto_lock_minutes: Math.max(0, autoLockMinutes),
    };

    await ipc.auth.setLockConfig(request);
    const config = await ipc.auth.getLockConfig();

    set({
      pinEnabled: config.pin_enabled,
      autoLockMinutes: config.auto_lock_minutes,
    });
  },

  bootstrapForStartup: async (isAuthenticated) => {
    set({ lastActivityAt: Date.now() });

    try {
      const config = await ipc.auth.getLockConfig();
      set({
        pinEnabled: config.pin_enabled,
        autoLockMinutes: config.auto_lock_minutes,
      });

      if (isAuthenticated && config.pin_enabled) {
        set({ isLocked: true, lockReason: "startup" });
        return;
      }
    } catch {
      // Ignore backend read failures and keep default lock state
    }

    set({ isLocked: false, lockReason: null });
  },

  lock: (reason) => {
    if (!get().pinEnabled) return;
    set({ isLocked: true, lockReason: reason });
  },

  unlock: async (pin) => {
    try {
      const ok = await ipc.auth.verifyPin({ pin: pin.trim() });
      if (ok) {
        set({
          isLocked: false,
          lockReason: null,
          lastActivityAt: Date.now(),
        });
      }
      return ok;
    } catch {
      return false;
    }
  },

  recordActivity: () => {
    set({ lastActivityAt: Date.now() });
  },

  lockIfInactive: () => {
    const { autoLockMinutes, pinEnabled, isLocked, lastActivityAt } = get();
    if (!pinEnabled || isLocked || autoLockMinutes <= 0) return;

    const idleMs = Date.now() - lastActivityAt;
    if (idleMs >= autoLockMinutes * 60_000) {
      set({ isLocked: true, lockReason: "inactivity" });
    }
  },

  clearSessionLock: () => {
    set({
      isLocked: false,
      lockReason: null,
      lastActivityAt: Date.now(),
    });
  },
}));
