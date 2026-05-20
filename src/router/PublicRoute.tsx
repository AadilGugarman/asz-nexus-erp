/**
 * router/PublicRoute.tsx
 * Guards routes that should NOT be accessible once authenticated.
 * (e.g. /login — redirect already-logged-in users to the dashboard)
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { ROUTES } from '@/config';
import { useAuthStore } from '@/store';

export const PublicRoute: React.FC = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading       = useAuthStore((s) => s.isLoading);

  // Don't redirect while initialising — avoids flash of login page
  if (isLoading) return null;

  if (isAuthenticated) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return <Outlet />;
};
