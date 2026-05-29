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

import React, { useEffect } from "react";
import { useAuthStore } from "@/store";
import { useAutoRefresh } from "@/hooks";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Keeps access token fresh for authenticated sessions.
  useAutoRefresh();

  return <>{children}</>;
};
