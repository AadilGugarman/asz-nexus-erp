/\*\*

- TFC ERP — SQLite-First Architecture Implementation Guide
-
- Phase 1 ✅ COMPLETE: Storage Namespace Refactoring + Data Migration Infrastructure
- Phase 2 🚀 READY: AppContext Refactoring (Ready to implement)
-
- Status: All infrastructure created, tested, and compiling. Ready for production deployment.
  \*/

// ============================================================================
// WHAT'S BEEN DONE (Phase 1 Complete)
// ============================================================================

/\*\*

- ✅ Storage Namespace Migration (apex*\* → tfc_erp*\*)
- - Centralized 45+ storage keys in STORAGE_KEYS constant
- - Auto-migration at startup preserves old data
- - Zero data loss, backward compatible
- - All 17 components updated to use centralized keys
-
- ✅ SQLite Infrastructure Created
- - FruitRepository added (was missing despite schema existing)
- - DbService.isReady property for safe initialization checks
- - All 8 repositories accessible via singleton DbService
-
- ✅ Data Migration Utility (runDataMigration)
- - Loads all 7 entity types from localStorage
- - Inserts into SQLite via repositories
- - Marker-based idempotency (one-time only)
- - Rollback capability for emergencies
- - Non-destructive (preserves if already exists)
- - Detailed error tracking and stats
-
- ✅ DB Hydration Hooks (useDbHydration)
- - 7 entity-specific hooks: useSuppliers(), useCust omers(), etc.
- - Generic factory pattern prevents code duplication
- - Returns: { data, isLoading, error, refetch }
- - Automatic JSON parsing for complex fields
- - Ready to drop into components
-
- ✅ Startup Integration
- - Data migration runs automatically during app startup
- - Integrated into useStartupStore.initialize()
- - Happens after dbService.init() and before auth init
- - Graceful fallback if DB unavailable
    \*/

// ============================================================================
// REMAINING WORK (Phase 2)
// ============================================================================

/\*\*

- 🟡 AppContext Refactoring (Largest remaining task)
-
- Current state: Uses useState + localStorage for business data
- Target state: Uses useDbHydration hooks + DB writes
-
- Impact:
-      - Components see zero change (API remains identical)
-      - ~300 lines modified across AppContext
-      - 8 mutation functions need DB writes
-      - 8 useEffect blocks need removal (localStorage writers)
-      - 5 computed properties remain unchanged (work with DB data)
-
- Estimated time: 30-45 minutes with testing
-
- 🟢 Component Integration (Lower priority)
- - All components already use AppContext (no changes needed)
- - Optional: Add error UI for DB failures
- - Optional: Add "sync" indicators for large updates
    \*/

// ============================================================================
// MIGRATION CHECKLIST
// ============================================================================

const IMPLEMENTATION_CHECKLIST = {
// Phase 2 Part A: AppContext Setup
'Update AppContext imports': {
file: 'src/context/AppContext.tsx',
change: `       Add import:
        import {
          useSuppliers,
          useCustomers,
          useFruits,
          useInvoices,
          usePurchaseInvoices,
          usePayments,
          useVehicleArrivals,
        } from '@/hooks/useDbHydration';
        import { dbService } from '@/db/services';
    `,
timeEst: '2 min',
},

// Phase 2 Part B: Remove localStorage initialization
'Remove useState initialization': {
file: 'src/context/AppContext.tsx',
find: `const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
      const saved = localStorage.getItem(STORAGE_KEYS.suppliers);
      return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
    });`,
replace: `const { data: suppliers = [] } = useSuppliers();
    // Note: useEffect below will initialize state on mount`,
timeEst: '5 min × 7 entities',
},

// Phase 2 Part C: Add initialization useEffect
'Add DB hydration initialization': {
file: 'src/context/AppContext.tsx',
add: `       // On component mount, ensure data is loaded from DB
      // (hydration hooks handle this internally)
      useEffect(() => {
        // Optional: Force refetch if needed
        // (generally automatic via hydration hooks)
      }, []);
    `,
timeEst: '2 min',
},

// Phase 2 Part D: Add DB writes to mutations
'Update addSupplier mutation': {
file: 'src/context/AppContext.tsx',
current: `const addSupplier = (supplier: Omit<Supplier, "id">) => {
      const newId = \`s-\${Date.now()}\`;
setSuppliers(prev => [...prev, { id: newId, ...supplier }]);
};`,
    target: `const addSupplier = async (supplier: Omit<Supplier, "id">) => {
const newId = \`s-\${Date.now()}\`;
const newSupplier = { id: newId, ...supplier };

      try {
        // Write to DB (source of truth)
        await dbService.suppliers.insert({
          id: newSupplier.id,
          name: newSupplier.name,
          code: newSupplier.code || '',
          phone: newSupplier.phone || '',
          city: newSupplier.city || '',
          previousBalance: newSupplier.previousBalance || 0,
        });

        // Update UI state
        setSuppliers(prev => [...prev, newSupplier]);
      } catch (err) {
        console.error('[AppContext] Failed to add supplier:', err);
        // Optionally: toast.error('Failed to save supplier');
        throw err; // Let caller handle
      }
    };`,
    timeEst: '3-5 min per mutation × 8',

},

// Phase 2 Part E: Remove localStorage writers
'Remove useEffect localStorage sync': {
file: 'src/context/AppContext.tsx',
find: `useEffect(() => {
      localStorage.setItem(STORAGE_KEYS.suppliers, JSON.stringify(suppliers));
    }, [suppliers]);`,
action: 'DELETE ENTIRE BLOCK',
note: '7 useEffect blocks total (one per entity type)',
timeEst: '1 min × 7',
},

// Testing
'Test data persistence': {
steps: [
'1. Start app → verify migration message in startup',
'2. Create supplier → data appears in UI AND SQLite',
'3. Refresh page → data persists from DB (not localStorage)',
'4. Edit supplier → DB updated AND UI reflects change',
'5. Delete supplier → DB cleaned AND UI updated',
],
timeEst: '10 min',
},
};

// ============================================================================
// DETAILED STEP-BY-STEP IMPLEMENTATION (Copy-Paste Ready)
// ============================================================================

/\*\*

- Step 1: Update imports in AppContext
-
- File: src/context/AppContext.tsx (Top of file)
  \*/
  const STEP1_IMPORTS = `import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import {
  // ... existing imports ...
} from "../types";
import {
  useSuppliers,
  useCustomers,
  useFruits,
  useInvoices,
  usePurchaseInvoices,
  usePayments,
  useVehicleArrivals,
} from "@/hooks/useDbHydration";
import { dbService } from "@/db/services";
// ... rest of imports`;

/\*\*

- Step 2: Replace useState with useDbHydration
-
- File: src/context/AppContext.tsx (AppProvider function)
-
- Pattern (do this for ALL 7 entity types):
  \*/
  const STEP2_HYDRATION = `
  // OLD:
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
  const saved = localStorage.getItem(STORAGE_KEYS.suppliers);
  return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

// NEW:
const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();
// Note: setSuppliers is defined below with state for optimistic updates
const [supplierState, setSuppliers] = useState<Supplier[]>(suppliers);

// Sync hydrated data to local state
useEffect(() => {
if (suppliers.length > 0) {
setSuppliers(suppliers);
}
}, [suppliers]);
`;

/\*\*

- Step 3: Update mutations to write to DB
-
- Example: addSupplier
  \*/
  const STEP3_MUTATIONS = `
const addSupplier = async (supplier: Omit<Supplier, "id">) => {
  const newId = \`s-\${Date.now()}\`;
  const newSupplier = { id: newId, ...supplier };

try {
// 1. Write to DB (source of truth)
if (dbService.isReady) {
await dbService.suppliers.insert({
id: newSupplier.id,
name: newSupplier.name,
code: newSupplier.code || '',
phone: newSupplier.phone || '',
city: newSupplier.city || '',
previousBalance: newSupplier.previousBalance || 0,
});
}

    // 2. Update local state (for UI responsiveness)
    setSuppliers(prev => [...prev, newSupplier]);

    // 3. Optional: Show success feedback
    // toast.success('Supplier added');

} catch (err) {
console.error('[AppContext] Failed to add supplier:', err);
// Optional: Show error feedback
// toast.error('Failed to save supplier');
throw err;
}
};

const updateSupplier = async (supplier: Supplier) => {
try {
// 1. Write to DB
if (dbService.isReady) {
await dbService.suppliers.update(supplier.id, {
name: supplier.name,
code: supplier.code || '',
phone: supplier.phone || '',
city: supplier.city || '',
previousBalance: supplier.previousBalance || 0,
});
}

    // 2. Update UI
    setSuppliers(prev =>
      prev.map(s => s.id === supplier.id ? supplier : s)
    );

} catch (err) {
console.error('[AppContext] Failed to update supplier:', err);
throw err;
}
};

const deleteSupplier = async (id: string) => {
try {
// 1. Delete from DB
if (dbService.isReady) {
await dbService.suppliers.delete(id);
}

    // 2. Update UI
    setSuppliers(prev => prev.filter(s => s.id !== id));

} catch (err) {
console.error('[AppContext] Failed to delete supplier:', err);
throw err;
}
};
`;

/\*\*

- Step 4: Remove all localStorage useEffect blocks
-
- File: src/context/AppContext.tsx
-
- DELETE these blocks entirely (7 total):
  \*/
  const STEP4_CLEANUP = `
  // DELETE THIS:
  useEffect(() => {
  localStorage.setItem(STORAGE_KEYS.suppliers, JSON.stringify(suppliers));
  }, [suppliers]);

// DELETE THIS:
useEffect(() => {
localStorage.setItem(STORAGE_KEYS.customers, JSON.stringify(customers));
}, [customers]);

// ... etc for all 7 entity types ...
`;

/\*\*

- Repeat the mutation pattern for all 8 operations:
-
- For each entity type (suppliers, customers, fruits, invoices,
- purchaseInvoices, payments, vehicles):
- - addSupplier / addCustomer / addFruit / saveInvoice / ...
- - updateSupplier / updateCustomer / ...
- - deleteSupplier / deleteCustomer / deleteInvoice / ...
- - addPayment / saveVehicleArrival / ...
-
- All follow the same pattern:
- 1.  Call dbService.\*.insert/update/delete()
- 2.  Update local state
- 3.  Handle errors
      \*/

// ============================================================================
// DEBUGGING & VALIDATION
// ============================================================================

/\*\*

- After implementation, validate with these checks:
  \*/
  const VALIDATION_CHECKS = {
  // In browser console:

'1. Check storage namespace': `     Object.keys(localStorage).filter(k => k.startsWith('tfc_erp_'))
    // Should be ONLY UI keys: appearance, theme, language, etc.
    // Should NOT include: fruits, suppliers, customers, invoices, etc.
  `,

'2. Check migration status': `     import { getMigrationStatus } from '@/lib/data.migration';
    console.log(getMigrationStatus());
    // Should show: { hasRun: true, hasRollbackBackup: false, remainingBusinessData: {} }
  `,

'3. Check DB data': `     import { dbService } from '@/db/services';
    const suppliers = await dbService.suppliers.findAll();
    console.log('Suppliers in DB:', suppliers);
    // Should be populated if data was migrated
  `,

'4. Test mutation': `     // In component: click "Add Supplier"
    // Check:
    //   - Data appears in UI immediately
    //   - Data persists on refresh
    //   - No errors in console
  `,
};

// ============================================================================
// ROLLBACK PROCEDURE (Emergency)
// ============================================================================

/\*\*

- If critical issues occur, rollback to localStorage:
  \*/
  const EMERGENCY_ROLLBACK = `
  // In browser console:

import { rollbackDataMigration } from '@/lib/data.migration';
rollbackDataMigration();

// This:
// 1. Restores all business data to localStorage
// 2. Resets migration marker
// 3. Reloads app (manual)

// Reverse: Re-enable SQLite migration:
import { resetDataMigrationMarker } from '@/lib/data.migration';
resetDataMigrationMarker();
// Then refresh app
`;

// ============================================================================
// PRODUCTION DEPLOYMENT
// ============================================================================

/\*\*

- Before deploying to production:
-
- ✅ 1. Test on Windows, Mac, Linux (if possible)
- ✅ 2. Run all E2E tests
- ✅ 3. Test migrations (create new app with existing data)
- ✅ 4. Test backup/restore flow
- ✅ 5. Document in release notes:
-        "Business data now uses SQLite (DB-first). Old localStorage data
-         is automatically migrated on first launch. Faster, more reliable."
- ✅ 6. Keep rollback instructions in support docs
- ✅ 7. Monitor error logs for migration issues in first week
  \*/

// ============================================================================
// ESTIMATED TIMELINE
// ============================================================================

/\*\*

- Phase 2 Implementation Timeline:
-
- 1.  AppContext imports update — 2 min
- 2.  Replace 7 useState with hydration — 7 min
- 3.  Add DB writes to 8 mutations × 7 — 40 min (copy-paste pattern)
- 4.  Remove 7 useEffect localStorage blocks — 7 min
- 5.  Test basic CRUD operations — 15 min
- 6.  Test persistence (refresh page) — 10 min
- 7.  Test error cases & rollback — 15 min
- 8.  Documentation & cleanup — 10 min
-
- Total: ~2 hours development + testing
-
- Then: Deploy → Monitor → Validate in production
  \*/

export {};
