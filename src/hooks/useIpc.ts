/**
 * hooks/useIpc.ts
 * React hook for calling IPC commands with automatic loading/error state.
 *
 * Wraps ipcInvokeSafe so components never need try/catch.
 * Integrates with Sonner toast for error display.
 *
 * Usage — one-shot call:
 *   const { run, data, loading, error } = useIpc<AppInfo>();
 *   useEffect(() => { run(() => ipc.app.getAppInfo()); }, []);
 *
 * Usage — event handler:
 *   const { run, loading } = useIpc<PingResponse>();
 *   const handlePing = () => run(() => ipc.app.ping('hello'));
 *
 * Usage — with toast on error:
 *   const { run } = useIpc<WriteFileResponse>({ toastOnError: true });
 *   run(() => ipc.file.writeTextFile({ path, content }));
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { IpcCallError } from '@/ipc';

interface UseIpcOptions {
  /** Show a Sonner error toast automatically on failure. Default: false */
  toastOnError?: boolean;
  /** Custom error message override for the toast */
  errorMessage?: string;
}

interface UseIpcState<T> {
  data: T | null;
  loading: boolean;
  error: IpcCallError | null;
}

interface UseIpcReturn<T> extends UseIpcState<T> {
  /** Execute an IPC call. Pass a function that returns a Promise<T>. */
  run: (fn: () => Promise<T>) => Promise<T | null>;
  /** Reset state back to initial */
  reset: () => void;
}

const INITIAL_STATE = { data: null, loading: false, error: null };

export function useIpc<T>(options: UseIpcOptions = {}): UseIpcReturn<T> {
  const { toastOnError = false, errorMessage } = options;
  const [state, setState] = useState<UseIpcState<T>>(INITIAL_STATE);

  // Prevent setState on unmounted component
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const run = useCallback(
    async (fn: () => Promise<T>): Promise<T | null> => {
      if (mountedRef.current) {
        setState({ data: null, loading: true, error: null });
      }

      try {
        const data = await fn();
        if (mountedRef.current) {
          setState({ data, loading: false, error: null });
        }
        return data;
      } catch (err) {
        const ipcErr =
          err instanceof IpcCallError
            ? err
            : new IpcCallError({ code: 'UNKNOWN_ERROR', message: String(err) });

        if (mountedRef.current) {
          setState({ data: null, loading: false, error: ipcErr });
        }

        if (toastOnError) {
          toast.error(errorMessage ?? ipcErr.message, {
            description: ipcErr.code !== 'UNKNOWN_ERROR' ? `Code: ${ipcErr.code}` : undefined,
          });
        }

        return null;
      }
    },
    [toastOnError, errorMessage],
  );

  const reset = useCallback(() => {
    if (mountedRef.current) setState(INITIAL_STATE);
  }, []);

  return { ...state, run, reset };
}
