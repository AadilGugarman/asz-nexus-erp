/**
 * providers/index.tsx
 * Composes all global providers in the correct order.
 * Add new providers here — App.tsx stays clean.
 *
 * Order (outermost → innermost):
 *   AppProvider (existing data context)
 *   → SonnerProvider (toast renderer)
 *   → ConfirmDialogProvider (existing)
 *   → ToastProvider (existing custom toast — kept for backward compat)
 *   → children
 */

import React from 'react';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from './AuthProvider';
import { DbProvider } from './DbProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmDialogProvider } from '@/components/ui/ConfirmDialog';
import { SonnerProvider } from './SonnerProvider';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <AppProvider>
      <AuthProvider>
        <DbProvider>
          <SonnerProvider>
            <ConfirmDialogProvider>
              <ToastProvider>
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </ToastProvider>
            </ConfirmDialogProvider>
          </SonnerProvider>
        </DbProvider>
      </AuthProvider>
    </AppProvider>
  );
};
