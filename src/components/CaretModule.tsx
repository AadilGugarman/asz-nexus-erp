/**
 * CaretModule.tsx
 * Redesigned to follow the Customer Ledger UI structure.
 * Features a left sidebar for customer selection and a right panel for the caret ledger.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Package, Search, Trash2, ArrowUpRight, ArrowDownRight,
  ArrowUpDown, FileText, RotateCcw, Printer, MapPin,
  Phone, Edit3
} from 'lucide-react';

import { useApp } from '@/context/AppContext';
import { useDataTable } from '../hooks/useDataTable';

import { CommandSelect, CommandOption } from './ui/CommandSelect';
import { useToast } from './ui/Toast';
import { useConfirmDialog } from './ui/ConfirmDialog';
import { DataTable, Pagination } from './ui/table';
import { ModuleEmptyState, TableSkeleton } from './ui/DataStates';
import { StatementPreview } from './ui/StatementPreview';

import { CaretTransaction } from '../types';
import { fmtDate } from '@/utils/format';

export const CaretModule: React.FC = () => {
  const { 
    customers, 
    fruits, 
    caretTransactions, 
    addCaretTransaction, 
    updateCaretTransaction, 
    deleteCaretTransaction
  } = useApp();
  const toast  = useToast();
  const dialog = useConfirmDialog();

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number>(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const customerListRef = useRef<HTMLDivElement>(null);

  // ── Return form modal state ────────────────────────────────────────────────
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [editingTx, setEditingTx] = useState<CaretTransaction | null>(null);
  const [returnQty, setReturnQty] = useState<number>(0);
  const [returnFruit, setReturnFruit] = useState('');
  const [returnNote, setReturnNote] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);

  // ── Data Derivation ────────────────────────────────────────────────────────
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || customers[0];
  }, [selectedCustomerId, customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.city.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  const customerSummaries = useMemo(() => {
    const map = new Map<string, { given: number; returned: number }>();
    caretTransactions.forEach(tx => {
      const prev = map.get(tx.customerId) ?? { given: 0, returned: 0 };
      if (tx.type === 'GIVEN') prev.given += tx.caretQty;
      else prev.returned += tx.caretQty;
      map.set(tx.customerId, prev);
    });
    return map;
  }, [caretTransactions]);

  const getCustomerSummary = (id: string) => {
    return customerSummaries.get(id) ?? { given: 0, returned: 0 };
  };

  const ledgerEntries = useMemo(() => {
    if (!selectedCustomer) return [];
    
    // Sort transactions by date ascending to calculate running balance
    const txs = caretTransactions
      .filter(tx => tx.customerId === selectedCustomer.id)
      .sort((a, b) => a.date.localeCompare(b.date));

    let running = 0;
    return txs.map(tx => {
      if (tx.type === 'GIVEN') running += tx.caretQty;
      else running -= tx.caretQty;
      return { ...tx, runningBalance: running };
    }).reverse(); // Latest first for the table
  }, [selectedCustomer, caretTransactions]);

  const ledgerTable = useDataTable<any, 'date' | 'caretQty' | 'runningBalance'>({
    data: ledgerEntries,
    initialSortBy: 'date',
    initialSortDir: 'desc',
    initialPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
    sortComparators: {
      date: (a, b) => a.date.localeCompare(b.date),
      caretQty: (a, b) => a.caretQty - b.caretQty,
      runningBalance: (a, b) => a.runningBalance - b.runningBalance,
    },
    resetPageOn: [selectedCustomerId],
  });

  const fruitOptions: CommandOption[] = useMemo(() => {
    return fruits.map(f => ({
      id: f.id,
      label: f.name,
      subtitle: `${f.varieties.length} varieties`,
      emoji: '🍃'
    }));
  }, [fruits]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleOpenEdit = (tx: CaretTransaction) => {
    setEditingTx(tx);
    setReturnQty(tx.caretQty);
    setReturnFruit(tx.fruitName);
    setReturnNote(tx.note || '');
    setReturnDate(tx.date);
    setShowReturnModal(true);
  };

  const handleSaveReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    if (!returnQty || returnQty <= 0) {
      toast.error('Invalid Qty', 'Please enter a valid caret quantity.');
      return;
    }

    if (editingTx) {
      // Update logic
      updateCaretTransaction({
        ...editingTx,
        date: returnDate,
        fruitName: returnFruit || 'Mixed',
        caretQty: returnQty,
        note: returnNote.trim() || undefined,
      });
      toast.success('Entry Updated', 'Caret transaction updated successfully.');
    } else {
      // Create logic
      const summary = getCustomerSummary(selectedCustomer.id);
      const pending = summary.given - summary.returned;
      if (returnQty > pending) {
        toast.error('Excess Return', `Customer only has ${pending} carets pending. Cannot return ${returnQty}.`);
        return;
      }

      addCaretTransaction({
        date: returnDate,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        type: 'RETURN',
        fruitName: returnFruit || 'Mixed',
        caretQty: returnQty,
        note: returnNote.trim() || undefined,
      });

      toast.success('Caret Return Saved', `${returnQty} carets returned by ${selectedCustomer.name}.`);
    }

    setShowReturnModal(false);
    setEditingTx(null);
    setReturnQty(0); setReturnFruit(''); setReturnNote('');
  };

  const handlePrint = () => {
    if (!selectedCustomer) {
      toast.error('No Customer Selected', 'Select a customer to print their statement.');
      return;
    }
    setShowPrintPreview(true);
  };

  const handleDelete = async (tx: CaretTransaction) => {
    const ok = await dialog.confirm({
      variant: 'destructive',
      title: `Delete ${tx.type} transaction?`,
      description: `${tx.caretQty} carets for ${tx.customerName} on ${fmtDate(tx.date)}. This will affect the running balance.`,
      confirmText: 'Delete',
    });
    if (ok) {
      deleteCaretTransaction(tx.id);
      toast.info('Transaction Deleted', 'Caret balance recalculated.');
    }
  };

  // ── Keyboard Navigation ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (document.activeElement === searchInputRef.current || document.activeElement === customerListRef.current) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedIdx(idx => Math.min(idx + 1, filteredCustomers.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIdx(idx => Math.max(idx - 1, 0));
        } else if (e.key === 'Enter' && highlightedIdx >= 0 && filteredCustomers[highlightedIdx]) {
          e.preventDefault();
          setSelectedCustomerId(filteredCustomers[highlightedIdx].id);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          searchInputRef.current?.blur();
          setHighlightedIdx(-1);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filteredCustomers, highlightedIdx]);

  useEffect(() => {
    setIsLoading(true);
    const t = window.setTimeout(() => setIsLoading(false), 180);
    return () => window.clearTimeout(t);
  }, [selectedCustomerId]);

  const currentSummary = selectedCustomer ? getCustomerSummary(selectedCustomer.id) : { given: 0, returned: 0 };
  const currentPending = currentSummary.given - currentSummary.returned;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col space-y-3 font-sans overflow-hidden -mt-2">
      {/* Statement Preview Modal */}
      {selectedCustomer && (
        <StatementPreview
          isOpen={showPrintPreview}
          onClose={() => setShowPrintPreview(false)}
          title="Caret Statement"
          subtitle={`Ledger for ${selectedCustomer.name}`}
          accentColor="#06b6d4"
        >
          <div className="flex justify-between items-end mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Statement For</p>
              <h3 className="text-2xl font-black text-slate-900">{selectedCustomer.name}</h3>
              <p className="text-xs font-bold text-slate-500 mt-1">{selectedCustomer.city} · {selectedCustomer.phone}</p>
            </div>
            <div className="text-right">
              <div className="flex gap-8">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Given</p>
                  <p className="text-lg font-black text-rose-600">{currentSummary.given}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Returned</p>
                  <p className="text-lg font-black text-emerald-600">{currentSummary.returned}</p>
                </div>
                <div className="border-l-2 border-slate-200 pl-8">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Balance</p>
                  <p className="text-2xl font-black text-cyan-600">{currentPending}</p>
                </div>
              </div>
            </div>
          </div>

          <table className="w-full text-left text-xs border-collapse erp-table">
            <thead>
              <tr className="border-b-2 border-slate-900 text-slate-500 font-black uppercase tracking-widest">
                <th className="py-3 px-2 col-text w-24">Date</th>
                <th className="py-3 px-2 col-text w-24">Type</th>
                <th className="py-3 px-2 col-text">Description</th>
                <th className="py-3 px-2 col-num w-24">Given</th>
                <th className="py-3 px-2 col-num w-24">Return</th>
                <th className="py-3 px-4 col-num w-28">Running</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ledgerEntries.map(entry => (
                <tr key={entry.id}>
                  <td className="py-3 px-2 col-text font-mono">{fmtDate(entry.date)}</td>
                  <td className="py-3 px-2 col-text font-bold">{entry.type}</td>
                  <td className="py-3 px-2 col-text">
                    <p className="font-bold">{entry.fruitName}</p>
                    <p className="text-[10px] text-slate-400">{entry.billNo || entry.note || '-'}</p>
                  </td>
                  <td className="py-3 px-2 col-num font-mono font-bold text-rose-600">{entry.type === 'GIVEN' ? `+${entry.caretQty}` : '-'}</td>
                  <td className="py-3 px-2 col-num font-mono font-bold text-emerald-600">{entry.type === 'RETURN' ? `-${entry.caretQty}` : '-'}</td>
                  <td className="py-3 px-4 col-num font-mono font-black">{entry.runningBalance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </StatementPreview>
      )}

      {/* Top Header */}
      <div className="erp-panel shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 print:hidden">
        <div>
          <h1 className="erp-title text-[1rem] flex items-center space-x-2">
            <Package className="w-5 h-5 text-cyan-500" />
            <span>CARET / CRATE MANAGEMENT</span>
          </h1>
          <p className="erp-subtitle text-[10px] mt-0.5">Customer-wise caret tracking — given, returned, and pending balance</p>
        </div>

        <div className="erp-surface flex items-center space-x-2 p-1.5">
          <button
            onClick={() => setShowReturnModal(true)}
            className="erp-btn-primary flex items-center space-x-1.5 px-4 py-2 text-xs"
            style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' }}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Record Caret Return</span>
          </button>
          <button
            onClick={handlePrint}
            className="erp-btn-secondary flex items-center space-x-1.5 px-4 py-2 text-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Statement</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 font-sans print:block">
        {/* LEFT COLUMN: CUSTOMERS LIST */}
        <div className="w-full lg:w-72 shrink-0 erp-table-wrap rounded-2xl overflow-hidden flex flex-col no-print print:hidden">
          <div className="p-2.5 dark:bg-slate-950/50 bg-slate-50 border-b dark:border-slate-800 border-slate-200">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIdx(0);
                }}
                className="erp-input w-full pl-8 pr-3 min-h-[2.25rem] text-[11px]"
                onFocus={() => setHighlightedIdx(0)}
                onBlur={() => setTimeout(() => setHighlightedIdx(-1), 100)}
                autoComplete="off"
              />
            </div>
          </div>
          <div ref={customerListRef} className="flex-1 overflow-y-auto divide-y dark:divide-slate-800 divide-slate-100 custom-scrollbar" tabIndex={-1}>
            {filteredCustomers.length === 0 ? (
              <ModuleEmptyState title="No customers found" subtitle="Try a different name or city." />
            ) : filteredCustomers.map((c, idx) => {
              const isSelected = c.id === selectedCustomerId;
              const isHighlighted = idx === highlightedIdx;
              const summary = getCustomerSummary(c.id);
              const pending = summary.given - summary.returned;

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  style={{ contentVisibility: 'auto', containIntrinsicSize: '0 56px' }}
                  className={`p-3 px-4 cursor-pointer transition-colors font-sans ${
                    isHighlighted ? 'bg-cyan-100/80 dark:bg-cyan-900/20 border-l-4 border-cyan-400' : isSelected ? 'bg-cyan-500/10 border-l-4 border-cyan-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                  tabIndex={-1}
                >
                  <div className="flex items-center justify-between font-sans">
                    <span className="font-semibold dark:text-white text-slate-900 text-sm">{c.name}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] dark:text-slate-400 text-slate-500 font-sans">
                    <span>{c.city}</span>
                    <span className={`font-mono font-bold ${pending > 0 ? 'text-cyan-600 dark:text-cyan-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {pending}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: CARET LEDGER */}
        <div className={`flex-1 erp-panel rounded-2xl p-4 flex flex-col space-y-3 font-sans overflow-hidden min-h-0 print:hidden`}>
          {selectedCustomer ? (
            <>
              {/* Customer Header Info - Compact */}
              <div className="shrink-0 dark:bg-slate-900/50 bg-[#f8fafc] p-3 px-4 rounded-xl border dark:border-slate-800 border-[#e2e8f0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-sans">
                <div>
                  <h2 className="text-lg font-bold dark:text-slate-100 text-[#0f172a] leading-tight">{selectedCustomer.name}</h2>
                  <div className="flex flex-wrap gap-x-3 mt-0.5 text-[10px] dark:text-slate-400 text-[#64748b] font-sans">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {selectedCustomer.city}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedCustomer.phone}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="dark:bg-slate-900 bg-white p-1.5 px-3 rounded-lg border dark:border-slate-800 border-[#e2e8f0] text-right min-w-[80px] shadow-sm">
                    <span className="text-[8px] font-bold uppercase tracking-tight dark:text-slate-500 text-[#64748b] block">Total Given</span>
                    <span className="text-base font-bold font-mono block text-rose-600 leading-tight">{currentSummary.given}</span>
                  </div>
                  <div className="dark:bg-slate-900 bg-white p-1.5 px-3 rounded-lg border dark:border-slate-800 border-[#e2e8f0] text-right min-w-[80px] shadow-sm">
                    <span className="text-[8px] font-bold uppercase tracking-tight dark:text-slate-500 text-[#64748b] block">Returned</span>
                    <span className="text-base font-bold font-mono block text-emerald-600 leading-tight">{currentSummary.returned}</span>
                  </div>
                  <div className="dark:bg-slate-900 bg-white p-1.5 px-3 rounded-lg border dark:border-slate-800 border-[#e2e8f0] text-right min-w-[100px] shadow-sm border-b-2 border-b-cyan-500">
                    <span className="text-[8px] font-bold uppercase tracking-tight dark:text-slate-500 text-[#64748b] block">Pending</span>
                    <span className="text-lg font-black font-mono block text-cyan-600 leading-tight">{currentPending}</span>
                  </div>
                </div>
              </div>

              {/* Table Toolbar - Sticky */}
              <div className="shrink-0 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="text-[10px] font-bold dark:text-slate-400 text-slate-600 uppercase tracking-widest">Transaction History</span>
                </div>
              </div>

              {/* Scrollable Table Area */}
              <div className="flex-1 min-h-0">
                <DataTable
                  className="h-full flex flex-col"
                  scrollClassName="flex-1 overflow-auto custom-scrollbar"
                  footer={
                    <div className="shrink-0 border-t dark:border-slate-800 border-slate-100 dark:bg-slate-900 bg-white">
                      <Pagination
                        page={ledgerTable.page}
                        totalPages={ledgerTable.totalPages}
                        totalRecords={ledgerTable.totalRecords}
                        pageSize={ledgerTable.pageSize}
                        pageSizeOptions={ledgerTable.pageSizeOptions}
                        onPageChange={ledgerTable.setPage}
                        onPageSizeChange={ledgerTable.setPageSize}
                        label="ledger entries"
                      />
                    </div>
                  }
                >
                  <table className="erp-table text-left text-xs sm:text-sm font-sans">
                    <thead>
                      <tr>
                        <th className="py-3.5 px-4 w-28 col-text">
                          <button type="button" onClick={() => ledgerTable.toggleSort('date')} className="inline-flex items-center gap-1">
                            Date <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>
                        </th>
                        <th className="py-3.5 px-3 w-32 col-text">Type</th>
                        <th className="py-3.5 px-3 col-text">Fruit / Description</th>
                        <th className="py-3.5 px-3 col-text">Bill / Note</th>
                        <th className="py-3.5 px-3 col-num text-rose-600 w-32">
                          <button type="button" onClick={() => ledgerTable.toggleSort('caretQty')} className="inline-flex items-center gap-1 ml-auto">
                            Given <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>
                        </th>
                        <th className="py-3.5 px-3 col-num text-emerald-600 w-32">Return</th>
                        <th className="py-3.5 px-4 col-num font-black text-cyan-600 dark:text-cyan-400 w-36">
                          <button type="button" onClick={() => ledgerTable.toggleSort('runningBalance')} className="inline-flex items-center gap-1 ml-auto">
                            Running Balance <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>
                        </th>
                        <th className="py-3.5 px-4 col-actions w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {isLoading ? (
                        <tr>
                          <td colSpan={8} className="p-0"><TableSkeleton rows={8} cols={8} /></td>
                        </tr>
                      ) : ledgerTable.totalRecords === 0 ? (
                        <tr>
                          <td colSpan={8}>
                            <ModuleEmptyState 
                              title="No caret transactions found" 
                              subtitle="Try selecting a different customer or adjusting your filters." 
                            />
                          </td>
                        </tr>
                      ) : ledgerTable.pageRows.map((entry: typeof ledgerEntries[number]) => {
                        const isGiven = entry.type === 'GIVEN';
                        return (
                          <tr key={entry.id} className="font-sans group">
                            <td className="py-4 px-4 col-text font-mono font-medium dark:text-slate-400 text-[#64748b] text-xs">{fmtDate(entry.date)}</td>
                            <td className="py-4 px-3 col-text font-sans">
                              {isGiven ? (
                                <span className="bg-rose-500/10 text-rose-700 border border-rose-500/30 px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center w-max font-mono">
                                  <ArrowUpRight className="w-3.5 h-3.5 mr-1 text-rose-600" /> GIVEN
                                </span>
                              ) : (
                                <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center w-max font-mono">
                                  <ArrowDownRight className="w-3.5 h-3.5 mr-1 text-emerald-600" /> RETURN
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-3 col-text font-sans">
                              <span className="font-semibold dark:text-slate-200 text-[#0f172a] block text-sm">{entry.fruitName || 'Mixed Fruits'}</span>
                            </td>
                            <td className="py-4 px-3 col-text max-w-[200px] font-sans">
                              <span className="font-mono dark:text-slate-400 text-[#64748b] block text-xs">{entry.billNo || 'Manual Entry'}</span>
                              <span className="text-[11px] dark:text-slate-500 text-[#94a3b8] block truncate font-medium">{entry.note || '-'}</span>
                            </td>
                            <td className="py-4 px-3 col-num font-mono font-semibold text-rose-700 text-sm">
                              {isGiven ? `+${entry.caretQty}` : '-'}
                            </td>
                            <td className="py-4 px-3 col-num font-mono font-semibold text-emerald-600 text-sm">
                              {!isGiven ? `-${entry.caretQty}` : '-'}
                            </td>
                            <td className="py-4 px-4 col-num font-mono font-black text-cyan-600 dark:text-cyan-400 bg-cyan-500/5 text-sm">
                              {entry.runningBalance}
                            </td>
                            <td className="py-4 px-4 col-actions">
                              <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                <button onClick={() => handleOpenEdit(entry)}
                                  className="p-1.5 dark:text-slate-500 text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all">
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(entry)}
                                  className="p-1.5 dark:text-slate-500 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </DataTable>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <ModuleEmptyState
                title="No customer selected"
                subtitle="Select a customer from the sidebar to view their full caret ledger history."
              />
            </div>
          )}
        </div>
      </div>

      {/* Record Return Modal */}
      {showReturnModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="erp-panel rounded-2xl max-w-lg w-full overflow-hidden p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-4 font-sans">
              <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center space-x-2">
                {editingTx ? <Edit3 className="w-5 h-5 text-indigo-500" /> : <RotateCcw className="w-5 h-5 text-cyan-500" />}
                <span>{editingTx ? 'Edit Transaction' : 'Record Caret Return'}</span>
              </h3>
              <button onClick={() => { setShowReturnModal(false); setEditingTx(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveReturn} className="space-y-4 font-sans text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 font-sans">Customer / Buyer:</label>
                <input type="text" readOnly value={selectedCustomer.name} className="erp-input w-full font-bold bg-[var(--surface-bg)]" />
              </div>

              {editingTx && (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 font-sans">Type:</label>
                  <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${editingTx.type === 'GIVEN' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {editingTx.type}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 font-sans">
                    {editingTx?.type === 'GIVEN' ? 'Carets Given *' : 'Carets Returned *'}
                  </label>
                  <input type="number" required min="1" value={returnQty === 0 ? '' : returnQty} placeholder="0" 
                    onChange={(e) => setReturnQty(parseInt(e.target.value) || 0)} 
                    className={`erp-input w-full font-mono font-black text-lg ${editingTx?.type === 'GIVEN' ? 'text-rose-600' : 'text-cyan-600'}`} />
                  {!editingTx && <p className="text-[10px] text-slate-500 mt-1">Pending: {currentPending} carets</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 font-sans">Date</label>
                  <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} 
                    className="erp-input w-full font-mono font-bold" />
                </div>
              </div>

              <div>
                <CommandSelect
                  variant="sky"
                  label="Fruit Name (Optional)"
                  value={returnFruit}
                  onChange={(val) => {
                    const opt = fruitOptions.find(o => o.id === val || o.label === val);
                    setReturnFruit(opt?.label || val);
                  }}
                  options={fruitOptions}
                  placeholder="Select fruit..."
                  creatable={false}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 font-sans">Note / Remarks</label>
                <input type="text" value={returnNote} onChange={(e) => setReturnNote(e.target.value)} 
                  placeholder="e.g. Returned in good condition..." className="erp-input w-full" />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--card-border)]">
                <button type="button" onClick={() => { setShowReturnModal(false); setEditingTx(null); }} className="erp-btn-secondary px-5 py-2.5">Cancel</button>
                <button type="submit" className="erp-btn-primary px-6 py-2.5" style={{ background: editingTx ? '#6366f1' : 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' }}>
                  {editingTx ? 'Update Entry' : 'Save Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
