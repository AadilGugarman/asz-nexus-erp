/**
 * hooks/useAuth.ts
 * Convenience hook — exposes the most-used auth state and actions.
 *
 * Usage:
 *   const { user, isAuthenticated, login, logout } = useAuth();
 *
 * For full store access use useAuthStore() directly.
 */

import { useAuthStore } from '@/store';

export function useAuth() {
  const user            = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading       = useAuthStore((s) => s.isLoading);
  const isSetupDone     = useAuthStore((s) => s.isSetupDone);
  const error           = useAuthStore((s) => s.error);
  const login           = useAuthStore((s) => s.login);
  const logout          = useAuthStore((s) => s.logout);
  const setup           = useAuthStore((s) => s.setup);
  const changePassword  = useAuthStore((s) => s.changePassword);
  const clearError      = useAuthStore((s) => s.clearError);

  return {
    user,
    isAuthenticated,
    isLoading,
    isSetupDone,
    error,
    login,
    logout,
    setup,
    changePassword,
    clearError,
    /** Shorthand role checks */
    isAdmin:   user?.role === 'admin',
    isManager: user?.role === 'admin' || user?.role === 'manager',
  };
}
