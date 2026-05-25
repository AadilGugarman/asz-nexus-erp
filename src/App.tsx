/**
 * App.tsx — minimal entry point.
 *
 * ErrorBoundary layout:
 *   Outer boundary  — catches catastrophic failures before any provider mounts
 *   AppProvider     — context is always alive; never killed by child errors
 *   Inner boundary  — catches errors inside the router/app without killing context
 */

import { Providers } from './providers';
import { AppRouter } from './router';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <AppRouter />
      </Providers>
    </ErrorBoundary>
  );
}

export default App;
