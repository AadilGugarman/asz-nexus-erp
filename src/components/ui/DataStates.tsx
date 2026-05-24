import React from 'react';
import { Inbox } from 'lucide-react';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 6, cols = 6 }) => {
  const rowHeight = 'h-9';

  return (
    <div className="p-4" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((__, colIdx) => (
              <div
                key={`${rowIdx}-${colIdx}`}
                className={`${rowHeight} rounded-lg bg-[#edf2f7] dark:bg-slate-800/80 animate-pulse`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

interface ModuleEmptyStateProps {
  title: string;
  subtitle: string;
}

export const ModuleEmptyState: React.FC<ModuleEmptyStateProps> = ({ title, subtitle }) => (
  <div className="py-16 px-6 text-center">
    <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#e2e8f0] dark:border-slate-700 bg-[#f8fafc] dark:bg-slate-900 text-[#94a3b8] dark:text-slate-500">
      <Inbox className="h-5 w-5" />
    </div>
    <p className="text-sm font-semibold text-[#0f172a] dark:text-slate-100">{title}</p>
    <p className="mt-1 text-xs text-[#64748b] dark:text-slate-400">{subtitle}</p>
  </div>
);
