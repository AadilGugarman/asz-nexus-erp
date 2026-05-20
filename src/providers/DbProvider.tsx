/**
 * providers/DbProvider.tsx
 * Initialises the Drizzle DB service once at app startup.
 *
 * Wrap this around any subtree that needs DB access.
 * It is already included in Providers/index.tsx.
 *
 * - In Tauri: opens the SQLite connection and initialises all repositories.
 * - In browser dev mode: no-ops silently (isTauri = false).
 *
 * Children render immediately — DB init is non-blocking.
 * Use the `useDb()` hook to wait for `ready === true` before querying.
 */

import React, { useEffect } from 'react';
import { dbService } from '@/db/services';

interface DbProviderProps {
  children: React.ReactNode;
}

export const DbProvider: React.FC<DbProviderProps> = ({ children }) => {
  useEffect(() => {
    // Fire-and-forget — useDb() hook handles the ready state per-component
    dbService.init()
      .then((ok) => {
        if (import.meta.env.DEV) {
          console.info(`[DbProvider] init ${ok ? 'succeeded' : 'skipped (no Tauri)'}`);
        }
      })
      .catch((err) => {
        console.error('[DbProvider] init failed:', err);
      });
  }, []);

  return <>{children}</>;
};
