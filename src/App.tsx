/**
 * App.tsx — minimal entry point.
 *
 * Providers are composed in src/providers/index.tsx.
 * Router is in src/router/index.tsx.
 * Layout/shell is in src/app/AppShell.tsx.
 *
 * DO NOT add business logic here.
 */

import { Providers } from './providers';
import { AppRouter } from './router';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export function App() {
  return (
    <Providers>
      <ErrorBoundary>
        <AppRouter />
      </ErrorBoundary>
    </Providers>
  );
}

export default App;
