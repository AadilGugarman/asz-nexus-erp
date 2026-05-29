/**
 * hooks/useSuppliers.ts
 * Sample data hook — canonical pattern for all ERP modules.
 *
 * Shows two strategies:
 *   1. IPC strategy  — calls Rust via Tauri commands (production path)
 *   2. Direct Drizzle — queries SQLite directly from the frontend (dev/fallback)
 *
 * In production, prefer the IPC strategy: Rust handles validation,
 * business logic, and complex queries. Use direct Drizzle only for
 * simple reads where you don't need Rust-side logic.
 *
 * Usage (IPC strategy — recommended):
 *   const { suppliers, loading, error, create, update, remove } = useSuppliers();
 *
 * Usage (direct Drizzle):
 *   const { suppliers, loading } = useSuppliersLocal({ search: 'Ahmed' });
 */

import { useState, useEffect, useCallback } from "react";
import { ipc } from "@/ipc";
import { useDb } from "./useDb";
import type {
  Supplier,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierFilter,
} from "@/ipc";
import type { DbLedger } from "@/db";

// ── IPC strategy (recommended for production) ─────────────────────────────────

interface UseSuppliersState {
  suppliers: Supplier[];
  total: number;
  loading: boolean;
  error: string | null;
}

interface UseSuppliersActions {
  refetch: () => Promise<void>;
  create: (data: CreateSupplierRequest) => Promise<Supplier>;
  update: (id: string, data: UpdateSupplierRequest) => Promise<Supplier>;
  remove: (id: string) => Promise<void>;
}

export function useSuppliers(
  filter: SupplierFilter = {},
): UseSuppliersState & UseSuppliersActions {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ipc.supplier.list(filter);
      setSuppliers(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.search, filter.city, filter.page, filter.limit]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const create = useCallback(
    async (data: CreateSupplierRequest): Promise<Supplier> => {
      const supplier = await ipc.supplier.create(data);
      await fetch(); // refresh list
      return supplier;
    },
    [fetch],
  );

  const update = useCallback(
    async (id: string, data: UpdateSupplierRequest): Promise<Supplier> => {
      const supplier = await ipc.supplier.update(id, data);
      setSuppliers((prev) => prev.map((s) => (s.id === id ? supplier : s)));
      return supplier;
    },
    [],
  );

  const remove = useCallback(async (id: string): Promise<void> => {
    await ipc.supplier.delete(id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    setTotal((prev) => prev - 1);
  }, []);

  return {
    suppliers,
    total,
    loading,
    error,
    refetch: fetch,
    create,
    update,
    remove,
  };
}

// ── Direct Drizzle strategy (simple reads, no Rust round-trip) ────────────────

interface UseLocalState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

/**
 * Reads suppliers directly via Drizzle (no Tauri command round-trip).
 * Good for autocomplete/combobox where you need fast local queries.
 */
export function useSuppliersLocal(
  filter: { search?: string } = {},
): UseLocalState<DbLedger> {
  const { db, ready } = useDb();
  const [data, setData] = useState<DbLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    setLoading(true);

    db.suppliers
      .search({ search: filter.search, limit: 100 })
      .then((result) => {
        if (!cancelled) {
          setData(result.items);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Query failed");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ready, db, filter.search]);

  return { data, loading, error };
}
