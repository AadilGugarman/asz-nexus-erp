import React from 'react';
import { Inbox } from 'lucide-react';

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  compact?: boolean;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 6, cols = 6, compact = false }) => {
  const rowHeight = compact ? 'h-7' : 'h-9';

  return (
    <div className="p-4" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((__, colIdx) => (
              <div
                key={`${rowIdx}-${colIdx}`}
                className={`${rowHeight} rounded-lg bg-[#edf2f7] animate-pulse`}
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
    <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#e2e8f0] bg-[#f8fafc] text-[#94a3b8]">
      <Inbox className="h-5 w-5" />
    </div>
    <p className="text-sm font-semibold text-[#0f172a]">{title}</p>
    <p className="mt-1 text-xs text-[#64748b]">{subtitle}</p>
  </div>
);
