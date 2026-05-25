/**
 * providers/DbProvider.tsx
 * Structural provider placeholder for the DB layer.
 *
 * DB initialisation happens in useStartupStore.initialize() (called from
 * main.tsx before React mounts) so it runs as early as possible.
 *
 * This provider exists as a named slot in the provider tree so that
 * future DB-scoped context (e.g. a React context carrying the Drizzle
 * instance) can be added here without touching Providers/index.tsx.
 *
 * Children render immediately — DB readiness is tracked via useStartupStore.
 */

import React from 'react';

interface DbProviderProps {
  children: React.ReactNode;
}

export const DbProvider: React.FC<DbProviderProps> = ({ children }) => {
  return <>{children}</>;
};
