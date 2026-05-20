/**
 * main.tsx — application entry point.
 *
 * Startup sequence:
 *  1. startup.run()     — launches auth + DB warm-up in parallel (non-blocking)
 *  2. createRoot()      — mounts React
 *  3. startup.afterFirstPaint() — shows the Tauri window, schedules preloads
 *
 * StrictMode is enabled in dev (double-renders catch side-effect bugs) and
 * disabled in production (halves the number of renders on mount).
 */

import './index.css';

import { createRoot } from 'react-dom/client';
import { StrictMode }  from 'react';
import App             from './App';
import { startup }     from './services/startup';
import { perf }        from './lib/perf';
import { initAppearanceSystem } from './store/appearance.store';
import { useStartupStore } from './store/startup.store';
import { applyDesktopLanguagePreference, initI18n, initI18nLanguageSync } from './i18n';

perf.mark('script-start');

// Apply persisted/system appearance settings before first render.
initAppearanceSystem();
initI18n();
initI18nLanguageSync();
void applyDesktopLanguagePreference();

// Launch background tasks immediately — they run while React is mounting
void useStartupStore.getState().initialize();

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

const app = (
  import.meta.env.DEV
    ? <StrictMode><App /></StrictMode>
    : <App />
);

perf.mark('before-render');

createRoot(root).render(app);

// After React commits the first frame, show the window and schedule preloads
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    startup.afterFirstPaint();
    perf.mark('after-first-paint');
  });
});
