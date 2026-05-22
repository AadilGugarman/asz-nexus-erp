/\*\*

- AppContext-SQLite Refactoring Guide
-
- This file documents how to refactor AppContext from localStorage-first
- to SQLite-first architecture.
-
- Each section shows the OLD (localStorage) pattern and NEW (DB + hydration) pattern.
-
- Implementation can be done incrementally, feature by feature.
  \*/

// ============================================================================
// PATTERN 1: Loading Data
// ============================================================================

// OLD: Load from localStorage with fallback
// ─────────────────────────────────────────────────────────────────────────
// const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
// const saved = localStorage.getItem(STORAGE_KEYS.suppliers);
// return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
// });

// NEW: Load from SQLite via hydration hook
// ─────────────────────────────────────────────────────────────────────────
// const { data: suppliers, isLoading } = useSuppliers();
// (No need for useState or useEffect — hook handles it)

// ============================================================================
// PATTERN 2: Creating Records
// ============================================================================

// OLD: Update state, localStorage auto-saves via useEffect
// ─────────────────────────────────────────────────────────────────────────
// const addSupplier = (supplier: Omit<Supplier, 'id'>) => {
// const newId = `s-${Date.now()}`;
// setSuppliers(prev => [...prev, { id: newId, ...supplier }]);
// // useEffect writes to localStorage
// };

// NEW: Update state AND write to SQLite
// ─────────────────────────────────────────────────────────────────────────
// const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
// const newId = `s-${Date.now()}`;
// const newSupplier = { id: newId, ...supplier };
//
// // Write to DB first (source of truth)
// try {
// await dbService.suppliers.insert({
// id: newSupplier.id,
// name: newSupplier.name,
// code: newSupplier.code || '',
// phone: newSupplier.phone || '',
// city: newSupplier.city || '',
// previousBalance: newSupplier.previousBalance || 0,
// });
// } catch (err) {
// console.error('[AppContext] Failed to insert supplier:', err);
// throw err; // Let caller handle
// }
//
// // Update local state for UI responsiveness
// setSuppliers(prev => [...prev, newSupplier]);
// };

// ============================================================================
// PATTERN 3: Updating Records
// ============================================================================

// OLD: Update state, localStorage auto-saves
// ─────────────────────────────────────────────────────────────────────────
// const updateSupplier = (supplier: Supplier) => {
// setSuppliers(prev =>
// prev.map(s => s.id === supplier.id ? supplier : s)
// );
// };

// NEW: Update state AND DB
// ─────────────────────────────────────────────────────────────────────────
// const updateSupplier = async (supplier: Supplier) => {
// try {
// await dbService.suppliers.update(supplier.id, {
// name: supplier.name,
// code: supplier.code || '',
// phone: supplier.phone || '',
// city: supplier.city || '',
// previousBalance: supplier.previousBalance || 0,
// });
// } catch (err) {
// console.error('[AppContext] Failed to update supplier:', err);
// throw err;
// }
//
// setSuppliers(prev =>
// prev.map(s => s.id === supplier.id ? supplier : s)
// );
// };

// ============================================================================
// PATTERN 4: Deleting Records
// ============================================================================

// OLD: Filter state, localStorage auto-saves
// ─────────────────────────────────────────────────────────────────────────
// const deleteSupplier = (id: string) => {
// setSuppliers(prev => prev.filter(s => s.id !== id));
// };

// NEW: Delete from DB, then update state
// ─────────────────────────────────────────────────────────────────────────
// const deleteSupplier = async (id: string) => {
// try {
// await dbService.suppliers.delete(id);
// } catch (err) {
// console.error('[AppContext] Failed to delete supplier:', err);
// throw err;
// }
//
// setSuppliers(prev => prev.filter(s => s.id !== id));
// };

// ============================================================================
// PATTERN 5: Removing useEffect Blocks
// ============================================================================

// OLD: Auto-save to localStorage
// ─────────────────────────────────────────────────────────────────────────
// useEffect(() => {
// localStorage.setItem(STORAGE_KEYS.suppliers, JSON.stringify(suppliers));
// }, [suppliers]);

// NEW: DELETE THIS — DB writes happen in mutations, not in effects
// ─────────────────────────────────────────────────────────────────────────

// ============================================================================
// PATTERN 6: Complex Transformations
// ============================================================================

// For computed values (ledgers, inventory), transform from DB data:
// ─────────────────────────────────────────────────────────────────────────
// const getSupplierLedger = (supplierId: string): SupplierLedgerEntry[] => {
// // Calculate from current state (suppliers, invoices, payments)
// // This uses the data loaded from DB via hydration hooks
// // No changes needed — just works with DB-loaded data
// };

// ============================================================================
// STEP-BY-STEP REFACTORING CHECKLIST
// ============================================================================

/\*
For each data type (suppliers, customers, invoices, etc.):

☐ 1. Replace useState with useDbHydration hook
const [suppliers, setSuppliers] = useState(...)
→ const { data: suppliers } = useSuppliers()

☐ 2. Add dbService calls to create mutations
addSupplier: async (supplier) => {
await dbService.suppliers.insert(...)
setSuppliers(prev => [...prev, supplier])
}

☐ 3. Add dbService calls to update mutations
updateSupplier: async (supplier) => {
await dbService.suppliers.update(supplier.id, ...)
setSuppliers(prev => [...prev.map(...)])
}

☐ 4. Add dbService calls to delete mutations
deleteSupplier: async (id) => {
await dbService.suppliers.delete(id)
setSuppliers(prev => [...prev.filter(...)])
}

☐ 5. Remove useEffect blocks that write to localStorage
useEffect(() => {
localStorage.setItem(STORAGE_KEYS.suppliers, ...)
})
→ DELETE

☐ 6. Test in browser - Add supplier → check DB was written - Update supplier → check DB was updated - Delete supplier → check DB was deleted - Refresh page → data persists from DB

☐ 7. Verify migration stats in console
[Data Migration] Complete: { suppliers: N, ... }
\*/

// ============================================================================
// MIGRATION SCHEMA MAPPING
// ============================================================================

/\*
TypeScript Type → Drizzle Schema → Back to Type

Supplier:
TS: { id, name, code, phone, city, previousBalance }
DB: { id, name, code, phone, city, previous_balance }
Insert: dbService.suppliers.insert({ ... })
Transform: (db: DbSupplier) => Supplier

Customer:
TS: { id, name, phone, city, previousBalance }
DB: { id, name, phone, city, previous_balance }

Fruit:
TS: { id, name, varieties: string[] }
DB: { id, name, varieties: JSON string }
Transform: JSON.parse(db.varieties)

Invoice:
TS: { id, ..., items: InvoiceItem[] }
DB: { id, ..., items: JSON string }
Transform: JSON.parse(db.items)

Payment:
TS: { id, date, partyType, partyId, partyName, ... }
DB: { id, date, party_type, party_id, party_name, ... }
\*/

// ============================================================================
// ERROR HANDLING PATTERN
// ============================================================================

/\*
All DB mutations should handle errors gracefully:

const updateSupplier = async (supplier: Supplier) => {
try {
// Write to DB (source of truth)
await dbService.suppliers.update(supplier.id, {...});

    // Update UI optimistically
    setSuppliers(prev => prev.map(...));

} catch (err) {
// Log error
console.error('[AppContext] Update failed:', err);

    // Notify user
    toast.error('Failed to save supplier');

    // Refetch from DB to recover state
    const fresh = await dbService.suppliers.findById(supplier.id);
    if (fresh) {
      setSuppliers(prev =>
        prev.map(s => s.id === fresh.id ? fresh : s)
      );
    }

    // Re-throw for caller if critical
    throw err;

}
};
\*/

// ============================================================================
// IMPORTS NEEDED IN REFACTORED AppContext
// ============================================================================

/_
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
_/

// ============================================================================
// TESTING THE REFACTOR
// ============================================================================

/\*

1. Start app — should see "Migrating data to database..." in startup message
2. Check console for migration stats
3. Open DevTools → Application → localStorage
   - Should see ONLY UI keys (tfc_erp_appearance, etc.)
   - Should NOT see tfc_erp_fruits, tfc_erp_suppliers, etc.
4. Create/Edit/Delete records
   - State updates immediately (UI responsive)
   - Data persists in SQLite (check with `dbService.suppliers.findAll()`)
5. Refresh page
   - Data loads from DB (not localStorage)
   - No loading flicker (data was cached in state)
6. Check error handling
   - Simulate DB failure
   - Verify error message and recovery
     \*/

export {};
