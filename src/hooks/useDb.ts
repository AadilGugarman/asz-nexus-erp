/**
 * hooks/useDb.ts
 * React hook that provides access to the dbService singleton.
 *
 * Returns { db, ready } where:
 *   db    — the dbService instance (repositories available when ready === true)
 *   ready — true once dbService.init() has completed
 *
 * Usage:
 *   const { db, ready } = useDb();
 *   if (!ready) return <Spinner />;
 *   const suppliers = await db.suppliers.findAll();
 *
 * The hook is safe to call in multiple components — init() is idempotent.
 */

import { useState, useEffect } from 'react';
import { dbService } from '@/db/services';

export function useDb() {
  const [ready, setReady] = useState(dbService.isReady);

  useEffect(() => {
    if (dbService.isReady) {
      setReady(true);
      return;
    }

    let cancelled = false;

    dbService.init().then((ok) => {
      if (!cancelled) setReady(ok);
    });

    return () => { cancelled = true; };
  }, []);

  return { db: dbService, ready };
}
