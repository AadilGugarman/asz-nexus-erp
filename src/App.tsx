/**
 * App.tsx — minimal entry point.
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
