/**
 * useApp.ts
 * Hooks for consuming AppContext.
 *
 * Kept in a separate file from AppContext.tsx so that Vite Fast Refresh
 * works correctly — a file must export only components OR only non-components,
 * not both. AppContext.tsx exports AppProvider (component); this file exports
 * the hooks (non-components).
 */

import { useContext } from "react";
import { AppContext, type AppContextType } from "./AppContext";

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error(
      "[useApp] Context is undefined. This usually means:\n" +
        "  1. The component is rendered outside <AppProvider> — check your provider tree in providers/index.tsx\n" +
        "  2. A module-casing mismatch caused AppContext to be bundled twice (two separate context instances)\n" +
        "  3. The component is used in a lazy-loaded chunk that mounted before <AppProvider> was ready\n\n" +
        "Fix: ensure every import of AppContext uses the exact path '@/context/AppContext' (matching case).",
    );
  }
  return context;
};

/**
 * Safe variant — returns null instead of throwing when used outside the provider.
 * Use this only in components that can genuinely render before the provider is ready
 * (e.g. error screens, startup screens). Prefer useApp() everywhere else.
 */
export const useAppSafe = (): AppContextType | null => {
  return useContext(AppContext) ?? null;
};
