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
import { STORAGE_KEYS } from '@/config';
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

async function buildFallbackSeedResult(profile: SeedProfileKey): Promise<DbSeedExecutionResult> {
  const recommendation = FALLBACK_SEED_PLAN.profiles.find((item) => item.key === profile)
    ?? FALLBACK_SEED_PLAN.profiles[1];
  const now = new Date().toISOString();
  const today = now.slice(0, 10);

  // ── Browser Mock Seeding ────────────────────────────────────────────────
  // In browser dev mode (no Tauri/SQLite), write a tiny mock dataset so the
  // dashboard isn't empty. We write to company-scoped keys so switching
  // companies doesn't bleed data across them.
  try {
    const mockFruits = [
      { id: 'f-001', name: 'Mango', varieties: ['Kesar', 'Alphonso'] },
      { id: 'f-002', name: 'Apple', varieties: ['Shimla', 'Royal'] },
      { id: 'f-003', name: 'Banana', varieties: ['Robusta', 'Nendran'] },
      { id: 'f-004', name: 'Grapes', varieties: ['Green Seedless', 'Black Jumbo'] },
    ];
    const mockSuppliers = [
      { id: 'sup-001', name: 'Ahmedabad Fruit Supply', city: 'Ahmedabad', previousBalance: 12500 },
      { id: 'sup-002', name: 'Nashik Grapes Traders', city: 'Nashik', previousBalance: 45000 },
      { id: 'sup-003', name: 'Pune Fresh Farms', city: 'Pune', previousBalance: 8000 },
    ];
    const mockCustomers = [
      { id: 'cus-001', name: 'Reliance Fresh', city: 'Mumbai', previousBalance: 0 },
      { id: 'cus-002', name: 'Big Bazaar', city: 'Surat', previousBalance: 15000 },
      { id: 'cus-003', name: 'Metro Cash & Carry', city: 'Ahmedabad', previousBalance: 5000 },
    ];
    const mockInvoices = [
      {
        id: 'inv-001', invoiceNo: 'INV-2026-1001', date: today,
        customerId: 'cus-001', customerName: 'Reliance Fresh',
        todayAmount: 12500, paidAmount: 5000, remainingBalance: 7500,
        previousBalance: 0, items: [
          { id: 'i1', fruit: 'Mango', lotVariety: 'Kesar', caret: 10, weight: 180, rate: 65, amount: 11700 },
        ],
        createdAt: now,
      },
      {
        id: 'inv-002', invoiceNo: 'INV-2026-1002', date: today,
        customerId: 'cus-002', customerName: 'Big Bazaar',
        todayAmount: 8400, paidAmount: 8400, remainingBalance: 0,
        previousBalance: 15000, items: [
          { id: 'i2', fruit: 'Apple', lotVariety: 'Shimla', caret: 8, weight: 120, rate: 70, amount: 8400 },
        ],
        createdAt: now,
      },
    ];
    const mockPayments = [
      { id: 'pay-001', date: today, partyType: 'CUSTOMER', partyId: 'cus-001', partyName: 'Reliance Fresh', amount: 5000, paymentMode: 'Cash', referenceNo: '', notes: 'Partial payment' },
    ];

    // Determine the active company id to scope the keys
    let activeCompanyId: string | null = null;
    try {
      const { useSettingsStore } = await import('@/store/settings.store');
      activeCompanyId = useSettingsStore.getState().activeCompanyId;
    } catch { /* ignore */ }

    // Write to both scoped key (for company isolation) and unscoped key (fallback)
    const scope = activeCompanyId ? `__${activeCompanyId}` : '';
    const write = (key: string, value: unknown) => {
      const json = JSON.stringify(value);
      localStorage.setItem(key, json);
      if (scope) localStorage.setItem(`${key}${scope}`, json);
    };

    write(STORAGE_KEYS.fruits, mockFruits);
    write(STORAGE_KEYS.suppliers, mockSuppliers);
    write(STORAGE_KEYS.customers, mockCustomers);
    write(STORAGE_KEYS.invoices, mockInvoices);
    write(STORAGE_KEYS.payments, mockPayments);
    localStorage.setItem(STORAGE_KEYS.setupDone, 'true');
  } catch (e) {
    // ignore — browser storage may be unavailable
  }

  return {
    profile: recommendation.key,
    reset_performed: true,
    deleted_counts: {
      fruits: 0, suppliers: 0, customers: 0,
      vehicle_arrivals: 0, purchase_invoices: 0,
      sales_invoices: 0, payments: 0, app_settings: 0,
    },
    inserted_counts: recommendation.counts,
    started_on: new Date(Date.now() - recommendation.approx_history_days * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10),
    ended_on: today,
    seeded_at: now,
    company_name: 'ASZ Nexus ERP',
    settings_keys: [
      STORAGE_KEYS.settings,
      STORAGE_KEYS.companies,
      STORAGE_KEYS.activeCompany,
      'tfc_erp_demo_seed_metadata',
    ],
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
  async reseedDemoData(profile: SeedProfileKey, companyId?: string | null): Promise<DbSeedExecutionResult> {
    return ipcInvoke<DbSeedExecutionResult>(
      CMD.db.reseedDemoData,
      { profile, company_id: companyId ?? null },
      await buildFallbackSeedResult(profile),
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

  /**
   * Company-scoped reset — deletes only rows belonging to the given company.
   * Production-safe: other companies' data is never touched.
   */
  resetCompanyData(companyId: string): Promise<DbSeedResetResult> {
    return ipcInvoke<DbSeedResetResult>(
      CMD.db.resetCompanyData,
      { profile: "none", company_id: companyId },
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
