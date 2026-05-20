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

export function App() {
  return (
    <Providers>
      <AppRouter />
    </Providers>
  );
}

export default App;
