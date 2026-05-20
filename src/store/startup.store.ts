import { create } from 'zustand';
import { useAuthStore } from './auth.store';
import { useCompanyStore } from './company.store';
import { useLockStore } from './lock.store';
import { dbService } from '@/db/services';
import { useSettingsStore } from './settings.store';
import { backupService } from '@/services/backup.service';

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
      await dbService.init();

      await useAuthStore.getState().initialize();

      set({ message: 'Checking company onboarding...' });
      // Fast synchronous bootstrap from localStorage cache
      useCompanyStore.getState().bootstrap();
      // Fast synchronous settings bootstrap from localStorage cache
      useSettingsStore.getState().bootstrap();

      // Reconcile with DB as source of truth (only when authenticated)
      const isAuthenticated = useAuthStore.getState().isAuthenticated;
      if (isAuthenticated) {
        try {
          await useCompanyStore.getState().bootstrapFromDb();
          // Load authoritative settings from SQLite
          await useSettingsStore.getState().loadFromDb();
          await backupService.init();
        } catch {
          // Non-fatal — localStorage cache already applied above
        }
      }

      set({ message: 'Applying security checks...' });
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
