/**
 * hooks/usePreload.ts
 * Idle-time preloader for ERP module chunks.
 *
 * When the user is on a tab, this hook schedules the adjacent/likely-next
 * modules to load during browser idle time. This makes tab switching feel
 * instant because the chunk is already in the module cache.
 *
 * Uses requestIdleCallback with a timeout so it never blocks user interaction.
 * Falls back to setTimeout on environments that don't support rIC.
 *
 * Usage:
 *   // In AppShell — call once after the shell mounts
 *   usePreload(activeTab);
 */

import { useEffect, useRef } from 'react';

// ── Preload map ───────────────────────────────────────────────────────────────
// Maps each tab to the modules most likely to be visited next.
// Modules are listed in priority order (first = highest priority).

const PRELOAD_MAP: Record<string, Array<() => Promise<unknown>>> = {
  dashboard: [
    () => import('@/components/SalesBillingModule'),
    () => import('@/components/VehicleArrivalModule'),
    () => import('@/components/PaymentsModule'),
  ],
  arrival: [
    () => import('@/components/PurchaseBillingModule'),
    () => import('@/components/SalesBillingModule'),
    () => import('@/components/InventoryModule'),
  ],
  purchase: [
    () => import('@/components/SalesBillingModule'),
    () => import('@/components/PaymentsModule'),
    () => import('@/components/SupplierModule'),
  ],
  sales: [
    () => import('@/components/PaymentsModule'),
    () => import('@/components/CustomerModule'),
    () => import('@/components/ReportsModule'),
  ],
  inventory: [
    () => import('@/components/ReportsModule'),
    () => import('@/components/SalesBillingModule'),
  ],
  parties: [
    () => import('@/components/SupplierModule'),
    () => import('@/components/CustomerModule'),
  ],
  payments: [
    () => import('@/components/ReportsModule'),
    () => import('@/components/SalesBillingModule'),
  ],
  reports: [
    () => import('@/components/SettingsModule'),
  ],
  suppliers: [
    () => import('@/components/PurchaseBillingModule'),
    () => import('@/components/PaymentsModule'),
  ],
  customers: [
    () => import('@/components/SalesBillingModule'),
    () => import('@/components/PaymentsModule'),
  ],
  settings: [],
};

// ── rIC shim ──────────────────────────────────────────────────────────────────

type IdleDeadline = { timeRemaining: () => number };
type RicCallback  = (deadline: IdleDeadline) => void;

function scheduleIdle(cb: RicCallback, timeout = 2000): () => void {
  if (typeof requestIdleCallback !== 'undefined') {
    const id = requestIdleCallback(cb, { timeout });
    return () => cancelIdleCallback(id);
  }
  // Fallback: run after a short delay
  const id = setTimeout(() => cb({ timeRemaining: () => 50 }), timeout);
  return () => clearTimeout(id);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePreload(activeTab: string): void {
  // Track which modules have already been preloaded to avoid duplicate work
  const preloaded = useRef(new Set<string>());

  useEffect(() => {
    const loaders = PRELOAD_MAP[activeTab];
    if (!loaders?.length) return;

    const cancels: Array<() => void> = [];

    loaders.forEach((load, i) => {
      // Stagger preloads: first module after 1s idle, rest after 3s idle
      const timeout = i === 0 ? 1000 : 3000 + i * 500;
      const key = load.toString();

      if (preloaded.current.has(key)) return;

      const cancel = scheduleIdle(() => {
        if (preloaded.current.has(key)) return;
        preloaded.current.add(key);
        load().catch(() => {
          // Non-fatal — chunk will load on demand if preload fails
          preloaded.current.delete(key);
        });
      }, timeout);

      cancels.push(cancel);
    });

    return () => cancels.forEach((c) => c());
  }, [activeTab]);
}
