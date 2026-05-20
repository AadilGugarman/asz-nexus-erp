/**
 * hooks/useEvent.ts
 * React hook for subscribing to Tauri backend events with automatic cleanup.
 *
 * Handles the unlisten lifecycle so components never leak listeners.
 *
 * Usage:
 *   // Listen for data changes
 *   useEvent(AppEvents.onDataChanged, (payload) => {
 *     if (payload.domain === 'suppliers') refetch();
 *   });
 *
 *   // Listen for task progress
 *   useEvent(AppEvents.onTaskProgress, (payload) => {
 *     setProgress(payload.percent);
 *   });
 */

import { useEffect, useRef } from 'react';

type ListenerFn<T> = (handler: (payload: T) => void) => Promise<() => void>;

/**
 * Subscribe to a Tauri event for the lifetime of the component.
 * The listener is automatically removed on unmount.
 *
 * @param listenerFn - One of the AppEvents.on* functions
 * @param handler    - Callback invoked when the event fires
 */
export function useEvent<T>(
  listenerFn: ListenerFn<T>,
  handler: (payload: T) => void,
): void {
  // Keep handler ref stable so the effect doesn't re-run on every render
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    let unlisten: (() => void) | null = null;

    listenerFn((payload) => handlerRef.current(payload)).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
    // listenerFn identity is stable (module-level constant) — safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listenerFn]);
}
