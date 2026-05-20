/**
 * utils/error.ts
 * Normalise unknown errors into a human-readable string.
 * Use this in catch blocks before showing toasts.
 */

import type { AxiosError } from 'axios';

export function getErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err;

  // Axios error with a response body
  const axiosErr = err as AxiosError<{ message?: string }>;
  if (axiosErr?.response?.data?.message) {
    return axiosErr.response.data.message;
  }

  if (err instanceof Error) return err.message;

  return 'An unexpected error occurred.';
}
