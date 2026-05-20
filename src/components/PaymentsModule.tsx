import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { PaymentReceipt } from '../types';
import { Combobox } from './ui/Combobox';
import { useToast } from './ui/Toast';
import { useConfirmDialog } from './ui/ConfirmDialog';
import {
  Wallet, Plus, Search, Trash2, Eye, Calendar, ArrowUpRight, ArrowDownRight,
  DollarSign, CreditCard, Banknote, Smartphone, FileText,
  Printer, X, Building2, Users, UserCheck
} from 'lucide-react';

const PAYMENT_MODE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  CASH: { label: 'Cash', icon: <Banknote className="w-3.5 h-3.5" />, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  BANK_TRANSFER: { label: 'Bank NEFT/RTGS', icon: <Building2 className="w-3.5 h-3.5" />, color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30' },
  CHEQUE: { label: 'Cheque', icon: <CreditCard className="w-3.5 h-3.5" />, color: 'text-violet-600 dark:text-violet-400 bg-violet-500/10 border-violet-500/30' },
  UPI: { label: 'UPI / GPay', icon: <Smartphone className="w-3.5 h-3.5" />, color: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30' },
};

export const PaymentsModule: React.FC = () => {
  const { payments, suppliers, customers, addPayment, deletePayment, settings } = useApp();
  const cs = settings.company;
  const toast = useToast();
  const dialog = useConfirmDialog();

  const [activeTab, setActiveTab] = useState<'NEW' | 'LIST'>('LIST');
  const [previewPayment, setPreviewPayment] = useState<PaymentReceipt | null>(null);

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

  // ── Party options based on direction ─
  const partyOptions = useMemo(() => {
    if (direction === 'PAID_TO_SUPPLIER') return suppliers.map(s => s.name);
    return customers.map(c => c.name);
  }, [direction, suppliers, customers]);

  // ── Stats ───────────────────────────
  const totalPaidToSuppliers = useMemo(() =>
    payments.filter(p => p.partyType === 'SUPPLIER').reduce((s, p) => s + p.amount, 0), [payments]);
  const totalReceivedFromCustomers = useMemo(() =>
    payments.filter(p => p.partyType === 'CUSTOMER').reduce((s, p) => s + p.amount, 0), [payments]);
  const totalCash = useMemo(() =>
    payments.filter(p => p.paymentMode === 'CASH').reduce((s, p) => s + p.amount, 0), [payments]);
  const totalBank = useMemo(() =>
    payments.filter(p => p.paymentMode === 'BANK_TRANSFER').reduce((s, p) => s + p.amount, 0), [payments]);
  const totalUPI = useMemo(() =>
    payments.filter(p => p.paymentMode === 'UPI').reduce((s, p) => s + p.amount, 0), [payments]);
  const totalCheque = useMemo(() =>
    payments.filter(p => p.paymentMode === 'CHEQUE').reduce((s, p) => s + p.amount, 0), [payments]);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 dark:bg-slate-900 bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 shadow-md">
        <div>
          <h1 className="text-xl font-black dark:text-white text-slate-900 tracking-tight flex items-center space-x-2.5">
            <Wallet className="w-6 h-6 text-amber-500" />
            <span>PAYMENTS & RECEIPTS CENTER</span>
          </h1>
          <p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5">Record, track, search & print all supplier payments and customer receipts</p>
        </div>

        <div className="flex items-center space-x-2 dark:bg-slate-950 bg-slate-100 p-1.5 rounded-xl border dark:border-slate-800 border-slate-200">
          <button
            onClick={() => setActiveTab('NEW')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'NEW'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                : 'dark:text-slate-400 text-slate-600 dark:hover:text-white hover:text-slate-900'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>New Payment / Receipt</span>
          </button>
          <button
            onClick={() => setActiveTab('LIST')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeTab === 'LIST'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                : 'dark:text-slate-400 text-slate-600 dark:hover:text-white hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Payment Register ({payments.length})</span>
          </button>
        </div>
      </div>

      {/* ── KPI CARDS ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Paid to Suppliers */}
        <div className="dark:bg-slate-900 bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500">Paid to Suppliers</span>
            <div className="p-1.5 bg-rose-500/10 text-rose-500 rounded-lg"><ArrowUpRight className="w-4 h-4" /></div>
          </div>
          <div className="text-lg font-black font-mono dark:text-white text-slate-900">₹ {totalPaidToSuppliers.toLocaleString('en-IN')}</div>
        </div>
        {/* Received from Customers */}
        <div className="dark:bg-slate-900 bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500">Received from Buyers</span>
            <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg"><ArrowDownRight className="w-4 h-4" /></div>
          </div>
          <div className="text-lg font-black font-mono dark:text-white text-slate-900">₹ {totalReceivedFromCustomers.toLocaleString('en-IN')}</div>
        </div>
        {/* By Mode Breakdown */}
        <div className="dark:bg-slate-900 bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm">
          <div className="flex items-center space-x-1.5 mb-2"><Banknote className="w-3.5 h-3.5 text-emerald-500" /><span className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500">Cash</span></div>
          <div className="text-base font-bold font-mono dark:text-white text-slate-900">₹ {totalCash.toLocaleString('en-IN')}</div>
        </div>
        <div className="dark:bg-slate-900 bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm">
          <div className="flex items-center space-x-1.5 mb-2"><Building2 className="w-3.5 h-3.5 text-blue-500" /><span className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500">Bank</span></div>
          <div className="text-base font-bold font-mono dark:text-white text-slate-900">₹ {totalBank.toLocaleString('en-IN')}</div>
        </div>
        <div className="dark:bg-slate-900 bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm">
          <div className="flex items-center space-x-1.5 mb-2"><Smartphone className="w-3.5 h-3.5 text-orange-500" /><span className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500">UPI</span></div>
          <div className="text-base font-bold font-mono dark:text-white text-slate-900">₹ {totalUPI.toLocaleString('en-IN')}</div>
        </div>
        <div className="dark:bg-slate-900 bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm">
          <div className="flex items-center space-x-1.5 mb-2"><CreditCard className="w-3.5 h-3.5 text-violet-500" /><span className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500">Cheque</span></div>
          <div className="text-base font-bold font-mono dark:text-white text-slate-900">₹ {totalCheque.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          TAB 1: NEW PAYMENT FORM
         ══════════════════════════════════════════════ */}
      {activeTab === 'NEW' && (
        <div className="dark:bg-slate-900 bg-white rounded-2xl border dark:border-slate-800 border-slate-200 shadow-xl overflow-hidden animate-slide-up">
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
                <label className="block text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1.5">
                  {direction === 'PAID_TO_SUPPLIER' ? 'Supplier / Party *' : 'Customer / Buyer *'}
                </label>
                <Combobox
                  value={selectedPartyName}
                  onChange={setSelectedPartyName}
                  options={partyOptions}
                  placeholder={direction === 'PAID_TO_SUPPLIER' ? 'Select supplier...' : 'Select customer...'}
                  searchPlaceholder="Search..."
                  creatable={false}
                  showEmoji={false}
                  className="py-2.5"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1.5">Amount (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold dark:text-slate-500 text-slate-400">₹</span>
                  <input
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
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Payment against seasonal load / invoice clearance..."
                  className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-2.5 text-xs outline-none focus:border-amber-500 placeholder-slate-400"
                />
              </div>
            </div>

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
        <div className="dark:bg-slate-900 bg-white rounded-2xl border dark:border-slate-800 border-slate-200 shadow-xl overflow-hidden animate-slide-up">
          {/* Filters Bar */}
          <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold dark:text-white text-slate-900">Payment Register</h2>
              <span className="text-xs dark:bg-slate-800 bg-slate-200 dark:text-amber-400 text-amber-700 font-mono font-bold px-2.5 py-0.5 rounded-full border dark:border-slate-700 border-slate-300">{filteredPayments.length} entries</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Search */}
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 dark:text-slate-400 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search party, ref no, amount..."
                  className="w-full dark:bg-slate-900 bg-white border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 pl-9 pr-3 py-2 rounded-lg text-xs outline-none focus:border-amber-500 placeholder-slate-400"
                />
              </div>
              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="dark:bg-slate-900 bg-white border dark:border-slate-700/80 border-slate-300 dark:text-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="ALL">All Parties</option>
                <option value="SUPPLIER">Suppliers Only</option>
                <option value="CUSTOMER">Customers Only</option>
              </select>
              {/* Mode Filter */}
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value as any)}
                className="dark:bg-slate-900 bg-white border dark:border-slate-700/80 border-slate-300 dark:text-slate-300 text-slate-900 rounded-lg px-3 py-2 text-xs font-bold outline-none cursor-pointer"
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="dark:bg-slate-900/80 bg-slate-100 dark:text-slate-300 text-slate-700 uppercase font-bold border-b dark:border-slate-800 border-slate-200 text-[11px]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-3">Direction</th>
                  <th className="py-3 px-3">Party Name</th>
                  <th className="py-3 px-3 text-right font-black dark:text-amber-400 text-amber-700">Amount</th>
                  <th className="py-3 px-3">Mode</th>
                  <th className="py-3 px-3">Reference No.</th>
                  <th className="py-3 px-3">Notes / Remarks</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800/80 divide-slate-100">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center dark:text-slate-500 text-slate-400 text-sm font-medium">
                      <span className="text-3xl block mb-2">💸</span>
                      No payments match your filters. Record a new payment above!
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(p => {
                    const isSupplier = p.partyType === 'SUPPLIER';
                    const modeMeta = PAYMENT_MODE_LABELS[p.paymentMode];

                    return (
                      <tr key={p.id} className="dark:hover:bg-slate-800/40 hover:bg-slate-50 transition-colors group font-sans">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-1.5 font-mono text-xs dark:text-slate-300 text-slate-700 font-semibold">
                            <Calendar className="w-3.5 h-3.5 dark:text-slate-500 text-slate-400" />
                            <span>{p.date}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          {isSupplier ? (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-1 rounded-lg font-mono">
                              <ArrowUpRight className="w-3 h-3" />
                              <span>PAID OUT</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg font-mono">
                              <ArrowDownRight className="w-3 h-3" />
                              <span>RECEIVED</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center space-x-2">
                            <div className={`p-1 rounded ${isSupplier ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                              {isSupplier ? <Users className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <div className="font-bold dark:text-white text-slate-900 text-sm truncate max-w-[200px]">{p.partyName}</div>
                              <div className="text-[10px] dark:text-slate-500 text-slate-400 font-medium">{isSupplier ? 'Supplier' : 'Customer'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <span className={`text-base font-black font-mono ${isSupplier ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {isSupplier ? '−' : '+'}₹ {p.amount.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`inline-flex items-center space-x-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border ${modeMeta.color}`}>
                            {modeMeta.icon}
                            <span>{modeMeta.label}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-mono font-bold dark:text-slate-300 text-slate-700 text-xs">{p.referenceNo || '—'}</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="dark:text-slate-400 text-slate-600 text-xs truncate block max-w-[180px]">{p.notes || '—'}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setPreviewPayment(p)}
                              className="p-2 dark:text-slate-400 text-slate-500 hover:text-amber-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                              title="View Receipt"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePayment(p)}
                              className="p-2 dark:text-slate-400 text-slate-500 hover:text-rose-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
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
          </div>

          {/* Footer Summary */}
          {filteredPayments.length > 0 && (
            <div className="px-6 py-3 dark:bg-slate-950 bg-slate-50 border-t dark:border-slate-800 border-slate-200 flex items-center justify-between text-xs font-bold">
              <span className="dark:text-slate-400 text-slate-500">
                Showing {filteredPayments.length} of {payments.length} payments
              </span>
              <div className="flex items-center space-x-4 font-mono">
                <span className="text-rose-600 dark:text-rose-400">
                  Paid: ₹{filteredPayments.filter(p => p.partyType === 'SUPPLIER').reduce((s, p) => s + p.amount, 0).toLocaleString('en-IN')}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  Recd: ₹{filteredPayments.filter(p => p.partyType === 'CUSTOMER').reduce((s, p) => s + p.amount, 0).toLocaleString('en-IN')}
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-8 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 border-slate-200 rounded-2xl max-w-[600px] w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-slide-up">
            {/* Modal Header */}
            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950 border-b dark:border-slate-800 border-slate-200 flex items-center justify-between no-print">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg"><Wallet className="w-5 h-5" /></div>
                <div>
                  <h3 className="text-sm font-bold dark:text-white text-slate-900">Payment Receipt</h3>
                  <p className="text-[11px] dark:text-slate-400 text-slate-500 font-mono">{previewPayment.id}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button onClick={() => window.print()} className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-lg font-bold text-xs shadow cursor-pointer transition-colors">
                  <Printer className="w-4 h-4" /><span>Print</span>
                </button>
                <button onClick={() => setPreviewPayment(null)} className="p-2 dark:text-slate-400 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg cursor-pointer transition-colors"><X className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="flex-1 overflow-y-auto bg-white text-slate-900 printable-patti">
              <div className="p-8 max-w-[560px] mx-auto font-[system-ui,sans-serif] text-[13px]">
                {/* Header */}
                <div className="flex justify-between items-start border-b-[3px] border-slate-900 pb-4 mb-6">
                  <div>
                    <div className="flex items-center space-x-2 mb-0.5">
                      {cs.logo && <img src={cs.logo} alt="Logo" className="h-8 max-w-[80px] object-contain shrink-0" />}
                      <h1 className="text-[20px] font-black tracking-tight text-slate-950 leading-none">{cs.name.toUpperCase()}</h1>
                    </div>
                    <p className="text-[10px] font-bold text-slate-600 mt-0.5 tracking-[0.15em] uppercase">Wholesale Fruit Commission Agents</p>
                    <p className="text-[10px] text-slate-500 mt-1">Central Fruit Market, APMC Yard &nbsp;|&nbsp; +91 99887 77665</p>
                  </div>
                  <div className="text-right">
                    <div className="inline-block border-2 border-amber-700 px-4 py-2 rounded-lg bg-amber-50">
                      <div className="text-[8px] font-black tracking-[0.2em] uppercase text-amber-500">
                        {previewPayment.partyType === 'SUPPLIER' ? 'PAYMENT VOUCHER' : 'PAYMENT RECEIPT'}
                      </div>
                      <div className="text-[11px] font-mono font-bold text-amber-900 mt-0.5">{previewPayment.date}</div>
                    </div>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-0 border border-slate-300 rounded-lg overflow-hidden mb-6 text-[11px]">
                  <div className="p-3 bg-slate-50 border-r border-slate-300">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {previewPayment.partyType === 'SUPPLIER' ? 'Paid To (Supplier)' : 'Received From (Customer)'}
                    </div>
                    <div className="font-bold text-slate-900 mt-0.5 text-sm">{previewPayment.partyName}</div>
                  </div>
                  <div className="p-3 bg-white">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Payment Mode</div>
                    <div className="font-bold text-slate-900 mt-0.5">{PAYMENT_MODE_LABELS[previewPayment.paymentMode].label}</div>
                  </div>
                  <div className="p-3 bg-white border-r border-slate-300 border-t">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Reference / UTR No.</div>
                    <div className="font-bold font-mono text-slate-900 mt-0.5">{previewPayment.referenceNo || '—'}</div>
                  </div>
                  <div className="p-3 bg-slate-50 border-t">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Remarks</div>
                    <div className="text-slate-700 mt-0.5">{previewPayment.notes || '—'}</div>
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
                  Computer generated payment record &nbsp;•&nbsp; TFC ERP System
                </div>
              </div>
            </div>
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
