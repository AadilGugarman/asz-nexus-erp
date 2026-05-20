import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type LockReason = 'startup' | 'inactivity' | null;

interface LockState {
  pinEnabled: boolean;
  pinSalt: string | null;
  pinHash: string | null;
  autoLockMinutes: number;

  isLocked: boolean;
  lockReason: LockReason;
  lastActivityAt: number;

  configureSecurity: (input: {
    pinEnabled: boolean;
    appPin: string;
    autoLockMinutes: number;
  }) => Promise<void>;
  bootstrapForStartup: (isAuthenticated: boolean) => void;
  lock: (reason: Exclude<LockReason, null>) => void;
  unlock: (pin: string) => Promise<boolean>;
  recordActivity: () => void;
  lockIfInactive: () => void;
  clearSessionLock: () => void;
}

const STORAGE_KEY = 'apex_lock_state_v1';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(digest));
}

export const useLockStore = create<LockState>()(
  persist(
    (set, get) => ({
      pinEnabled: false,
      pinSalt: null,
      pinHash: null,
      autoLockMinutes: 0,
      isLocked: false,
      lockReason: null,
      lastActivityAt: Date.now(),

      configureSecurity: async ({ pinEnabled, appPin, autoLockMinutes }) => {
        const pin = appPin.trim();

        if (!pinEnabled) {
          set({
            pinEnabled: false,
            pinSalt: null,
            pinHash: null,
            autoLockMinutes: 0,
            isLocked: false,
            lockReason: null,
          });
          return;
        }

        const currentSalt = get().pinSalt;
        const currentHash = get().pinHash;
        const shouldUpdatePin = pin.length >= 4;

        if (!currentHash && !shouldUpdatePin) {
          set({
            pinEnabled: false,
            autoLockMinutes: 0,
            isLocked: false,
            lockReason: null,
          });
          return;
        }

        if (shouldUpdatePin) {
          const salt = randomSalt();
          const pinHash = await hashPin(pin, salt);
          set({
            pinEnabled: true,
            pinSalt: salt,
            pinHash,
            autoLockMinutes: Math.max(0, autoLockMinutes),
          });
          return;
        }

        set({
          pinEnabled: true,
          pinSalt: currentSalt,
          pinHash: currentHash,
          autoLockMinutes: Math.max(0, autoLockMinutes),
        });
      },

      bootstrapForStartup: (isAuthenticated) => {
        const { pinEnabled, pinHash } = get();
        set({ lastActivityAt: Date.now() });

        if (isAuthenticated && pinEnabled && !!pinHash) {
          set({ isLocked: true, lockReason: 'startup' });
          return;
        }

        set({ isLocked: false, lockReason: null });
      },

      lock: (reason) => {
        const { pinEnabled, pinHash } = get();
        if (!pinEnabled || !pinHash) return;
        set({ isLocked: true, lockReason: reason });
      },

      unlock: async (pin) => {
        const { pinSalt, pinHash } = get();
        if (!pinSalt || !pinHash) return false;

        const incomingHash = await hashPin(pin.trim(), pinSalt);
        const ok = incomingHash === pinHash;
        if (ok) {
          set({
            isLocked: false,
            lockReason: null,
            lastActivityAt: Date.now(),
          });
        }
        return ok;
      },

      recordActivity: () => {
        set({ lastActivityAt: Date.now() });
      },

      lockIfInactive: () => {
        const { autoLockMinutes, pinEnabled, pinHash, isLocked, lastActivityAt } = get();
        if (!pinEnabled || !pinHash || isLocked || autoLockMinutes <= 0) return;

        const idleMs = Date.now() - lastActivityAt;
        if (idleMs >= autoLockMinutes * 60_000) {
          set({ isLocked: true, lockReason: 'inactivity' });
        }
      },

      clearSessionLock: () => {
        set({
          isLocked: false,
          lockReason: null,
          lastActivityAt: Date.now(),
        });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({
        pinEnabled: s.pinEnabled,
        pinSalt: s.pinSalt,
        pinHash: s.pinHash,
        autoLockMinutes: s.autoLockMinutes,
      }),
    },
  ),
);
