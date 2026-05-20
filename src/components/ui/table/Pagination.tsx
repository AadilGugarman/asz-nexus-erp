import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
  label?: string;
}

const getVisiblePages = (page: number, totalPages: number): Array<number | '...'> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  if (page <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }

  if (page >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, '...', page - 1, page, page + 1, '...', totalPages];
};

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalRecords,
  pageSize,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  className,
  label = 'records',
}) => {
  const visiblePages = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages]);
  const firstRecord = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRecord = Math.min(totalRecords, page * pageSize);

  return (
    <div
      className={`px-4 py-3 bg-[#f8fafc] dark:bg-slate-950/40 border-t border-[#edf2f7] dark:border-slate-800 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${className ?? ''}`}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          onPageChange(Math.max(1, page - 1));
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          onPageChange(Math.min(totalPages, page + 1));
        }
        if (event.key === 'Home') {
          event.preventDefault();
          onPageChange(1);
        }
        if (event.key === 'End') {
          event.preventDefault();
          onPageChange(totalPages);
        }
      }}
      tabIndex={0}
      aria-label="Table pagination"
    >
      <div className="text-xs font-semibold text-[#64748b] dark:text-slate-400 flex items-center gap-2 flex-wrap">
        <span>
          Showing {firstRecord}-{lastRecord} of {totalRecords} {label}
        </span>
        <label className="inline-flex items-center gap-1">
          <span className="text-[11px]">Rows:</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="erp-input min-h-0 rounded-lg px-2 py-1 text-xs font-semibold"
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#dbe4ef] dark:border-slate-700 text-xs font-semibold text-[#475569] dark:text-slate-300 disabled:opacity-50"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Prev
        </button>

        {visiblePages.map((entry, idx) =>
          entry === '...' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-xs text-[#94a3b8] dark:text-slate-500">
              ...
            </span>
          ) : (
            <button
              key={`page-${entry}`}
              type="button"
              onClick={() => onPageChange(entry)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                entry === page
                  ? 'bg-[linear-gradient(135deg,#00C896,#00AEEF)] text-white border-transparent'
                  : 'border-[#dbe4ef] dark:border-slate-700 text-[#475569] dark:text-slate-300'
              }`}
              aria-current={entry === page ? 'page' : undefined}
            >
              {entry}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#dbe4ef] dark:border-slate-700 text-xs font-semibold text-[#475569] dark:text-slate-300 disabled:opacity-50"
          aria-label="Next page"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
