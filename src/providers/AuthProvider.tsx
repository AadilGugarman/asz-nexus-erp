/**
 * providers/AuthProvider.tsx
 * Bootstraps the auth store on app launch and mounts the auto-refresh timer.
 *
 * Responsibilities:
 *   1. Calls authStore.initialize() once — checks Rust session status,
 *      restores from refresh token if available, or marks as unauthenticated.
 *   2. Mounts useAutoRefresh() — proactively refreshes the access token
 *      60 seconds before it expires.
 *
 * This is a pure side-effect provider — renders children immediately.
 * Components use useAuthStore() to react to auth state changes.
 */

import React, { useEffect } from 'react';
import { useAuthStore } from '@/store';
import { useAutoRefresh } from '@/hooks';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const initialize = useAuthStore((s) => s.initialize);

  // Run once on mount — restores session or marks as logged out
  useEffect(() => {
    initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mount the auto-refresh timer (no-ops when not authenticated)
  useAutoRefresh();

  return <>{children}</>;
};
