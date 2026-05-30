import { useEffect, useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export interface DataTableController<TSortKey extends string> {
  page: number;
  pageSize: number;
  sortBy: TSortKey;
  sortDir: SortDirection;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSortBy: (key: TSortKey) => void;
  setSortDir: (direction: SortDirection) => void;
}

export interface UseDataTableOptions<TData, TSortKey extends string> {
  data: TData[];
  initialSortBy: TSortKey;
  initialSortDir?: SortDirection;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  searchTerm?: string;
  searchFn?: (row: TData, searchTerm: string) => boolean;
  filters?: Array<(row: TData) => boolean>;
  sortComparators: Record<TSortKey, (a: TData, b: TData) => number>;
  stateController?: DataTableController<TSortKey>;
  resetPageOn?: unknown[];
}

export interface UseDataTableResult<TData, TSortKey extends string> {
  rows: TData[];
  pageRows: TData[];
  totalRecords: number;
  totalPages: number;
  page: number;
  pageSize: number;
  pageSizeOptions: number[];
  sortBy: TSortKey;
  sortDir: SortDirection;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  toggleSort: (key: TSortKey) => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  goPrev: () => void;
  goNext: () => void;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const useDataTable = <TData, TSortKey extends string>(
  options: UseDataTableOptions<TData, TSortKey>,
): UseDataTableResult<TData, TSortKey> => {
  const {
    data,
    initialSortBy,
    initialSortDir = "desc",
    initialPageSize = 10,
    pageSizeOptions = [10, 20, 50, 100],
    searchTerm = "",
    searchFn,
    filters = [],
    sortComparators,
    stateController,
    resetPageOn = [],
  } = options;

  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(initialPageSize);
  const [internalSortBy, setInternalSortBy] = useState<TSortKey>(initialSortBy);
  const [internalSortDir, setInternalSortDir] =
    useState<SortDirection>(initialSortDir);

  const page = stateController?.page ?? internalPage;
  const pageSize = stateController?.pageSize ?? internalPageSize;
  const sortBy = stateController?.sortBy ?? internalSortBy;
  const sortDir = stateController?.sortDir ?? internalSortDir;

  const setPage = (nextPage: number) => {
    const safePage = Math.max(1, Math.floor(nextPage));
    if (stateController) {
      stateController.setPage(safePage);
      return;
    }
    setInternalPage(safePage);
  };

  const setPageSize = (nextSize: number) => {
    const safeSize = Math.max(1, Math.floor(nextSize));
    if (stateController) {
      stateController.setPageSize(safeSize);
      stateController.setPage(1);
      return;
    }
    setInternalPageSize(safeSize);
    setInternalPage(1);
  };

  const setSortBy = (nextSortBy: TSortKey) => {
    if (stateController) {
      stateController.setSortBy(nextSortBy);
      return;
    }
    setInternalSortBy(nextSortBy);
  };

  const setSortDir = (nextSortDir: SortDirection) => {
    if (stateController) {
      stateController.setSortDir(nextSortDir);
      return;
    }
    setInternalSortDir(nextSortDir);
  };

  const filteredRows = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    return data.filter((row) => {
      if (searchFn && normalized && !searchFn(row, normalized)) {
        return false;
      }

      for (const filterFn of filters) {
        if (!filterFn(row)) {
          return false;
        }
      }

      return true;
    });
  }, [data, filters, searchFn, searchTerm]);

  const rows = useMemo(() => {
    const comparator = sortComparators[sortBy];
    const multiplier = sortDir === "asc" ? 1 : -1;

    return [...filteredRows].sort((a, b) => {
      try {
        const result = comparator(a, b);
        return Number.isFinite(result) ? result * multiplier : 0;
      } catch {
        return 0;
      }
    });
  }, [filteredRows, sortBy, sortComparators, sortDir]);

  const totalRecords = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = clamp(page, 1, totalPages);

  useEffect(() => {
    if (safePage !== page) {
      setPage(safePage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage, page, totalPages]);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, ...resetPageOn]);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, safePage, pageSize]);

  const toggleSort = (key: TSortKey) => {
    if (sortBy === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
      return;
    }

    setSortBy(key);
    setSortDir("desc");
  };

  const canGoPrev = safePage > 1;
  const canGoNext = safePage < totalPages;

  return {
    rows,
    pageRows,
    totalRecords,
    totalPages,
    page: safePage,
    pageSize,
    pageSizeOptions,
    sortBy,
    sortDir,
    setPage,
    setPageSize,
    toggleSort,
    canGoPrev,
    canGoNext,
    goPrev: () => setPage(safePage - 1),
    goNext: () => setPage(safePage + 1),
  };
};
