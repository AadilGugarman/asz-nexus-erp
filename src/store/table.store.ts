import { createStore } from 'zustand/vanilla';
import type { SortDirection } from '@/hooks/useDataTable';

export interface DataTableStoreState<TSortKey extends string> {
  page: number;
  pageSize: number;
  sortBy: TSortKey;
  sortDir: SortDirection;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSortBy: (sortBy: TSortKey) => void;
  setSortDir: (sortDir: SortDirection) => void;
}

export const createDataTableStore = <TSortKey extends string>(options: {
  initialSortBy: TSortKey;
  initialSortDir?: SortDirection;
  initialPageSize?: number;
}) => {
  const { initialSortBy, initialSortDir = 'desc', initialPageSize = 20 } = options;

  return createStore<DataTableStoreState<TSortKey>>((set) => ({
    page: 1,
    pageSize: initialPageSize,
    sortBy: initialSortBy,
    sortDir: initialSortDir,
    setPage: (page) => set({ page: Math.max(1, Math.floor(page)) }),
    setPageSize: (pageSize) => set({ page: 1, pageSize: Math.max(1, Math.floor(pageSize)) }),
    setSortBy: (sortBy) => set({ sortBy }),
    setSortDir: (sortDir) => set({ sortDir }),
  }));
};
