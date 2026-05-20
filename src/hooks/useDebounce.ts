/**
 * hooks/useDebounce.ts
 * Debounce any rapidly-changing value (search inputs, filters, etc.)
 *
 * Usage:
 *   const debouncedSearch = useDebounce(searchTerm, 300);
 */

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
