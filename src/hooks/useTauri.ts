/**
 * hooks/useTauri.ts
 * React hook wrapper around tauriInvoke for use inside components.
 * Provides loading / error state automatically.
 *
 * Usage:
 *   const { invoke, loading, error } = useTauri();
 *   const result = await invoke<string>('greet', { name: 'World' });
 */

import { useState, useCallback } from 'react';
import { tauriInvoke } from '@/lib/tauri';
import { APP_CONFIG } from '@/config';

interface UseTauriReturn {
  invoke: <T>(cmd: string, args?: Record<string, unknown>, fallback?: T) => Promise<T | null>;
  loading: boolean;
  error: Error | null;
  isTauri: boolean;
}

export function useTauri(): UseTauriReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const invoke = useCallback(
    async <T>(
      cmd: string,
      args?: Record<string, unknown>,
      fallback?: T,
    ): Promise<T | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await tauriInvoke<T>(cmd, args, fallback);
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { invoke, loading, error, isTauri: APP_CONFIG.isTauri };
}
