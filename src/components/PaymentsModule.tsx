import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Wallet, Plus, Search, Trash2, Eye, Calendar, ArrowUpRight, ArrowDownRight,
  DollarSign, CreditCard, Banknote, Smartphone, FileText,
  Printer, X, Building2, Users, UserCheck, ArrowUpDown
} from 'lucide-react';

import { useApp } from '@/context/AppContext';

import { useToast } from './ui/Toast';
import { useConfirmDialog } from './ui/ConfirmDialog';
import { CommandSelect, CommandOption } from './ui/CommandSelect';
import { ModuleEmptyState, TableSkeleton } from './ui/DataStates';
import { useDataTable } from '../hooks/useDataTable';
import { DataTable, Pagination } from './ui/table';

import { PaymentReceipt } from '../types';
import { fmtDate, roundCurrency } from '@/utils/format';

const PAYMENT_MODE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  CASH: { label: 'Cash', icon: <Banknote className="w-3.5 h-3.5" />, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  BANK_TRANSFER: { label: 'Bank NEFT/RTGS', icon: <Building2 className="w-3.5 h-3.5" />, color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30' },
  CHEQUE: { label: 'Cheque', icon: <CreditCard className="w-3.5 h-3.5" />, color: 'text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/30' },
  UPI: { label: 'UPI / GPay', icon: <Smartphone className="w-3.5 h-3.5" />, color: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30' },
};

const getPaymentModeMeta = (mode: string) =>
  PAYMENT_MODE_LABELS[mode] ?? { label: mode || 'Unknown', icon: <Wallet className="w-3.5 h-3.5" />, color: 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/30' };

export const PaymentsModule: React.FC = () => {
  const { payments, suppliers, customers, addPayment, deletePayment, settings, getSupplierLedger, getCustomerLedger } = useApp();
  const cs = settings.company;
  const toast = useToast();
  const dialog = useConfirmDialog();

  const [activeTab, setActiveTab] = useState<'NEW' | 'LIST'>('NEW');
  const [previewPayment, setPreviewPayment] = useState<PaymentReceipt | null>(null);
  const [isListLoading, setIsListLoading] = useState(false);

  // ── New Payment Form State ──────────
  const [direction, setDirection] = useState<'PAID_TO_SUPPLIER' | 'RECEIVED_FROM_CUSTOMER'>('PAID_TO_SUPPLIER');
  const [selectedPartyName, setSelectedPartyName] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI'>('BANK_TRANSFER');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  // ── List Filters ────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'SUPPLIER' | 'CUSTOMER'>('ALL');
  const [filterMode, setFilterMode] = useState<'ALL' | 'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI'>('ALL');
  const searchRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const referenceRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);

  // ── Party options based on direction ─
  const partyOptions: CommandOption[] = useMemo(() => {
    if (direction === 'PAID_TO_SUPPLIER') {
      return suppliers.map(s => ({
        id: s.id,
        label: s.name,
        subtitle: s.phone ? `${s.phone} • ${s.city}` : s.city,
        emoji: '🏢'
      }));
    }
    return customers.map(c => ({
      id: c.id,
      label: c.name,
      subtitle: c.phone ? `${c.phone} • ${c.city}` : c.city,
      emoji: '👤'
    }));
  }, [direction, suppliers, customers]);

  // ── Outstanding balance for selected party ──────────────────────────────
  const outstandingBalance = useMemo(() => {
    if (!selectedPartyName.trim()) return null;
    if (direction === 'PAID_TO_SUPPLIER') {
      const sup = suppliers.find(s => s.name === selectedPartyName);
      if (!sup) return null;
      const ledger = getSupplierLedger(sup.id);
      // ledger is reversed (latest first) — first entry has the current running balance
      return ledger.length > 0 ? ledger[0].runningBalance : sup.previousBalance;
    } else {
      const cust = customers.find(c => c.name === selectedPartyName);
      if (!cust) return null;
      const ledger = getCustomerLedger(cust.id);
      return ledger.length > 0 ? ledger[0].runningBalance : cust.previousBalance;
    }
  }, [selectedPartyName, direction, suppliers, customers, getSupplierLedger, getCustomerLedger]);

  const isOverpayment = outstandingBalance !== null && amount > 0 && amount > outstandingBalance && outstandingBalance > 0;

  // ── Filtered Payments ───────────────
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchSearch =
        p.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.referenceNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.amount.toString().includes(searchTerm);
      const matchType = filterType === 'ALL' || p.partyType === filterType;
      const matchMode = filterMode === 'ALL' || p.paymentMode === filterMode;
      return matchSearch && matchType && matchMode;
    });
  }, [payments, searchTerm, filterType, filterMode]);

  const paymentsTable = useDataTable<PaymentReceipt, 'date' | 'amount' | 'partyName'>({
    data: filteredPayments,
    initialSortBy: 'date',
    initialSortDir: 'desc',
    initialPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
    sortComparators: {
      date: (a, b) => a.date.localeCompare(b.date),
      amount: (a, b) => a.amount - b.amount,
      partyName: (a, b) => a.partyName.localeCompare(b.partyName),
    },
    resetPageOn: [activeTab, filterType, filterMode],
  });

  useEffect(() => {
    if (activeTab !== 'LIST') return;
    setIsListLoading(true);
    const t = window.setTimeout(() => setIsListLoading(false), 180);
    return () => window.clearTimeout(t);
  }, [activeTab, searchTerm, filterType, filterMode, paymentsTable.sortBy, paymentsTable.sortDir]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && activeTab === 'LIST') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setActiveTab('NEW');
        amountRef.current?.focus();
      }
      if (e.ctrlKey && e.key === 'Enter' && activeTab === 'NEW') {
        e.preventDefault();
        handleSavePayment();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTab, direction, selectedPartyName, amount, paymentMode, referenceNo, notes, payDate]);

  // ── Form Submit ─────────────────────
  const handleSavePayment = () => {
    if (!selectedPartyName.trim()) {
      toast.error('No Party Selected', 'Please select a supplier or customer.');
      return;
    }
    if (!amount || amount <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid payment amount greater than zero.');
      return;
    }

    const partyType: 'SUPPLIER' | 'CUSTOMER' = direction === 'PAID_TO_SUPPLIER' ? 'SUPPLIER' : 'CUSTOMER';
    let partyId = '';
    if (partyType === 'SUPPLIER') {
      partyId = suppliers.find(s => s.name === selectedPartyName)?.id || '';
    } else {
      partyId = customers.find(c => c.name === selectedPartyName)?.id || '';
    }

    const payment: PaymentReceipt = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      date: payDate,
      partyType,
      partyId,
      partyName: selectedPartyName,
      amount: Number(amount),
      paymentMode,
      referenceNo: referenceNo.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    addPayment(payment);
    const dirLabel = partyType === 'SUPPLIER' ? 'paid to' : 'received from';
    toast.success('Payment Recorded!', `₹${Number(amount).toLocaleString('en-IN')} ${dirLabel} ${selectedPartyName}. Ledger updated.`);

    // Reset form
    setSelectedPartyName('');
    setAmount(0);
    setReferenceNo('');
    setNotes('');
    setActiveTab('LIST');
  };

  const handleDeletePayment = async (p: PaymentReceipt) => {
    const ok = await dialog.confirm({
      variant: 'destructive',
      title: `Delete Payment of ₹${p.amount.toLocaleString('en-IN')}?`,
      description: `This will permanently remove the payment ${p.partyType === 'SUPPLIER' ? 'to' : 'from'} ${p.partyName} and recalculate the ledger balance.`,
      confirmText: 'Delete Payment',
    });
    if (ok) {
      deletePayment(p.id);
      toast.info('Payment Deleted', `Payment to ${p.partyName} removed. Ledger recalculated.`);
    }
  };

  return (
    <div className="space-y-6 font-sans">

      {/* ── TOP HEADER ─────────────────────────────── */}
      <div className="erp-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
        <div>
          <h1 className="erp-title text-[1.1rem] flex items-center space-x-2.5">
            <Wallet className="w-6 h-6 text-[#00aeef]" />
            <span>PAYMENTS & RECEIPTS CENTER</span>
          </h1>
          <p className="erp-subtitle mt-1">Record, track, search and print all supplier payments and customer receipts</p>
        </div>

        <div className="erp-surface flex items-center space-x-2 p-1.5 rounded-xl">
          <button
            onClick={() => setActiveTab('NEW')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
              activeTab === 'NEW'
                ? 'bg-[linear-gradient(135deg,#00C896,#00AEEF)] text-white shadow-[0_8px_20px_rgba(0,174,239,0.22)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>New Payment / Receipt</span>
          </button>
          <button
            onClick={() => setActiveTab('LIST')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
              activeTab === 'LIST'
                ? 'bg-[linear-gradient(135deg,#00C896,#00AEEF)] text-white shadow-[0_8px_20px_rgba(0,174,239,0.22)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-bg)]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>All Payments ({payments.length})</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          TAB 1: NEW PAYMENT FORM
         ══════════════════════════════════════════════ */}
      {activeTab === 'NEW' && (
        <div className="dark:bg-slate-900 bg-white rounded-2xl border dark:border-slate-800 border-slate-200 shadow-xl overflow-hidden animate-slide-up" onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target === amountRef.current) {
            e.preventDefault();
            dateRef.current?.focus();
          }
          if (e.key === 'Enter' && e.target === dateRef.current) {
            e.preventDefault();
            referenceRef.current?.focus();
          }
          if (e.key === 'Enter' && e.target === referenceRef.current) {
            e.preventDefault();
            notesRef.current?.focus();
          }
        }}>
          <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200">
            <h2 className="text-sm font-bold dark:text-white text-slate-900 flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-amber-500" />
              <span>Record New Payment or Receipt</span>
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* Direction Toggle */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-2">Payment Direction</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setDirection('PAID_TO_SUPPLIER'); setSelectedPartyName(''); }}
                  className={`flex items-center justify-center space-x-2.5 p-4 rounded-xl border-2 transition-all cursor-pointer font-bold text-sm ${
                    direction === 'PAID_TO_SUPPLIER'
                      ? 'border-rose-500 dark:bg-rose-500/10 bg-rose-50 text-rose-700 dark:text-rose-400 shadow-md shadow-rose-500/10'
                      : 'dark:border-slate-800 border-slate-200 dark:text-slate-400 text-slate-600 dark:hover:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <ArrowUpRight className="w-5 h-5" />
                  <div className="text-left">
                    <div>Pay to Supplier</div>
                    <div className="text-[10px] font-normal dark:text-slate-500 text-slate-400">Outgoing payment — reduces payable</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => { setDirection('RECEIVED_FROM_CUSTOMER'); setSelectedPartyName(''); }}
                  className={`flex items-center justify-center space-x-2.5 p-4 rounded-xl border-2 transition-all cursor-pointer font-bold text-sm ${
                    direction === 'RECEIVED_FROM_CUSTOMER'
                      ? 'border-emerald-500 dark:bg-emerald-500/10 bg-emerald-50 text-emerald-700 dark:text-emerald-400 shadow-md shadow-emerald-500/10'
                      : 'dark:border-slate-800 border-slate-200 dark:text-slate-400 text-slate-600 dark:hover:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <ArrowDownRight className="w-5 h-5" />
                  <div className="text-left">
                    <div>Receive from Customer</div>
                    <div className="text-[10px] font-normal dark:text-slate-500 text-slate-400">Incoming payment — reduces receivable</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Party */}
              <div>
                <CommandSelect
                  id={`payment-party-${direction}`}
                  variant={direction === 'PAID_TO_SUPPLIER' ? 'emerald' : 'violet'}
                  label={direction === 'PAID_TO_SUPPLIER' ? 'Supplier / Party *' : 'Customer / Buyer *'}
                  value={selectedPartyName}
                  onChange={(val) => {
                    const opt = partyOptions.find(o => o.id === val || o.label === val);
                    setSelectedPartyName(opt?.label || val);
                    // Move to next field on selection
                    setTimeout(() => amountRef.current?.focus(), 0);
                  }}
                  options={partyOptions}
                  placeholder={direction === 'PAID_TO_SUPPLIER' ? 'Select supplier...' : 'Select customer...'}
                  creatable={false}
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1.5">Amount (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold dark:text-slate-500 text-slate-400">₹</span>
                  <input
                    ref={amountRef}
                    type="number"
                    value={amount === 0 ? '' : amount}
                    placeholder="0"
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:text-amber-400 text-amber-700 font-mono font-black rounded-xl pl-8 pr-4 py-2.5 text-lg outline-none transition-all"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1.5">Payment Date</label>
                <input
                  ref={dateRef}
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 font-mono rounded-xl p-2.5 text-xs outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-2">Payment Mode *</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE'] as const).map(mode => {
                  const meta = PAYMENT_MODE_LABELS[mode];
                  const isActive = paymentMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`flex items-center space-x-2.5 p-3.5 rounded-xl border-2 transition-all cursor-pointer text-xs font-bold ${
                        isActive
                          ? `${meta.color} border-current shadow-md`
                          : 'dark:border-slate-800 border-slate-200 dark:text-slate-400 text-slate-500 dark:hover:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {meta.icon}
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reference & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1.5">Reference / Cheque / UTR No.</label>
                <input
                  ref={referenceRef}
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="e.g. NEFT-889320 / CHQ-112234"
                  className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 font-mono font-bold rounded-xl p-2.5 text-xs outline-none focus:border-amber-500 placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1.5">Remarks / Notes</label>
                <input
                  ref={notesRef}
                  type="text"
                  value={notes}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSavePayment();
                    }
                  }}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Payment against seasonal load / invoice clearance..."
                  className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-2.5 text-xs outline-none focus:border-amber-500 placeholder-slate-400"
                />
              </div>
            </div>

            {/* Outstanding Balance Info + Overpayment Warning */}
            {outstandingBalance !== null && (
              <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-xs font-semibold transition-all ${
                isOverpayment
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400'
                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}>
                <div className="shrink-0 mt-0.5">
                  {isOverpayment ? (
                    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                  ) : (
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" /></svg>
                  )}
                </div>
                <div>
                  {isOverpayment ? (
                    <>
                      <span className="font-black text-amber-700 dark:text-amber-400">Overpayment Warning — </span>
                      Payment of <span className="font-mono font-black">₹{amount.toLocaleString('en-IN')}</span> exceeds the outstanding balance of <span className="font-mono font-black">₹{outstandingBalance.toLocaleString('en-IN')}</span>. The excess <span className="font-mono font-black">₹{roundCurrency(amount - outstandingBalance).toLocaleString('en-IN')}</span> will create a credit balance. Confirm if intentional.
                    </>
                  ) : (
                    <>
                      Outstanding balance: <span className="font-mono font-black dark:text-white text-slate-900">₹{outstandingBalance.toLocaleString('en-IN')}</span>
                      {amount > 0 && <span className="ml-2 dark:text-slate-300 text-slate-700">→ After payment: <span className="font-mono font-black">₹{roundCurrency(outstandingBalance - amount).toLocaleString('en-IN')}</span></span>}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex items-center justify-between pt-4 border-t dark:border-slate-800 border-slate-200">
              <div>
                <div className="text-xs dark:text-slate-400 text-slate-500 font-bold uppercase tracking-wider">
                  {direction === 'PAID_TO_SUPPLIER' ? 'Paying to Supplier' : 'Receiving from Customer'}
                </div>
                <div className="text-2xl font-black font-mono dark:text-amber-400 text-amber-600 mt-0.5">
                  ₹ {(amount || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => { setSelectedPartyName(''); setAmount(0); setReferenceNo(''); setNotes(''); }}
                  className="px-5 py-3 dark:bg-slate-800 bg-slate-100 dark:hover:bg-slate-700 hover:bg-slate-200 dark:text-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={handleSavePayment}
                  className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-sm shadow-xl shadow-amber-500/20 cursor-pointer transition-all flex items-center space-x-2"
                >
                  <Wallet className="w-5 h-5 stroke-[2.5]" />
                  <span>SAVE PAYMENT & UPDATE LEDGER</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          TAB 2: PAYMENT REGISTER LIST
         ══════════════════════════════════════════════ */}
      {activeTab === 'LIST' && (
        <div className="erp-table-wrap rounded-2xl animate-slide-up">
          <div className="px-6 py-4 bg-[var(--surface-bg)] border-b border-[var(--card-border)] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Payment Register</h2>
              <span className="text-xs bg-[var(--surface-bg)] text-[var(--primary)] font-mono font-semibold px-2.5 py-0.5 rounded-full border border-[var(--card-border)]">{filteredPayments.length} entries</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Search */}
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-2.5" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search party, ref no, amount..."
                  className="erp-input w-full min-h-0 pl-9 pr-3 py-2 text-xs"
                />
              </div>
              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="erp-input min-h-0 rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
              >
                <option value="ALL">All Parties</option>
                <option value="SUPPLIER">Suppliers Only</option>
                <option value="CUSTOMER">Customers Only</option>
              </select>
              {/* Mode Filter */}
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value as any)}
                className="erp-input min-h-0 rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer"
              >
                <option value="ALL">All Modes</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <DataTable
            footer={
              <Pagination
                page={paymentsTable.page}
                totalPages={paymentsTable.totalPages}
                totalRecords={paymentsTable.totalRecords}
                pageSize={paymentsTable.pageSize}
                pageSizeOptions={paymentsTable.pageSizeOptions}
                onPageChange={paymentsTable.setPage}
                onPageSizeChange={paymentsTable.setPageSize}
                label="payments"
              />
            }
          >
            <table className="erp-table text-left text-xs sm:text-sm">
              <thead>
                <tr>
                  <th className="py-3 px-4 col-text w-28">
                    <button type="button" onClick={() => paymentsTable.toggleSort('date')} className="inline-flex items-center gap-1">
                      Date <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3 px-3 col-text w-32">Direction</th>
                  <th className="py-3 px-3 col-text">
                    <button type="button" onClick={() => paymentsTable.toggleSort('partyName')} className="inline-flex items-center gap-1">
                      Party Name <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3 px-3 col-num font-black dark:text-amber-400 text-amber-700 w-44">
                    <button type="button" onClick={() => paymentsTable.toggleSort('amount')} className="inline-flex items-center gap-1 ml-auto">
                      Amount <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3 px-3 col-text w-40">Mode</th>
                  <th className="py-3 px-3 col-text w-40">Reference No.</th>
                  <th className="py-3 px-3 col-text w-48">Notes / Remarks</th>
                  <th className="py-3 px-4 col-actions sticky right-0 bg-[var(--table-header-bg)] z-[3] w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isListLoading ? (
                  <tr>
                    <td colSpan={8} className="p-0">
                      <TableSkeleton rows={7} cols={8} />
                    </td>
                  </tr>
                ) : paymentsTable.totalRecords === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-0">
                      <ModuleEmptyState
                        title="No payments match the current filters"
                        subtitle="Try clearing filters or record a new payment with Ctrl+N."
                      />
                    </td>
                  </tr>
                ) : (
                  paymentsTable.pageRows.map(p => {
                    const isSupplier = p.partyType === 'SUPPLIER';
                    const modeMeta = getPaymentModeMeta(p.paymentMode);

                    return (
                      <tr key={p.id} className="transition-colors group font-sans">
                        <td className="py-3.5 px-4 col-text">
                          <div className="flex items-center space-x-1.5 font-mono text-xs text-[#475569] font-semibold">
                            <Calendar className="w-3.5 h-3.5 text-[#94a3b8]" />
                            <span>{fmtDate(p.date)}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 col-text">
                          {isSupplier ? (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-semibold uppercase tracking-wider text-rose-600 bg-rose-500/10 border border-rose-500/30 px-2 py-1 rounded-lg font-mono">
                              <ArrowUpRight className="w-3 h-3" />
                              <span>PAID OUT</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg font-mono">
                              <ArrowDownRight className="w-3 h-3" />
                              <span>RECEIVED</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 col-text">
                          <div className="flex items-center space-x-2">
                            <div className={`p-1 rounded ${isSupplier ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                              {isSupplier ? <Users className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <div className="font-semibold text-[var(--text-primary)] text-sm truncate max-w-[200px]">{p.partyName}</div>
                              <div className="text-[10px] text-[var(--text-muted)] font-medium">{isSupplier ? 'Supplier' : 'Customer'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 col-num">
                          <span className={`text-base font-black font-mono ${isSupplier ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {isSupplier ? '−' : '+'}₹ {p.amount.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 col-text">
                          <span className={`inline-flex items-center space-x-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-lg border ${modeMeta.color}`}>
                            {modeMeta.icon}
                            <span>{modeMeta.label}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-3 col-text">
                          <span className="font-mono font-semibold text-[#475569] text-xs">{p.referenceNo || '—'}</span>
                        </td>
                        <td className="py-3.5 px-3 col-text">
                          <span className="text-[#64748b] text-xs truncate block max-w-[180px]">{p.notes || '—'}</span>
                        </td>
                        <td className="py-3.5 px-4 col-actions sticky right-0 bg-[var(--card-bg)] z-[2] border-l border-[var(--table-border)]">
                          <div className="flex items-center justify-center space-x-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setPreviewPayment(p)}
                              className="p-2 text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--surface-bg)] rounded-lg cursor-pointer transition-colors"
                              title="View Receipt"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePayment(p)}
                              className="p-2 text-[var(--text-muted)] hover:text-rose-500 hover:bg-[var(--surface-bg)] rounded-lg cursor-pointer transition-colors"
                              title="Delete Payment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </DataTable>

          {/* Footer Summary */}
          {paymentsTable.totalRecords > 0 && (
            <div className="px-6 py-3 bg-[var(--surface-bg)] border-t border-[var(--card-border)] flex items-center justify-between text-xs font-semibold">
              <span className="text-[var(--text-muted)]">
                Showing {paymentsTable.totalRecords} of {payments.length} payments
              </span>
              <div className="flex items-center space-x-4 font-mono">
                <span className="text-rose-600 dark:text-rose-400">
                  Paid: ₹{paymentsTable.rows.filter(p => p.partyType === 'SUPPLIER').reduce((s, p) => s + p.amount, 0).toLocaleString('en-IN')}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  Recd: ₹{paymentsTable.rows.filter(p => p.partyType === 'CUSTOMER').reduce((s, p) => s + p.amount, 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          PAYMENT RECEIPT PREVIEW MODAL
         ══════════════════════════════════════════════ */}
      {previewPayment && (
        <div className="fixed inset-0 z-[99999] overflow-y-auto animate-fade-in custom-scrollbar">
          <div className="min-h-screen dark:bg-slate-950/90 bg-slate-200/90 backdrop-blur-md flex flex-col items-center py-6 sm:py-12 px-3 sm:px-4">
            {/* Toolbar */}
            <div className="w-full max-w-[650px] mb-4 flex items-center justify-between no-print animate-slide-down">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm border border-slate-200 dark:border-slate-700">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black dark:text-white text-slate-900 tracking-tight uppercase">Payment Receipt</h3>
                  <p className="text-[10px] dark:text-slate-400 text-slate-500 font-mono tracking-wider">#{previewPayment.id.slice(-8).toUpperCase()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => window.print()} className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95">
                  <Printer className="w-4 h-4" /><span>Print Receipt</span>
                </button>
                <button onClick={() => setPreviewPayment(null)} className="p-2.5 dark:text-slate-400 text-slate-500 dark:hover:text-white hover:text-slate-900 dark:bg-slate-800 bg-white rounded-xl cursor-pointer transition-all border dark:border-slate-700 border-slate-200 shadow-sm active:scale-95">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* The Actual White Paper Sheet */}
            <div className="w-full max-w-[650px] bg-white rounded-xl shadow-2xl dark:shadow-black/60 shadow-slate-400/20 overflow-hidden border border-slate-200/50 dark:border-slate-700/30 printable-patti animate-slide-up">
              <div className="p-10 max-w-[600px] mx-auto font-[system-ui,sans-serif] text-[13px] leading-relaxed text-slate-900">
                {/* Header */}
                <div className="flex justify-between items-start border-b-[3px] border-slate-900 pb-5 mb-6">
                  <div>
                    <div className="flex items-center space-x-3 mb-1">
                      {cs.logo && <img src={cs.logo} alt="Logo" className="h-9 max-w-[90px] object-contain shrink-0" />}
                      <h1 className="text-[24px] font-black tracking-tight text-slate-950 leading-none">{cs.name.toUpperCase()}</h1>
                    </div>
                    <p className="text-[11px] font-bold text-slate-600 mt-1 tracking-[0.15em] uppercase">{cs.tagline}</p>
                    <p className="text-[10.5px] text-slate-500 mt-1.5 leading-relaxed">{cs.address}<br/>Phone: {cs.phone} &nbsp;|&nbsp; Email: {cs.email}</p>
                  </div>
                  <div className="text-right shrink-0 ml-6">
                    <div className="inline-block border-2 border-amber-700 px-5 py-3 rounded-lg bg-amber-50">
                      <div className="text-[9px] font-black tracking-[0.2em] uppercase text-amber-500">
                        {previewPayment.partyType === 'SUPPLIER' ? 'PAYMENT VOUCHER' : 'PAYMENT RECEIPT'}
                      </div>
                      <div className="text-[20px] font-black font-mono text-amber-900 leading-tight mt-0.5">{fmtDate(previewPayment.date)}</div>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-0 border border-slate-300 rounded-lg overflow-hidden mb-8 text-[11px]">
                  <div className="p-4 bg-slate-50 border-r border-slate-300">
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                      {previewPayment.partyType === 'SUPPLIER' ? 'Paid To (Supplier)' : 'Received From (Customer)'}
                    </div>
                    <div className="font-black text-slate-950 text-[16px]">{previewPayment.partyName}</div>
                  </div>
                  <div className="p-4 bg-white">
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Payment Mode</div>
                    <div className="font-black text-slate-950 text-[14px]">{getPaymentModeMeta(previewPayment.paymentMode).label}</div>
                  </div>
                  <div className="p-4 bg-white border-r border-slate-300 border-t">
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Reference / UTR No.</div>
                    <div className="font-mono font-bold text-slate-700 text-[12px]">{previewPayment.referenceNo || '—'}</div>
                  </div>
                  <div className="p-4 bg-slate-50 border-t">
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Remarks</div>
                    <div className="text-slate-600 font-medium italic">{previewPayment.notes || '—'}</div>
                  </div>
                </div>

                {/* BIG Amount */}
                <div className="border-2 border-slate-900 rounded-xl p-5 text-center mb-6 bg-slate-50">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">
                    {previewPayment.partyType === 'SUPPLIER' ? 'AMOUNT PAID' : 'AMOUNT RECEIVED'}
                  </div>
                  <div className="text-[32px] font-black font-mono text-slate-950 leading-none">
                    ₹ {previewPayment.amount.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-2 font-semibold">
                    ({numberToWords(previewPayment.amount)} Rupees Only)
                  </div>
                </div>

                {/* Signatures */}
                <div className="mt-10 grid grid-cols-2 gap-8 text-[10px] text-slate-600">
                  {[previewPayment.partyType === 'SUPPLIER' ? 'Supplier Acknowledgment' : 'Customer Acknowledgment', `For ${cs.name}`].map((label, i) => (
                    <div key={i} className={i === 1 ? 'text-right' : ''}>
                      <div className={`border-b border-slate-400 mb-2 ${i === 1 ? 'ml-auto w-44' : 'w-44'}`} style={{height:'1px'}}></div>
                      <div className="font-bold text-slate-800 uppercase tracking-wider">{label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-2 border-t border-slate-200 text-center text-[9px] text-slate-400 font-mono">
                  Computer generated payment record &nbsp;•&nbsp; ASZ Nexus ERP System
                </div>
              </div>
            </div>
            <div className="h-12 shrink-0" />
          </div>
        </div>
      )}
    </div>
  );
};

// ── Helper: Number to Words (Indian format) ──────
function numberToWords(n: number): string {
  if (n === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (num: number): string => {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + convert(num % 100) : '');
    if (num < 100000) return convert(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + convert(num % 1000) : '');
    if (num < 10000000) return convert(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + convert(num % 100000) : '');
    return convert(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + convert(num % 10000000) : '');
  };
  return convert(Math.round(n));
}
