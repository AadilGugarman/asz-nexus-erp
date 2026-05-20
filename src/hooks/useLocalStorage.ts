/**
 * hooks/useLocalStorage.ts
 * Type-safe localStorage hook with JSON serialisation.
 *
 * Usage:
 *   const [token, setToken] = useLocalStorage<string>('auth_token', '');
 */

import { useState, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch (err) {
          if (import.meta.env.DEV) console.warn(`[useLocalStorage] Failed to write key "${key}":`, err);
        }
        return next;
      });
    },
    [key],
  );

  const removeValue = useCallback(() => {
    localStorage.removeItem(key);
    setStoredValue(initialValue);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
