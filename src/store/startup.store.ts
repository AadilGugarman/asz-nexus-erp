import { create } from 'zustand';
import { useAuthStore } from './auth.store';
import { useCompanyStore } from './company.store';
import { useLockStore } from './lock.store';

interface StartupState {
  phase: 'idle' | 'initializing' | 'ready' | 'error';
  message: string;
  initialized: boolean;
  error: string | null;

  initialize: () => Promise<void>;
}

export const useStartupStore = create<StartupState>()((set, get) => ({
  phase: 'idle',
  message: 'Preparing application...',
  initialized: false,
  error: null,

  initialize: async () => {
    if (get().initialized || get().phase === 'initializing') return;

    set({
      phase: 'initializing',
      message: 'Restoring session...',
      error: null,
    });

    try {
      await useAuthStore.getState().initialize();

      set({ message: 'Checking company onboarding...' });
      useCompanyStore.getState().bootstrap();

      set({ message: 'Applying security checks...' });
      const isAuthenticated = useAuthStore.getState().isAuthenticated;
      useLockStore.getState().bootstrapForStartup(isAuthenticated);

      set({
        phase: 'ready',
        initialized: true,
        message: 'Ready',
      });
    } catch (error) {
      set({
        phase: 'error',
        initialized: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
}));
