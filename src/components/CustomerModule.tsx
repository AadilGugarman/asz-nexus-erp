import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { UserCheck, Search, DollarSign, Printer, ArrowUpRight, ArrowDownRight, ArrowUpDown } from 'lucide-react';
import { PaymentReceipt } from '../types';
import { useToast } from './ui/Toast';
import { StatementPreview } from './ui/StatementPreview';
import { ModuleEmptyState, TableSkeleton } from './ui/DataStates';

export const CustomerModule: React.FC = () => {
  const { customers, getCustomerLedger, addPayment } = useApp();
  const toast = useToast();

  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStatement, setShowStatement] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'runningBalance'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Payment Receipt Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI'>('UPI');
  const [payRefNo, setPayRefNo] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const customerListRef = useRef<HTMLDivElement>(null);
  const [highlightedIdx, setHighlightedIdx] = useState<number>(-1);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || customers[0];
  }, [selectedCustomerId, customers]);

  const ledgerEntries = useMemo(() => {
    if (!selectedCustomer) return [];
    return getCustomerLedger(selectedCustomer.id);
  }, [selectedCustomer, getCustomerLedger]);

  const sortedLedgerEntries = useMemo(() => {
    return [...ledgerEntries].sort((a, b) => {
      const factor = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'amount') return (a.amount - b.amount) * factor;
      if (sortBy === 'runningBalance') return (a.runningBalance - b.runningBalance) * factor;
      return a.date.localeCompare(b.date) * factor;
    });
  }, [ledgerEntries, sortBy, sortDir]);

  const outstandingBalance = ledgerEntries.length > 0 ? ledgerEntries[0].runningBalance : (selectedCustomer?.previousBalance || 0);

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || payAmount <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid payment amount greater than zero.');
      return;
    }

    const newPayment: PaymentReceipt = {
      id: `p-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      partyType: 'CUSTOMER',
      partyId: selectedCustomer.id,
      partyName: selectedCustomer.name,
      amount: Number(payAmount),
      paymentMode: payMode,
      referenceNo: payRefNo,
      notes: payNotes
    };

    addPayment(newPayment);
    toast.success('Payment Received', `₹${Number(payAmount).toLocaleString('en-IN')} received from ${selectedCustomer.name}. Customer balance updated.`);
    setShowPaymentModal(false);
    setPayAmount(0);
    setPayRefNo('');
    setPayNotes('');
  };

  const handlePrintLedger = () => {
    setShowStatement(true);
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.city.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [customers, searchTerm]);

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
  }, [searchTerm, selectedCustomerId, sortBy, sortDir]);

  const handleSort = (key: 'date' | 'amount' | 'runningBalance') => {
    if (sortBy === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(key);
    setSortDir('desc');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="erp-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
        <div>
          <h1 className="erp-title text-[1.1rem] flex items-center space-x-2.5">
            <UserCheck className="w-6 h-6 text-[#00aeef]" />
            <span>CUSTOMER BALANCE SYSTEM & LEDGER</span>
          </h1>
          <p className="erp-subtitle mt-1">Automated balance tracking from sales billing and payment receipts</p>
        </div>

        <div className="erp-surface flex items-center space-x-2 p-1.5">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="erp-btn-primary flex items-center space-x-1.5 px-4 py-2 text-xs"
          >
            <DollarSign className="w-4 h-4" />
            <span>Receive Payment from Customer</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 font-sans">
        {/* LEFT COLUMN: CUSTOMERS LIST */}
        <div className="lg:col-span-1 erp-table-wrap rounded-2xl overflow-hidden flex flex-col h-[700px] no-print">
          <div className="p-4 bg-[#f8fafc] border-b border-[#edf2f7]">
            <div className="relative">
              <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-3.5" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search buyer/customer..."
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
          <div ref={customerListRef} className="flex-1 overflow-y-auto divide-y divide-[#edf2f7]" tabIndex={-1}>
            {filteredCustomers.length === 0 ? (
              <ModuleEmptyState
                title="No customers found"
                subtitle="Try a different buyer name or city."
              />
            ) : filteredCustomers.map((c, idx) => {
              const isSelected = c.id === selectedCustomerId;
              const isHighlighted = idx === highlightedIdx;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`p-4 cursor-pointer transition-colors font-sans ${
                    isHighlighted ? 'bg-sky-100/80 border-l-4 border-sky-400' : isSelected ? 'bg-[rgba(0,174,239,0.12)] border-l-4 border-[#00aeef]' : 'hover:bg-[#f8fafc]'
                  }`}
                  tabIndex={-1}
                >
                  <div className="flex items-center justify-between font-sans">
                    <span className="font-semibold text-[#0f172a] text-sm">{c.name}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-xs text-[#64748b] font-sans">
                    <span>{c.city}</span>
                    <span className="font-mono text-[#0369a1] font-semibold">₹ {c.previousBalance.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: CUSTOMER ACCOUNT LEDGER */}
        <div className={`lg:col-span-3 erp-panel rounded-2xl p-6 flex flex-col space-y-6 printable-patti font-sans ${isCompact ? 'table-compact' : ''}`}>
          {selectedCustomer ? (
            <>
              {/* Customer Header Info */}
              <div className="bg-[#f8fafc] p-6 rounded-2xl border border-[#e2e8f0] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-sans">
                <div>
                  <h2 className="text-2xl font-semibold text-[#0f172a]">{selectedCustomer.name}</h2>
                  <p className="text-xs text-[#64748b] mt-1 font-sans">Location: {selectedCustomer.city} | Contact: {selectedCustomer.phone}</p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#e2e8f0] text-right min-w-[220px] shadow-sm">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b] block">Total Outstanding Receivable</span>
                  <span className={`text-2xl font-semibold font-mono mt-0.5 block ${outstandingBalance >= 0 ? 'text-[#0369a1]' : 'text-[#0f766e]'}`}>
                    ₹ {outstandingBalance.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-[#94a3b8] block mt-0.5 font-medium">{outstandingBalance >= 0 ? 'Due from Customer' : 'Advance Credit'}</span>
                </div>
              </div>

              {/* Table */}
              <div className="flex items-center justify-end">
                <button type="button" onClick={() => setIsCompact(v => !v)} className="erp-btn-secondary px-3 py-2 text-xs">
                  {isCompact ? 'Comfortable' : 'Compact'}
                </button>
              </div>
              <div className="erp-table-wrap overflow-x-auto font-sans">
                <table className="erp-table text-left text-xs sm:text-sm font-sans">
                  <thead>
                    <tr>
                      <th className="py-3.5 px-4 w-28">
                        <button type="button" onClick={() => handleSort('date')} className="inline-flex items-center gap-1">
                          Date <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      </th>
                      <th className="py-3.5 px-3 w-32">Type</th>
                      <th className="py-3.5 px-3">Invoice # / Description</th>
                      <th className="py-3.5 px-3 text-right text-indigo-600 dark:text-indigo-400">
                        <button type="button" onClick={() => handleSort('amount')} className="inline-flex items-center gap-1 ml-auto">
                          Invoice Amount (Dr) <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      </th>
                      <th className="py-3.5 px-3 text-right text-emerald-600 dark:text-emerald-400">Payment Recd (Cr)</th>
                      <th className="py-3.5 px-4 text-right font-black text-teal-600 dark:text-teal-400">
                        <button type="button" onClick={() => handleSort('runningBalance')} className="inline-flex items-center gap-1 ml-auto">
                          Running Balance <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="p-0"><TableSkeleton rows={8} cols={6} compact={isCompact} /></td>
                      </tr>
                    ) : sortedLedgerEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-0">
                          <ModuleEmptyState title="No ledger entries" subtitle="Customer invoices and receipts will appear here automatically." />
                        </td>
                      </tr>
                    ) : sortedLedgerEntries.map(entry => {
                      const isInvoice = entry.type === 'INVOICE';
                      const isPayment = entry.type === 'PAYMENT';
                      const isOpening = entry.type === 'OPENING';

                      return (
                        <tr key={entry.id} className="font-sans group">
                          <td className="py-4 px-4 font-mono font-medium text-[#64748b] text-xs">{entry.date}</td>
                          <td className="py-4 px-3 font-sans">
                            {isOpening && <span className="bg-[#f1f5f9] text-[#475569] px-2.5 py-1 rounded-lg text-[10px] font-semibold font-mono">OPENING</span>}
                            {isInvoice && <span className="bg-sky-500/10 text-sky-700 border border-sky-500/30 px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center w-max font-mono"><ArrowUpRight className="w-3.5 h-3.5 mr-1 text-sky-600" /> BILL INVOICE</span>}
                            {isPayment && <span className="bg-emerald-500/10 text-emerald-700 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center w-max font-mono"><ArrowDownRight className="w-3.5 h-3.5 mr-1 text-emerald-600" /> RECD PAYMENT</span>}
                          </td>
                          <td className="py-4 px-3 max-w-[240px] font-sans">
                            <span className="font-semibold text-[#0f172a] block text-sm">{entry.referenceNo || 'Account Balance'}</span>
                            <span className="text-[11px] text-[#64748b] block truncate font-medium">{entry.note}</span>
                          </td>
                          <td className="py-4 px-3 text-right font-mono font-semibold text-sky-700 text-sm">
                            {isInvoice ? `₹ ${entry.amount.toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-4 px-3 text-right font-mono font-semibold text-emerald-600 text-sm">
                            {isPayment ? `₹ ${Math.abs(entry.amount).toLocaleString('en-IN')}` : '-'}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-semibold text-[#0369a1] bg-[rgba(0,174,239,0.06)] text-sm">
                            ₹ {entry.runningBalance.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <ModuleEmptyState
              title="No customer selected"
              subtitle="Select a customer from the left panel to view full balance movement history."
            />
          )}
        </div>
      </div>

      {/* Payment Receipt Modal */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-slate-900 dark:bg-slate-900 bg-white border border-slate-800 dark:border-slate-800 border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 dark:border-slate-800 border-slate-200 pb-4 font-sans">
              <h3 className="text-lg font-bold dark:text-white text-slate-900 flex items-center space-x-2">
                <span>Receive Payment from Customer</span>
              </h3>
              <button onClick={() => setShowPaymentModal(false)} className="dark:text-slate-400 text-slate-600 hover:text-slate-900 dark:hover:text-white text-xl">✕</button>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-4 font-sans text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Receiving From Buyer:</label>
                <input type="text" readOnly value={selectedCustomer.name} className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-3 font-bold" />
              </div>

              <div>
                <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Amount Received (₹) *</label>
                <input type="number" required value={payAmount === 0 ? '' : payAmount} placeholder="100000" onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)} className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 focus:border-indigo-500 text-indigo-600 dark:text-indigo-400 font-mono font-black rounded-xl p-3 text-lg outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4 font-sans">
                <div>
                  <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Payment Mode</label>
                  <select value={payMode} onChange={(e) => setPayMode(e.target.value as any)} className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 focus:border-indigo-500 dark:text-white text-slate-900 rounded-xl p-3 outline-none font-bold">
                    <option value="UPI">UPI Transfer</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Reference No</label>
                  <input type="text" value={payRefNo} onChange={(e) => setPayRefNo(e.target.value)} placeholder="e.g. UPI-998812" className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 focus:border-indigo-500 dark:text-white text-slate-900 rounded-xl p-3 font-mono font-bold outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold dark:text-slate-400 text-slate-600 mb-1 font-sans">Receipt Note</label>
                <input type="text" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Payment cleared for previous invoices..." className="w-full bg-slate-950 dark:bg-slate-950 bg-slate-100 border border-slate-700/80 dark:border-slate-700/80 border-slate-300 focus:border-indigo-500 dark:text-white text-slate-900 rounded-xl p-3 font-sans outline-none" />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800 dark:border-slate-800 border-slate-200">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="px-5 py-2.5 bg-slate-800 dark:bg-slate-800 bg-slate-200 dark:text-slate-300 text-slate-800 font-bold rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white font-black rounded-xl shadow-lg cursor-pointer">Save Payment Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Statement Preview */}
      <StatementPreview isOpen={showStatement} onClose={() => setShowStatement(false)} title="Customer Account Statement" subtitle={selectedCustomer ? `${selectedCustomer.name} · ${selectedCustomer.city}` : ''}>
        {selectedCustomer && (
          <div className="space-y-6">
            {/* Party Info */}
            <div className="flex justify-between items-start rounded-lg border border-slate-200 overflow-hidden">
              <div className="flex-1 p-4 bg-slate-50/70">
                <div className="text-[8.5px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">Customer / Buyer</div>
                <div className="text-[15px] font-black text-slate-950">{selectedCustomer.name}</div>
                <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                  {selectedCustomer.phone && <div>Phone: {selectedCustomer.phone}</div>}
                  <div>City: {selectedCustomer.city}</div>
                </div>
              </div>
              <div className="p-4 border-l border-slate-200 bg-white text-right min-w-[140px] flex flex-col justify-center">
                <div className="text-[8.5px] font-bold uppercase text-slate-400">Outstanding</div>
                <div className={`text-[16px] font-black font-mono mt-0.5 ${outstandingBalance >= 0 ? 'text-indigo-700' : 'text-emerald-700'}`}>₹{outstandingBalance.toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* Ledger Table */}
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-indigo-600 text-white">
                  <th className="py-2.5 px-3 text-left font-semibold text-[10px] rounded-tl-md">Date</th>
                  <th className="py-2.5 px-3 text-left font-semibold text-[10px]">Type</th>
                  <th className="py-2.5 px-3 text-left font-semibold text-[10px]">Reference</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-[10px]">Debit</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-[10px]">Credit</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-[10px] rounded-tr-md">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((entry, idx) => (
                  <tr key={entry.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600">{entry.date}</td>
                    <td className="py-2.5 px-3 text-[10px] font-semibold text-slate-700">{entry.type === 'INVOICE' ? 'Invoice' : entry.type === 'PAYMENT' ? 'Payment' : 'Opening'}</td>
                    <td className="py-2.5 px-3 text-[10px] text-slate-600 truncate max-w-[150px]">{entry.referenceNo || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[10.5px] text-rose-700">{entry.amount > 0 ? `₹${entry.amount.toLocaleString('en-IN')}` : ''}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[10.5px] text-emerald-700">{entry.amount < 0 ? `₹${Math.abs(entry.amount).toLocaleString('en-IN')}` : ''}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-[10.5px] text-slate-900">₹{entry.runningBalance.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </StatementPreview>
    </div>
  );
};
