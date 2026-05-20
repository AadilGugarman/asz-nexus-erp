import { useEffect } from 'react';
import { useAuthStore, useLockStore } from '@/store';

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'click',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
];

export function useInactivityLock(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pinEnabled = useLockStore((s) => s.pinEnabled);
  const isLocked = useLockStore((s) => s.isLocked);
  const autoLockMinutes = useLockStore((s) => s.autoLockMinutes);
  const recordActivity = useLockStore((s) => s.recordActivity);
  const lockIfInactive = useLockStore((s) => s.lockIfInactive);

  useEffect(() => {
    if (!isAuthenticated || !pinEnabled || autoLockMinutes <= 0) return;

    const onActivity = () => {
      if (!isLocked) {
        recordActivity();
      }
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onActivity, { passive: true });
    }

    const timer = window.setInterval(() => {
      lockIfInactive();
    }, 10_000);

    return () => {
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity);
      }
      window.clearInterval(timer);
    };
  }, [
    isAuthenticated,
    pinEnabled,
    isLocked,
    autoLockMinutes,
    recordActivity,
    lockIfInactive,
  ]);
}
