import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Search, DollarSign, Printer, ArrowUpRight, ArrowDownRight, ArrowUpDown } from 'lucide-react';
import { PaymentReceipt } from '../types';
import { useToast } from './ui/Toast';
import { StatementPreview } from './ui/StatementPreview';
import { ModuleEmptyState, TableSkeleton } from './ui/DataStates';
import { useDataTable } from '../hooks/useDataTable';
import { DataTable, Pagination } from './ui/table';
import { useAppearance } from '@/hooks';

export const SupplierModule: React.FC = () => {
  const { suppliers, getSupplierLedger, addPayment } = useApp();
  const { density, setDensity } = useAppearance();
  const toast = useToast();

  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStatement, setShowStatement] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI'>('BANK_TRANSFER');
  const [payRefNo, setPayRefNo] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const supplierListRef = useRef<HTMLDivElement>(null);
  const [highlightedIdx, setHighlightedIdx] = useState<number>(-1);

  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === selectedSupplierId) || suppliers[0];
  }, [selectedSupplierId, suppliers]);

  const ledgerEntries = useMemo(() => {
    if (!selectedSupplier) return [];
    return getSupplierLedger(selectedSupplier.id);
  }, [selectedSupplier, getSupplierLedger]);

  const ledgerTable = useDataTable<(typeof ledgerEntries)[number], 'date' | 'amount' | 'runningBalance'>({
    data: ledgerEntries,
    initialSortBy: 'date',
    initialSortDir: 'desc',
    initialPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
    sortComparators: {
      date: (a, b) => a.date.localeCompare(b.date),
      amount: (a, b) => a.amount - b.amount,
      runningBalance: (a, b) => a.runningBalance - b.runningBalance,
    },
    resetPageOn: [selectedSupplierId],
  });

  const outstandingBalance = ledgerEntries.length > 0 ? ledgerEntries[0].runningBalance : (selectedSupplier?.previousBalance || 0);
  const isCompact = density === 'compact';

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || payAmount <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid payment amount greater than zero.');
      return;
    }

    const newPayment: PaymentReceipt = {
      id: `p-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      partyType: 'SUPPLIER',
      partyId: selectedSupplier.id,
      partyName: selectedSupplier.name,
      amount: Number(payAmount),
      paymentMode: payMode,
      referenceNo: payRefNo,
      notes: payNotes
    };

    addPayment(newPayment);
    toast.success('Payment Recorded', `₹${Number(payAmount).toLocaleString('en-IN')} paid to ${selectedSupplier.name}. Supplier ledger updated.`);
    setShowPaymentModal(false);
    setPayAmount(0);
    setPayRefNo('');
    setPayNotes('');
  };

  const handlePrintLedger = () => {
    setShowStatement(true);
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase()) || s.city.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [suppliers, searchTerm]);

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
      if (document.activeElement === searchInputRef.current || document.activeElement === supplierListRef.current) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedIdx(idx => Math.min(idx + 1, filteredSuppliers.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIdx(idx => Math.max(idx - 1, 0));
        } else if (e.key === 'Enter' && highlightedIdx >= 0 && filteredSuppliers[highlightedIdx]) {
          e.preventDefault();
          setSelectedSupplierId(filteredSuppliers[highlightedIdx].id);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          searchInputRef.current?.blur();
          setHighlightedIdx(-1);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filteredSuppliers, highlightedIdx]);

  useEffect(() => {
    setIsLoading(true);
    const t = window.setTimeout(() => setIsLoading(false), 180);
    return () => window.clearTimeout(t);
  }, [searchTerm, selectedSupplierId, ledgerTable.sortBy, ledgerTable.sortDir]);

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="erp-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
        <div>
          <h1 className="erp-title text-[1.1rem] flex items-center space-x-2.5">
            <Users className="w-6 h-6 text-[#00c896]" />
            <span>SUPPLIER PURCHASE TRACKING & LEDGER</span>
          </h1>
          <p className="erp-subtitle mt-1">Automated purchase history from incoming fruit loads and payment tracking</p>
        </div>

        <div className="erp-surface flex items-center space-x-2 p-1.5">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="erp-btn-primary flex items-center space-x-1.5 px-4 py-2 text-xs"
          >
            <DollarSign className="w-4 h-4" />
            <span>Record Payment to Supplier</span>
          </button>
          <button
            onClick={handlePrintLedger}
            className="erp-btn-secondary flex items-center space-x-1.5 px-4 py-2 text-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save Statement</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEFT COLUMN: SUPPLIER LIST */}
        <div className="lg:col-span-1 erp-table-wrap rounded-2xl flex flex-col h-[700px] no-print">
          <div className="p-4 bg-[#f8fafc] border-b border-[#edf2f7]">
            <div className="relative">
              <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-3.5" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search supplier..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIdx(0);
                }}
                className="erp-input w-full pl-9 pr-4"
                onFocus={() => setHighlightedIdx(0)}
                onBlur={() => setTimeout(() => setHighlightedIdx(-1), 100)}
                autoComplete="off"
              />
            </div>
          </div>
          <div ref={supplierListRef} className="flex-1 overflow-y-auto divide-y divide-[#edf2f7]" tabIndex={-1}>
            {filteredSuppliers.length === 0 ? (
              <ModuleEmptyState
                title="No suppliers found"
                subtitle="Try a different supplier name, code, or city."
              />
            ) : filteredSuppliers.map((s, idx) => {
              const isSelected = s.id === selectedSupplierId;
              const isHighlighted = idx === highlightedIdx;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSupplierId(s.id)}
                  className={`p-4 cursor-pointer transition-colors font-sans ${
                    isHighlighted ? 'bg-emerald-100/80 border-l-4 border-emerald-400' : isSelected ? 'bg-[rgba(0,200,150,0.12)] border-l-4 border-[#00c896]' : 'hover:bg-[#f8fafc]'
                  }`}
                  tabIndex={-1}
                >
                  <div className="flex items-center justify-between font-sans">
                    <span className="font-semibold text-[#0f172a] text-sm">{s.name}</span>
                    <span className="text-[10px] font-mono bg-[#f1f5f9] text-[#475569] px-1.5 py-0.5 rounded border border-[#e2e8f0] font-semibold">{s.code}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-xs text-[#64748b] font-sans">
                    <span>{s.city}</span>
                    <span className="font-mono text-[#0f766e] font-semibold">₹ {s.previousBalance.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: SUPPLIER LEDGER STATEMENT */}
        <div className={`lg:col-span-3 erp-panel rounded-2xl p-6 flex flex-col space-y-6 printable-patti font-sans ${isCompact ? 'table-compact' : ''}`}>
          {selectedSupplier ? (
            <>
              {/* Supplier Profile Info Header */}
              <div className="bg-[#f8fafc] p-6 rounded-2xl border border-[#e2e8f0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-sans">
                <div>
                  <div className="flex items-center space-x-2.5 font-sans">
                    <h2 className="text-2xl font-semibold text-[#0f172a]">{selectedSupplier.name}</h2>
                    <span className="bg-[rgba(0,200,150,0.12)] text-[#0f766e] border border-[rgba(0,200,150,0.28)] px-2.5 py-0.5 rounded-lg text-xs font-mono font-semibold">
                      {selectedSupplier.code}
                    </span>
                  </div>
                  <p className="text-xs text-[#64748b] mt-1 font-sans">Location: {selectedSupplier.city} | Contact: {selectedSupplier.phone}</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] text-right min-w-[220px] shadow-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b] block">Total Outstanding Payable</span>
                  <span className={`text-2xl font-semibold font-mono mt-0.5 block ${outstandingBalance >= 0 ? 'text-[#0f766e]' : 'text-rose-600'}`}>
                    ₹ {outstandingBalance.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-[#94a3b8] block mt-0.5 font-medium">{outstandingBalance >= 0 ? 'Credit in favor' : 'Advance Paid'}</span>
                </div>
              </div>

              {/* Ledger Statement Table */}
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setDensity(density === 'compact' ? 'comfortable' : density === 'comfortable' ? 'spacious' : 'compact')}
                  className="erp-btn-secondary px-3 py-2 text-xs"
                >
                  {density === 'compact' ? 'Compact' : density === 'comfortable' ? 'Comfortable' : 'Spacious'}
                </button>
              </div>
              <DataTable
                className="font-sans"
                footer={
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
                }
              >
                <table className="erp-table text-left text-xs sm:text-sm font-sans">
                  <thead>
                    <tr>
                      <th className="py-3.5 px-4 w-28">
                        <button type="button" onClick={() => ledgerTable.toggleSort('date')} className="inline-flex items-center gap-1">
                          Date <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      </th>
                      <th className="py-3.5 px-3 w-32">Type</th>
                      <th className="py-3.5 px-3">Reference / Description</th>
                      <th className="py-3.5 px-3 text-right">Weight / Qty</th>
                      <th className="py-3.5 px-3 text-right">Rate</th>
                      <th className="py-3.5 px-3 text-right text-rose-600 dark:text-rose-400">
                        <button type="button" onClick={() => ledgerTable.toggleSort('amount')} className="inline-flex items-center gap-1 ml-auto">
                          Purchase (Dr) <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      </th>
                      <th className="py-3.5 px-3 text-right text-emerald-600 dark:text-emerald-400">Payment (Cr)</th>
                      <th className="py-3.5 px-4 text-right font-black text-teal-600 dark:text-teal-400">
                        <button type="button" onClick={() => ledgerTable.toggleSort('runningBalance')} className="inline-flex items-center gap-1 ml-auto">
                          Running Balance <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="p-0"><TableSkeleton rows={8} cols={8} compact={isCompact} /></td>
                      </tr>
                    ) : ledgerTable.totalRecords === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-0">
                          <ModuleEmptyState title="No ledger entries" subtitle="Supplier transactions will appear here once purchases or payments are recorded." />
                        </td>
                      </tr>
                    ) : ledgerTable.pageRows.map(entry => {
                      const isPurchase = entry.type === 'PURCHASE_VEHICLE' || entry.type === 'PURCHASE_BILL';
                      const isPayment = entry.type === 'PAYMENT';
                      const isOpening = entry.type === 'OPENING';

                      return (
                        <tr key={entry.id} className="font-sans group">
                          <td className="py-4 px-4 font-mono font-medium text-[#64748b] text-xs">{entry.date}</td>
                          <td className="py-4 px-3 font-sans">
                            {isOpening && <span className="bg-[#f1f5f9] text-[#475569] px-2.5 py-1 rounded-lg text-[10px] font-semibold font-mono">OPENING</span>}
                            {isPurchase && <span className="bg-rose-500/10 text-rose-700 border border-rose-500/30 px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center w-max font-mono"><ArrowUpRight className="w-3.5 h-3.5 mr-1" /> {entry.type === 'PURCHASE_VEHICLE' ? 'VEH INWARD' : 'DIRECT BILL'}</span>}
                            {isPayment && <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center w-max font-mono"><ArrowDownRight className="w-3.5 h-3.5 mr-1" /> PAYMENT</span>}
                          </td>
                          <td className="py-4 px-3 max-w-[200px] font-sans">
                            <span className="font-semibold text-[#0f172a] block text-sm">{entry.referenceNo || 'Account Entry'}</span>
                            <span className="text-[11px] text-[#64748b] block truncate font-medium">{entry.variety || entry.note}</span>
                          </td>
                          <td className="py-4 px-3 text-right font-mono text-[#334155] font-semibold">
                            {entry.weightKg ? `${entry.weightKg} KG` : '-'}
                          </td>
                          <td className="py-4 px-3 text-right font-mono text-[#334155] font-semibold">
                            {entry.rate ? `₹${entry.rate}` : '-'}
                          </td>
                          <td className="py-4 px-3 text-right font-mono font-semibold text-rose-600 text-sm">
                            {isPurchase ? `₹ ${entry.amount.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-4 px-3 text-right font-mono font-semibold text-emerald-600 text-sm">
                            {isPayment ? `₹ ${Math.abs(entry.amount).toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-semibold text-[#00aeef] bg-[rgba(0,174,239,0.06)] text-sm">
                            ₹ {entry.runningBalance.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </DataTable>
            </>
          ) : (
            <ModuleEmptyState
              title="No supplier selected"
              subtitle="Select a supplier from the left panel to view complete automated ledger details."
            />
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="erp-panel rounded-2xl max-w-lg w-full overflow-hidden p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--card-border)] pb-4 font-sans">
              <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center space-x-2">
                <span>Record Payment to Supplier</span>
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-4 font-sans text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 font-sans">Paying To:</label>
                <input type="text" readOnly value={selectedSupplier.name} className="erp-input w-full font-bold bg-[var(--surface-bg)]" />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 font-sans">Payment Amount (₹) *</label>
                <input type="number" required value={payAmount === 0 ? '' : payAmount} placeholder="50000" onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)} className="erp-input w-full text-emerald-600 dark:text-emerald-400 font-mono font-black text-lg" />
              </div>

              <div className="grid grid-cols-2 gap-4 font-sans">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 font-sans">Payment Mode</label>
                  <select value={payMode} onChange={(e) => setPayMode(e.target.value as any)} className="erp-input w-full font-bold cursor-pointer">
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 font-sans">Reference / Cheque No</label>
                  <input type="text" value={payRefNo} onChange={(e) => setPayRefNo(e.target.value)} placeholder="e.g. NEFT-99120" className="erp-input w-full font-mono font-bold" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 font-sans">Payment Note</label>
                <input type="text" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Advance payment against seasonal load..." className="erp-input w-full" />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--card-border)]">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="erp-btn-secondary px-5 py-2.5">Cancel</button>
                <button type="submit" className="erp-btn-primary px-6 py-2.5">Save Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Statement Preview */}
      <StatementPreview isOpen={showStatement} onClose={() => setShowStatement(false)} title="Supplier Ledger Statement" subtitle={selectedSupplier ? `${selectedSupplier.name} · ${selectedSupplier.code}` : ''}>
        {selectedSupplier && (
          <div className="space-y-6">
            {/* Party Info */}
            <div className="flex justify-between items-start rounded-lg border border-slate-200 overflow-hidden">
              <div className="flex-1 p-4 bg-slate-50/70">
                <div className="text-[8.5px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">Supplier / Party</div>
                <div className="text-[15px] font-black text-slate-950">{selectedSupplier.name}</div>
                <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                  {selectedSupplier.phone && <div>Phone: {selectedSupplier.phone}</div>}
                  <div>City: {selectedSupplier.city} · Code: {selectedSupplier.code}</div>
                </div>
              </div>
              <div className="p-4 border-l border-slate-200 bg-white text-right min-w-[140px] flex flex-col justify-center">
                <div className="text-[8.5px] font-bold uppercase text-slate-400">Outstanding</div>
                <div className={`text-[16px] font-black font-mono mt-0.5 ${outstandingBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>₹{outstandingBalance.toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* Ledger Table */}
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-emerald-600 text-white">
                  <th className="py-2.5 px-3 text-left font-semibold text-[10px] rounded-tl-md">Date</th>
                  <th className="py-2.5 px-3 text-left font-semibold text-[10px]">Type</th>
                  <th className="py-2.5 px-3 text-left font-semibold text-[10px]">Reference</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-[10px]">Debit</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-[10px]">Credit</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-[10px] rounded-tr-md">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((entry, idx) => {
                  const isPurchase = entry.type === 'PURCHASE_VEHICLE' || entry.type === 'PURCHASE_BILL';
                  return (
                    <tr key={entry.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600">{entry.date}</td>
                      <td className="py-2.5 px-3 text-[10px] font-semibold text-slate-700">{isPurchase ? 'Purchase' : entry.type === 'PAYMENT' ? 'Payment' : 'Opening'}</td>
                      <td className="py-2.5 px-3 text-[10px] text-slate-600 truncate max-w-[150px]">{entry.referenceNo || entry.variety || '—'}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[10.5px] text-rose-700">{entry.amount > 0 ? `₹${entry.amount.toLocaleString('en-IN')}` : ''}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[10.5px] text-emerald-700">{entry.amount < 0 ? `₹${Math.abs(entry.amount).toLocaleString('en-IN')}` : ''}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-[10.5px] text-slate-900">₹{entry.runningBalance.toLocaleString('en-IN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </StatementPreview>
    </div>
  );
};
