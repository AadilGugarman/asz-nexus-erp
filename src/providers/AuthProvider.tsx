/**
 * providers/AuthProvider.tsx
 * Mounts auth side-effects that should stay active for the whole app.
 *
 * Responsibilities:
 *   1. Mounts useAutoRefresh() — proactively refreshes the access token.
 *   2. Mounts useInactivityLock() — enforces configured app auto-lock.
 *
 * This is a pure side-effect provider — renders children immediately.
 * Components use stores directly to react to auth/lock state changes.
 */

import React from 'react';
import { useAutoRefresh, useInactivityLock } from '@/hooks';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Keeps access token fresh for authenticated sessions.
  useAutoRefresh();
  // Locks app after configured inactivity timeout.
  useInactivityLock();

  return <>{children}</>;
};
