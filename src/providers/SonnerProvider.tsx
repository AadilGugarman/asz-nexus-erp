/**
 * providers/SonnerProvider.tsx
 * Globally mounts the Sonner <Toaster> once at the app root.
 * All toast calls anywhere in the app will render here.
 *
 * Usage: wrap your app with <SonnerProvider> in providers/index.tsx
 */

import React from 'react';
import { Toaster } from 'sonner';
import { useAppearanceStore } from '@/store';

export const SonnerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const theme = useAppearanceStore((s) => s.resolvedTheme);

  return (
    <>
      {children}
      <Toaster
        theme={theme}
        position="top-right"
        richColors
        closeButton
        duration={4000}
        toastOptions={{
          classNames: {
            toast: 'font-sans text-sm',
          },
        }}
      />
    </>
  );
};
