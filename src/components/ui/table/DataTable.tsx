import React from 'react';
import { cn } from '@/utils/cn';

interface DataTableProps {
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  scrollClassName?: string;
  children: React.ReactNode;
}

export const DataTable: React.FC<DataTableProps> = ({
  toolbar,
  footer,
  className,
  scrollClassName,
  children,
}) => {
  return (
    <div className={cn('erp-table-wrap rounded-2xl flex flex-col', className)}>
      {toolbar}
      <div className={cn('overflow-x-auto custom-scrollbar', scrollClassName)}>{children}</div>
      {footer}
    </div>
  );
};
