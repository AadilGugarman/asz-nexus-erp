import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const tauriMock = path.resolve(__dirname, 'src/lib/tauri-mock.ts');

// Tauri runtime packages — injected by the Rust backend at runtime.
// Never bundle these; Tauri's webview provides them via IPC bridge.
const TAURI_EXTERNALS = [
  '@tauri-apps/api/core',
  '@tauri-apps/api/event',
  '@tauri-apps/api/window',
  '@tauri-apps/plugin-dialog',
  '@tauri-apps/plugin-fs',
  '@tauri-apps/plugin-shell',
  '@tauri-apps/plugin-sql',
];

export default defineConfig(({ command, mode }) => {
  const isBuild = command === 'build';
  const isProd  = mode === 'production';

  return {
    // ── Plugins ─────────────────────────────────────────────────────────────
    plugins: [
      react({
        // Use the automatic JSX runtime — no need to import React in every file
        jsxRuntime: 'automatic',
      }),
      tailwindcss(),
    ],

    // ── Path aliases ─────────────────────────────────────────────────────────
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        // In dev, alias Tauri packages to the mock shim so Vite doesn't error
        ...(!isBuild
          ? Object.fromEntries(TAURI_EXTERNALS.map((pkg) => [pkg, tauriMock]))
          : {}),
      },
    },

    // ── Dep pre-bundling ─────────────────────────────────────────────────────
    optimizeDeps: {
      exclude: TAURI_EXTERNALS,
      // Pre-bundle heavy deps so dev server starts faster
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'zustand',
        'clsx',
        'tailwind-merge',
        'lucide-react',
        'sonner',
      ],
    },

    // ── Build ────────────────────────────────────────────────────────────────
    build: {
      // Tauri targets ES2021 — safe for all modern desktop webviews
      target: 'es2021',

      // Inline assets smaller than 4 KB directly into JS/CSS
      assetsInlineLimit: 4096,

      // Enable CSS code splitting — each chunk gets its own CSS file
      cssCodeSplit: true,

      // Source maps only in dev; strip in prod to reduce bundle size
      sourcemap: !isProd,

      // Minify with esbuild (faster than terser, ~same output size)
      minify: isProd ? 'esbuild' : false,

      // esbuild minification options
      ...(isProd && {
        esbuildOptions: {
          // Drop console.* and debugger statements in production
          drop: ['console', 'debugger'],
          // Remove legal comments to shrink output
          legalComments: 'none',
        },
      }),

      rollupOptions: {
        // Tauri injects these at runtime — never include in the bundle
        external: TAURI_EXTERNALS,

        output: {
          // ── Manual chunk splitting strategy ──────────────────────────────
          // Each chunk loads independently; users only download what they use.
          manualChunks(id) {
            // React core — loaded first, cached aggressively
            if (id.includes('node_modules/react/') ||
                id.includes('node_modules/react-dom/') ||
                id.includes('node_modules/scheduler/')) {
              return 'react-core';
            }

            // Router — needed on every page
            if (id.includes('node_modules/react-router')) {
              return 'router';
            }

            // State management
            if (id.includes('node_modules/zustand')) {
              return 'state';
            }

            // UI utilities (clsx, tailwind-merge, sonner)
            if (id.includes('node_modules/clsx') ||
                id.includes('node_modules/tailwind-merge') ||
                id.includes('node_modules/sonner')) {
              return 'ui-utils';
            }

            // Icons — large package, isolate so it can be cached separately
            if (id.includes('node_modules/lucide-react')) {
              return 'icons';
            }

            // Drizzle ORM — only needed after auth, split out
            if (id.includes('node_modules/drizzle-orm')) {
              return 'drizzle';
            }

            // HTTP client — only used for external API calls
            if (id.includes('node_modules/axios')) {
              return 'http';
            }

            // App module chunks — each ERP tab becomes its own chunk
            // so the user only loads the code for the tab they visit
            const moduleMap: Record<string, string> = {
              'ExecutiveDashboard':   'mod-dashboard',
              'VehicleArrivalModule': 'mod-arrival',
              'VehicleSpreadsheet':   'mod-arrival',
              'VehiclePreviewModal':  'mod-arrival',
              'PurchaseBillingModule':'mod-purchase',
              'PurchasePreviewModal': 'mod-purchase',
              'SalesBillingModule':   'mod-sales',
              'InvoicePreviewModal':  'mod-sales',
              'InventoryModule':      'mod-inventory',
              'PartiesModule':        'mod-parties',
              'PaymentsModule':       'mod-payments',
              'ReportsModule':        'mod-reports',
              'SettingsModule':       'mod-settings',
              'MasterModule':         'mod-settings',
            };

            for (const [file, chunk] of Object.entries(moduleMap)) {
              if (id.includes(`/components/${file}`) ||
                  id.includes(`/components/${file.replace('Module', '')}`)) {
                return chunk;
              }
            }
          },

          // Deterministic chunk filenames for long-term caching
          chunkFileNames:  isProd ? 'assets/[name]-[hash].js'  : 'assets/[name].js',
          entryFileNames:  isProd ? 'assets/[name]-[hash].js'  : 'assets/[name].js',
          assetFileNames:  isProd ? 'assets/[name]-[hash][extname]' : 'assets/[name][extname]',
        },
      },

      // Warn when any single chunk exceeds 500 KB (before gzip)
      chunkSizeWarningLimit: 500,
    },

    // ── Dev server ───────────────────────────────────────────────────────────
    server: {
      port: 5173,
      strictPort: true,
      // Warm up the most-visited modules so first page load is instant
      warmup: {
        clientFiles: [
          './src/main.tsx',
          './src/App.tsx',
          './src/app/AppShell.tsx',
          './src/components/Navbar.tsx',
          './src/ipc/index.ts',
        ],
      },
    },

    // ── Preview server ───────────────────────────────────────────────────────
    preview: {
      port: 4173,
      strictPort: true,
    },
  };
});
