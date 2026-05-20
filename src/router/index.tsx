/**
 * router/index.tsx
 * Router provider entry point.
 *
 * Uses HashRouter — required for Tauri (no web server, no 404 on reload).
 * The actual route tree lives in routes.tsx to keep this file minimal.
 *
 * App.tsx imports only <AppRouter> from here.
 */

import React from 'react';
import { HashRouter } from 'react-router-dom';
import { AppRoutes } from './routes';

export const AppRouter: React.FC = () => {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
};
