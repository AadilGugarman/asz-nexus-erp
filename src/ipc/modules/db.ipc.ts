/**
 * ipc/modules/db.ipc.ts
 * Frontend IPC module for database commands.
 *
 * Usage:
 *   import { ipc } from '@/ipc';
 *   const stats = await ipc.db.getStats();
 *   const plan = await ipc.db.getSeedPlan();
 */

import { ipcInvoke } from '../invoke';
import { CMD } from '../commands';
import type {
  DbStats,
  DbSeedExecutionResult,
  DbSeedPlan,
  DbSeedResetResult,
  SeedProfileKey,
} from '../types';

const FALLBACK_SEED_PLAN: DbSeedPlan = {
  recommended_default: 'medium',
  scaling_strategy:
    'Start with lightweight for daily UI work, use medium for end-to-end workflows, and reserve heavy for reporting and offline performance runs.',
  notes: [
    'Reseeding is deterministic per profile so repeated resets produce stable document references.',
    'Profiles are sized to cover master data, transactions, and payments without duplicate/conflicting document numbers.',
    'Sales records are intended to consume seeded stock pools for realistic ERP report testing.',
  ],
  profiles: [
    {
      key: 'lightweight',
      display_name: 'Lightweight',
      description: 'Fast startup dataset for daily feature work and smoke tests.',
      recommended_for: 'UI development, CRUD checks, invoice formatting, and quick manual QA.',
      approx_history_days: 60,
      counts: {
        fruits: 8,
        suppliers: 18,
        customers: 28,
        vehicle_arrivals: 42,
        purchase_invoices: 54,
        sales_invoices: 72,
        payments: 64,
        app_settings: 4,
      },
    },
    {
      key: 'medium',
      display_name: 'Medium',
      description: 'Balanced dataset for integration testing across reports, ledgers, and searches.',
      recommended_for: 'Most desktop QA cycles, ledger validation, exports, and pagination checks.',
      approx_history_days: 180,
      counts: {
        fruits: 12,
        suppliers: 40,
        customers: 70,
        vehicle_arrivals: 160,
        purchase_invoices: 220,
        sales_invoices: 320,
        payments: 260,
        app_settings: 4,
      },
    },
    {
      key: 'heavy',
      display_name: 'Heavy',
      description: 'Large dataset tuned for realistic reporting, filtering, and offline desktop performance testing.',
      recommended_for: 'Report validation, stress testing, search latency checks, and backup/restore drills.',
      approx_history_days: 365,
      counts: {
        fruits: 16,
        suppliers: 90,
        customers: 160,
        vehicle_arrivals: 520,
        purchase_invoices: 720,
        sales_invoices: 1020,
        payments: 860,
        app_settings: 4,
      },
    },
  ],
};

function buildFallbackSeedResult(profile: SeedProfileKey): DbSeedExecutionResult {
  const recommendation = FALLBACK_SEED_PLAN.profiles.find((item) => item.key === profile)
    ?? FALLBACK_SEED_PLAN.profiles[1];
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  // ── Browser Mock Seeding ────────────────────────────────────────────────
  // This ensures the dashboard isn't empty when testing in localhost:5173
  try {
    const mockFruits = [
      { id: 'f-001', name: 'Mango', varieties: ['Kesar', 'Alphonso'] },
      { id: 'f-002', name: 'Apple', varieties: ['Shimla', 'Royal'] },
    ];
    const mockSuppliers = [
      { id: 'sup-001', name: 'Ahmedabad Fruit Supply', city: 'Ahmedabad', previousBalance: 12500 },
      { id: 'sup-002', name: 'Nashik Grapes Traders', city: 'Nashik', previousBalance: 45000 },
    ];
    const mockCustomers = [
      { id: 'cus-001', name: 'Reliance Fresh', city: 'Mumbai', previousBalance: 0 },
      { id: 'cus-002', name: 'Big Bazaar', city: 'Surat', previousBalance: 15000 },
    ];
    const mockInvoices = [
      { id: 'inv-001', invoiceNo: 'INV-2026-1001', date: today, customerName: 'Reliance Fresh', todayAmount: 1250, paidAmount: 0, remainingBalance: 1250, items: [] },
    ];

    localStorage.setItem(STORAGE_KEYS.fruits, JSON.stringify(mockFruits));
    localStorage.setItem(STORAGE_KEYS.suppliers, JSON.stringify(mockSuppliers));
    localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(mockCustomers));
    localStorage.setItem(STORAGE_KEYS.invoices, JSON.stringify(mockInvoices));
    localStorage.setItem(STORAGE_KEYS.setupDone, 'true');
  } catch (e) {
    // ignore
  }

  return {
    profile: recommendation.key,
    reset_performed: true,
    deleted_counts: {
      fruits: 0,
      suppliers: 0,
      customers: 0,
      vehicle_arrivals: 0,
      purchase_invoices: 0,
      sales_invoices: 0,
      payments: 0,
      app_settings: 0,
    },
    inserted_counts: recommendation.counts,
    started_on: new Date(Date.now() - recommendation.approx_history_days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10),
    ended_on: now.slice(0, 10),
    seeded_at: now,
    company_name: 'Talha Fruit Co.',
    settings_keys: ['tfc_erp_settings', 'tfc_erp_companies', 'tfc_erp_active_company', 'tfc_erp_demo_seed_metadata'],
  };
}

export const dbIpc = {
  /**
   * Returns the current database connection status.
   * Use this to check if SQLite is ready before running queries.
   */
  getStats(): Promise<DbStats> {
    return ipcInvoke<DbStats>(
      CMD.db.getStats,
      undefined,
      // Browser fallback
      {
        status: 'not_connected',
        employees: { total: 0, active: 0, inactive: 0 },
      },
    );
  },

  /**
   * Returns recommended dataset sizes and scaling guidance for offline ERP testing.
   */
  getSeedPlan(): Promise<DbSeedPlan> {
    return ipcInvoke<DbSeedPlan>(
      CMD.db.getSeedPlan,
      undefined,
      FALLBACK_SEED_PLAN,
    );
  },

  /**
   * Clears ERP tables (scoped to company) and inserts deterministic demo data.
   */
  reseedDemoData(profile: SeedProfileKey, companyId?: string | null): Promise<DbSeedExecutionResult> {
    return ipcInvoke<DbSeedExecutionResult>(
      CMD.db.reseedDemoData,
      { profile, company_id: companyId ?? null },
      buildFallbackSeedResult(profile),
    );
  },

  /**
   * Clears ERP tables and seeded settings without inserting replacement data.
   */
  resetDemoData(): Promise<DbSeedResetResult> {
    return ipcInvoke<DbSeedResetResult>(
      CMD.db.resetDemoData,
      undefined,
      {
        deleted_counts: {
          fruits: 0,
          suppliers: 0,
          customers: 0,
          vehicle_arrivals: 0,
          purchase_invoices: 0,
          sales_invoices: 0,
          payments: 0,
          app_settings: 0,
        },
        reset_at: new Date().toISOString(),
      },
    );
  },
};
