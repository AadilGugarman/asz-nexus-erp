/**
 * hooks/useAutoRefresh.ts
 * Automatically refreshes the access token before it expires.
 *
 * Strategy:
 *   - Schedules a refresh 60 seconds before the access token expires.
 *   - On app focus (window regains focus), checks if token needs refresh.
 *   - Clears the timer on logout or unmount.
 *
 * Mount this once at the app root (inside AuthProvider or App.tsx).
 *
 * Usage:
 *   function App() {
 *     useAutoRefresh();
 *     return <AppRoutes />;
 *   }
 */

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store';

/** Refresh this many seconds before expiry. */
const REFRESH_BUFFER_SECS = 60;

export function useAutoRefresh(): void {
  const accessExpiresAt = useAuthStore((s) => s.accessExpiresAt);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const refreshTokens   = useAuthStore((s) => s.refreshTokens);
  const timerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Schedule proactive refresh ────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !accessExpiresAt) return;

    const nowSecs     = Math.floor(Date.now() / 1000);
    const delaySecs   = accessExpiresAt - nowSecs - REFRESH_BUFFER_SECS;
    const delayMs     = Math.max(0, delaySecs * 1000);

    if (import.meta.env.DEV) {
      console.debug(`[useAutoRefresh] scheduling refresh in ${Math.round(delayMs / 1000)}s`);
    }

    timerRef.current = setTimeout(() => {
      refreshTokens();
    }, delayMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, accessExpiresAt, refreshTokens]);

  // ── Refresh on window focus ───────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleFocus = () => {
      if (!accessExpiresAt) return;
      const nowSecs = Math.floor(Date.now() / 1000);
      const remaining = accessExpiresAt - nowSecs;
      // Refresh if less than 2 minutes remain
      if (remaining < 120) {
        refreshTokens();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, accessExpiresAt, refreshTokens]);
}
