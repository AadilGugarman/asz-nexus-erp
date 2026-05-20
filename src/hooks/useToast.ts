/**
 * hooks/useToast.ts
 * Thin wrapper around Sonner's toast for consistent usage across the app.
 * Import this instead of calling sonner directly so you can swap the
 * underlying library in one place if needed.
 *
 * Usage:
 *   const toast = useToast();
 *   toast.success('Invoice saved');
 *   toast.error('Something went wrong');
 */

import { toast as sonner } from 'sonner';

export function useToast() {
  return {
    success: (message: string, description?: string) =>
      sonner.success(message, { description }),

    error: (message: string, description?: string) =>
      sonner.error(message, { description }),

    info: (message: string, description?: string) =>
      sonner.info(message, { description }),

    warning: (message: string, description?: string) =>
      sonner.warning(message, { description }),

    loading: (message: string) => sonner.loading(message),

    dismiss: (id?: string | number) => sonner.dismiss(id),

    promise: <T>(
      promise: Promise<T>,
      messages: { loading: string; success: string; error: string },
    ) =>
      sonner.promise(promise, {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      }),
  };
}
