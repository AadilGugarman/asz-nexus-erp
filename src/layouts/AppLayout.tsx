/**
 * layouts/AppLayout.tsx
 * Layout wrapper for all authenticated app routes.
 *
 * Currently a transparent pass-through — AppShell owns the full layout
 * (navbar, sidebar, main content). This layout exists so you can inject
 * app-wide wrappers (analytics, error boundaries, feature flags) here
 * without touching AppShell or individual pages.
 *
 * Future additions:
 *   - <ErrorBoundary> wrapping <Outlet>
 *   - App-level analytics/page-view tracking
 *   - Role-based layout switching
 */

import React from 'react';
import { Outlet } from 'react-router-dom';

export const AppLayout: React.FC = () => {
  return <Outlet />;
};
