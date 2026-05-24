import React, { useRef, useMemo } from 'react';
import { PurchaseRow, Supplier, Fruit } from '../types';
import { Plus, Copy, Trash2, ClipboardPaste } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CommandSelect, CommandOption } from './ui/CommandSelect';
import { useDataTable } from '../hooks/useDataTable';
import { DataTable, Pagination } from './ui/table';

interface VehicleSpreadsheetProps {
  rows: PurchaseRow[];
  onChangeRows: (rows: PurchaseRow[]) => void;
  suppliers: Supplier[];
  selectedFruit: string;
  fruits: Fruit[];
}

export const VehicleSpreadsheet: React.FC<VehicleSpreadsheetProps> = ({
  rows,
  onChangeRows,
  suppliers,
  selectedFruit,
  fruits,
}) => {
  const tableRef = useRef<HTMLTableElement>(null);
  const { addFruitVariety } = useApp();

  // Available varieties based on selected fruit
  const availableVarieties = React.useMemo(() => {
    const fruitObj = fruits.find(f => f.name.toLowerCase() === selectedFruit.toLowerCase());
    return fruitObj ? fruitObj.varieties : ['Standard', 'Premium', 'Grade A', 'Grade B'];
  }, [selectedFruit, fruits]);

  const supplierOptions: CommandOption[] = useMemo(() => {
    return suppliers.map(s => ({
      id: s.id,
      label: s.name,
      subtitle: s.phone ? `${s.phone} • ${s.city}` : s.city,
      emoji: '🏢'
    }));
  }, [suppliers]);

  const handleCellChange = (index: number, field: keyof PurchaseRow, value: any) => {
    const updated = [...rows];
    const row = { ...updated[index] };

    if (field === 'supplierId') {
      row.supplierId = value;
      const s = suppliers.find(sup => sup.id === value);
      row.supplierName = s ? s.name : value;
    } else if (field === 'caret' || field === 'weight' || field === 'rate') {
      (row as any)[field] = value;
      const w = field === 'weight' ? parseFloat(value) || 0 : parseFloat(String(row.weight)) || 0;
      const r = field === 'rate' ? parseFloat(value) || 0 : parseFloat(String(row.rate)) || 0;
      row.amount = Math.round(w * r); // Smart rounding for wholesale traders
    } else {
      (row as any)[field] = value;
    }

    updated[index] = row;
    onChangeRows(updated);
  };

  const addRow = () => {
    const newRow: PurchaseRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      supplierId: suppliers[0]?.id || '',
      supplierName: suppliers[0]?.name || 'Cash Supplier',
      variety: availableVarieties[0] || 'Standard',
      caret: 0,
      weight: 0,
      rate: 0,
      amount: 0,
      note: ''
    };
    onChangeRows([...rows, newRow]);
  };

  const duplicateRow = (index: number) => {
    const source = rows[index];
    if (!source) return;
    const duplicated: PurchaseRow = {
      ...source,
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const updated = [...rows];
    updated.splice(index + 1, 0, duplicated);
    onChangeRows(updated);
  };

  const deleteRow = (index: number) => {
    if (rows.length <= 1) return; // Keep at least one row
    onChangeRows(rows.filter((_, i) => i !== index));
  };

  // Excel paste handler
  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('Text');
    if (!text) return;

    const pastedRows = text.split('\n').filter(l => l.trim().length > 0);
    if (pastedRows.length === 0) return;

    const newRows: PurchaseRow[] = [];
    pastedRows.forEach(line => {
      const parts = line.split(/\t|,/).map(p => p.trim());
      if (parts.length >= 2) {
        const sName = parts[0];
        const vName = parts[1] || availableVarieties[0];
        const c = parseFloat(parts[2]) || 0;
        const w = parseFloat(parts[3]) || 0;
        const r = parseFloat(parts[4]) || 0;
        const matchedSupplier = suppliers.find(s => s.name.toLowerCase().includes(sName.toLowerCase())) || suppliers[0];

        newRows.push({
          id: `row-paste-${Math.random().toString(36).substr(2, 6)}`,
          supplierId: matchedSupplier?.id || 's1',
          supplierName: matchedSupplier?.name || sName,
          variety: vName,
          caret: c,
          weight: w,
          rate: r,
          amount: Math.round(w * r),
          note: parts[5] || 'Pasted from Excel'
        });
      }
    });

    if (newRows.length > 0) {
      e.preventDefault();
      onChangeRows([...rows, ...newRows]);
    }
  };

  // Enter & Arrow key navigation across table cells
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, rowIndex: number, colIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = document.querySelector(`[data-cell="${rowIndex}-${colIndex + 1}"]`) as HTMLElement;
      if (nextInput) {
        nextInput.focus();
      } else {
        const nextRowInput = document.querySelector(`[data-cell="${rowIndex + 1}-0"]`) as HTMLElement;
        if (nextRowInput) {
          nextRowInput.focus();
        } else if (rows[rowIndex + 1]) {
          focusCellAt(rowIndex + 1, 0);
        } else {
          addRow();
          setTimeout(() => {
            const addedRowInput = document.querySelector(`[data-cell="${rowIndex + 1}-0"]`) as HTMLElement;
            addedRowInput?.focus();
          }, 50);
        }
      }
    } else if (e.key === 'ArrowUp') {
      const target = document.querySelector(`[data-cell="${rowIndex - 1}-${colIndex}"]`) as HTMLElement;
      if (target) target.focus();
      else focusCellAt(rowIndex - 1, colIndex);
    } else if (e.key === 'ArrowDown') {
      const target = document.querySelector(`[data-cell="${rowIndex + 1}-${colIndex}"]`) as HTMLElement;
      if (target) target.focus();
      else if (rows[rowIndex + 1]) focusCellAt(rowIndex + 1, colIndex);
      else addRow();
    } else if (e.key === 'ArrowLeft' && (e.target as HTMLInputElement).selectionStart === 0) {
      const target = document.querySelector(`[data-cell="${rowIndex}-${colIndex - 1}"]`) as HTMLElement;
      target?.focus();
    } else if (e.key === 'ArrowRight' && (e.target as HTMLInputElement).selectionEnd === (e.target as HTMLInputElement).value?.length) {
      const target = document.querySelector(`[data-cell="${rowIndex}-${colIndex + 1}"]`) as HTMLElement;
      target?.focus();
    } else if (e.altKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      addRow();
    } else if (e.altKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      duplicateRow(rowIndex);
    }
  };

  const totalCarets = rows.reduce((sum, r) => sum + (parseFloat(String(r.caret)) || 0), 0);
  const totalWeight = rows.reduce((sum, r) => sum + (parseFloat(String(r.weight)) || 0), 0);
  const totalAmount = rows.reduce((sum, r) => sum + (parseFloat(String(r.amount)) || 0), 0);
  const indexedRows = useMemo(() => rows.map((row, idx) => ({ row, idx })), [rows]);
  const rowTable = useDataTable<(typeof indexedRows)[number], 'idx'>({
    data: indexedRows,
    initialSortBy: 'idx',
    initialSortDir: 'asc',
    initialPageSize: 12,
    pageSizeOptions: [12, 25, 50, 100],
    sortComparators: {
      idx: (a, b) => a.idx - b.idx,
    },
  });

  const focusCellAt = (targetRow: number, targetCol: number) => {
    if (targetRow < 0 || targetRow >= rows.length) return;
    const pageForRow = Math.floor(targetRow / rowTable.pageSize) + 1;
    if (pageForRow !== rowTable.page) {
      rowTable.setPage(pageForRow);
    }
    setTimeout(() => {
      const target = document.querySelector(`[data-cell="${targetRow}-${targetCol}"]`) as HTMLElement | null;
      target?.focus();
    }, 60);
  };

  return (
    <div className="erp-table-wrap rounded-2xl overflow-hidden font-sans">
      {/* Table Toolbar */}
      <div className="px-5 py-4 bg-[var(--surface-bg)] border-b border-[var(--card-border)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">Spreadsheet Purchase Items</span>
          <span className="text-xs bg-[var(--card-bg)] text-[var(--text-muted)] px-2 py-0.5 rounded-full font-mono font-bold border border-[var(--card-border)]">{rows.length} rows active</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={addRow}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row (Alt+A)</span>
          </button>
          <div className="relative group">
            <button
              type="button"
              className="flex items-center space-x-1 px-3 py-1.5 bg-[var(--card-bg)] hover:bg-[var(--surface-bg)] text-[var(--text-secondary)] rounded-lg text-xs font-semibold border border-[var(--card-border)] transition-colors cursor-pointer"
              title="Click any cell and press Ctrl+V to paste tabular data from Excel"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-blue-500" />
              <span>Paste Excel Data</span>
            </button>
            <div className="absolute top-full right-0 mt-1.5 hidden group-hover:block w-72 p-3 bg-[var(--card-bg)] text-xs text-[var(--text-primary)] rounded-xl border border-[var(--card-border)] shadow-[var(--shadow-lg)] z-30 pointer-events-none">
              Copy rows from Excel or Sheets <br/><span className="text-emerald-500 font-mono font-bold">Columns: Supplier, Variety, Caret, Weight, Rate</span> <br/>and press <kbd className="bg-[var(--surface-bg)] px-1 py-0.5 rounded text-[var(--text-primary)] font-mono border border-[var(--card-border)]">Ctrl+V</kbd> anywhere!
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <DataTable
        scrollClassName="scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
        footer={<Pagination page={rowTable.page} totalPages={rowTable.totalPages} totalRecords={rowTable.totalRecords} pageSize={rowTable.pageSize} pageSizeOptions={rowTable.pageSizeOptions} onPageChange={rowTable.setPage} onPageSizeChange={rowTable.setPageSize} label="sheet rows" />}
      >
        <table ref={tableRef} className="erp-table w-full text-left border-collapse" onPaste={handlePaste}>
          <thead>
            <tr className="bg-[var(--table-header-bg)] text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider sticky top-0 border-b border-[var(--table-border)] select-none">
              <th className="py-3 px-4 w-64 min-w-[220px]">Supplier / Party Name</th>
              <th className="py-3 px-3 w-44 min-w-[150px]">Variety (Vakkal)</th>
              <th className="py-3 px-3 w-28 text-right">Caret Qty</th>
              <th className="py-3 px-3 w-32 text-right">Weight (kg)</th>
              <th className="py-3 px-3 w-32 text-right">Rate (₹/kg)</th>
              <th className="py-3 px-4 w-36 text-right font-extrabold text-emerald-500">Total Amount</th>
              <th className="py-3 px-3 min-w-[140px]">Row Notes</th>
              <th className="py-3 px-3 w-24 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--table-border)] font-mono text-sm">
            {rowTable.pageRows.map(({ row, idx: rIndex }) => (
              <tr key={row.id} className="hover:bg-[var(--table-row-hover)] font-sans group focus-within:bg-[var(--table-row-hover)] transition-colors">
                {/* Supplier Dropdown */}
                <td className="p-1 px-3" data-cell={`${rIndex}-0`}>
                  <CommandSelect
                    value={suppliers.find(s => s.id === row.supplierId)?.id || row.supplierId}
                    onChange={(val) => {
                      const matched = suppliers.find(s => s.id === val || s.name === val);
                      if (matched) handleCellChange(rIndex, 'supplierId', matched.id);
                    }}
                    options={supplierOptions}
                    placeholder="Select Supplier..."
                    creatable={false}
                  />
                </td>

                {/* Variety Dropdown */}
                <td className="p-1" data-cell={`${rIndex}-1`}>
                  <CommandSelect
                    value={row.variety}
                    onChange={(val) => handleCellChange(rIndex, 'variety', val)}
                    options={availableVarieties.map(v => ({ id: v, label: v, emoji: '📦' }))}
                    placeholder="Select Variety..."
                    creatable={true}
                    onAdd={(newVar) => {
                      const fruitObj = fruits.find(f => f.name.toLowerCase() === selectedFruit.toLowerCase());
                      if (fruitObj) addFruitVariety(fruitObj.id, newVar);
                    }}
                  />
                </td>

                {/* Caret */}
                <td className="p-1 text-right">
                  <input
                    type="number"
                    data-cell={`${rIndex}-2`}
                    value={row.caret === 0 && row.weight === 0 ? '' : row.caret}
                    placeholder="0"
                    onChange={(e) => handleCellChange(rIndex, 'caret', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, rIndex, 2)}
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--primary)] text-[var(--text-primary)] rounded-lg p-2 text-right text-xs outline-none transition-all font-mono font-semibold min-h-0"
                  />
                </td>

                {/* Weight */}
                <td className="p-1 text-right">
                  <input
                    type="number"
                    step="0.1"
                    data-cell={`${rIndex}-3`}
                    value={row.weight === 0 ? '' : row.weight}
                    placeholder="0.0"
                    onChange={(e) => handleCellChange(rIndex, 'weight', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, rIndex, 3)}
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--primary)] text-[var(--text-primary)] rounded-lg p-2 text-right text-xs outline-none transition-all font-mono font-semibold min-h-0"
                  />
                </td>

                {/* Rate */}
                <td className="p-1 text-right">
                  <input
                    type="number"
                    step="0.5"
                    data-cell={`${rIndex}-4`}
                    value={row.rate === 0 ? '' : row.rate}
                    placeholder="0.00"
                    onChange={(e) => handleCellChange(rIndex, 'rate', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, rIndex, 4)}
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] focus:border-[var(--primary)] text-emerald-600 dark:text-emerald-400 font-bold rounded-lg p-2 text-right text-xs outline-none transition-all font-mono min-h-0"
                  />
                </td>

                {/* Amount (Auto Calculated) */}
                <td className="p-2 px-4 text-right font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/8 text-sm font-mono">
                  ₹ {row.amount.toLocaleString('en-IN')}
                </td>

                {/* Note */}
                <td className="p-1">
                  <input
                    type="text"
                    data-cell={`${rIndex}-5`}
                    value={row.note || ''}
                    placeholder="Optional note..."
                    onChange={(e) => handleCellChange(rIndex, 'note', e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, rIndex, 5)}
                    className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--text-primary)] rounded-lg p-2 text-xs outline-none transition-all font-sans placeholder:text-[var(--text-muted)] min-h-0"
                  />
                </td>

                {/* Row Actions */}
                <td className="p-1 text-center">
                  <div className="flex items-center justify-center space-x-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => duplicateRow(rIndex)}
                      title="Duplicate Row (Alt+D)"
                      className="p-1.5 text-[var(--text-muted)] hover:text-blue-500 hover:bg-[var(--surface-bg)] rounded-lg transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteRow(rIndex)}
                      disabled={rows.length <= 1}
                      title="Remove Row"
                      className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--surface-bg)] rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[var(--surface-bg)] font-bold text-xs uppercase tracking-wider border-t border-[var(--table-border)] text-[var(--text-primary)] font-sans">
              <td colSpan={2} className="py-4 px-4 text-right text-[var(--text-muted)]">Inline Table Totals:</td>
              <td className="py-4 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                {totalCarets} <span className="text-[10px] text-[var(--text-muted)] font-normal">CRT</span>
              </td>
              <td className="py-4 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                {totalWeight.toFixed(1)} <span className="text-[10px] text-[var(--text-muted)] font-normal">KG</span>
              </td>
              <td className="py-4 px-3 text-right text-[var(--text-muted)]">Avg: {(totalWeight > 0 ? totalAmount / totalWeight : 0).toFixed(1)}/kg</td>
              <td className="py-4 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-black text-base bg-emerald-500/8 border-l border-emerald-500/20">
                ₹ {totalAmount.toLocaleString('en-IN')}
              </td>
              <td colSpan={2} className="py-4 px-4 text-[var(--text-muted)] text-[11px] font-normal">
                Press <kbd className="bg-[var(--card-bg)] px-1.5 py-0.5 rounded font-mono text-emerald-600 dark:text-emerald-400 font-bold border border-[var(--card-border)]">Enter</kbd> or <kbd className="bg-[var(--card-bg)] px-1.5 py-0.5 rounded font-mono text-emerald-600 dark:text-emerald-400 font-bold border border-[var(--card-border)]">Arrows</kbd> to jump
              </td>
            </tr>
          </tfoot>
        </table>
      </DataTable>
    </div>
  );
};
