/**
 * hooks/useAsync.ts
 * Generic hook for async operations with loading / error / data state.
 *
 * Usage:
 *   const { data, loading, error, run } = useAsync(supplierService.getAll);
 *   useEffect(() => { run(); }, []);
 */

import { useState, useCallback, useRef } from 'react';

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseAsyncReturn<T, A extends unknown[]> extends AsyncState<T> {
  run: (...args: A) => Promise<T | null>;
  reset: () => void;
}

export function useAsync<T, A extends unknown[]>(
  asyncFn: (...args: A) => Promise<T>,
): UseAsyncReturn<T, A> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  // Track mounted state to avoid setState on unmounted component
  const mountedRef = useRef(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableAsyncFn = useCallback(asyncFn, []);

  const run = useCallback(
    async (...args: A): Promise<T | null> => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = await stableAsyncFn(...args);
        if (mountedRef.current) {
          setState({ data: result, loading: false, error: null });
        }
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        if (mountedRef.current) {
          setState({ data: null, loading: false, error });
        }
        return null;
      }
    },
    [stableAsyncFn],
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, run, reset };
}
