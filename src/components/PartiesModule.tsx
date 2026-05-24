import React, { useState, useMemo } from 'react';
import { fmtDate } from '@/utils/format';
import { useApp } from '../context/AppContext';
import { useToast } from './ui/Toast';
import { useConfirmDialog } from './ui/ConfirmDialog';
import {
  Users, UserCheck, Search, Plus, LayoutGrid, List,
  Phone, Mail, MapPin, TrendingUp, TrendingDown, X, Edit3,
  Trash2, Building2, DollarSign, StickyNote, IndianRupee, Printer,
  ArrowUpDown, ArrowLeft, ArrowUpRight, ArrowDownRight, Calendar
} from 'lucide-react';
import { useDataTable } from '../hooks/useDataTable';
import { DataTable, Pagination } from './ui/table';

import { PaymentReceipt } from '../types';
import { StatementPreview } from './ui/StatementPreview';
import { ModuleEmptyState, TableSkeleton } from './ui/DataStates';

type PartyType = 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
type ViewMode = 'GRID' | 'LIST';
type FilterTab = 'ALL' | 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
type SortKey = 'name' | 'city' | 'balance';

interface UnifiedParty {
  id: string; name: string; type: PartyType; phone: string; email: string; gstin: string;
  city: string; state: string; billingAddress: string; shippingAddress: string;
  balance: number; balanceType: 'DEBIT' | 'CREDIT'; creditLimit: number; notes: string; code: string; createdAt: string;
}

const emptyParty = (): UnifiedParty => ({
  id: '', name: '', type: 'CUSTOMER', phone: '', email: '', gstin: '', city: '', state: '',
  billingAddress: '', shippingAddress: '', balance: 0, balanceType: 'DEBIT', creditLimit: 0, notes: '', code: '', createdAt: new Date().toISOString(),
});

export const PartiesModule: React.FC = () => {
  const { suppliers, customers, addSupplier, updateSupplier, deleteSupplier, addCustomer, updateCustomer, deleteCustomer, getSupplierLedger, getCustomerLedger, addPayment } = useApp();
  const toast = useToast();
  const dialog = useConfirmDialog();

  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [showModal, setShowModal] = useState(false);
  const [editingParty, setEditingParty] = useState<UnifiedParty | null>(null);

  const [form, setForm] = useState<UnifiedParty>(emptyParty());
  const [detailParty, setDetailParty] = useState<UnifiedParty | null>(null);

  // Customer Module States (for detail view)
  const [showStatement, setShowStatement] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE' | 'UPI'>('UPI');
  const [payRefNo, setPayRefNo] = useState('');
  const [payNotes, setPayNotes] = useState('');

  const f = (field: keyof UnifiedParty, value: any) => setForm(p => ({ ...p, [field]: value }));
  const isEditMode = editingParty !== null;

  // ── Unified party list ──────────────────────
  const allParties: UnifiedParty[] = useMemo(() => {
    const list: UnifiedParty[] = [];
    customers.forEach(c => {
      const isBoth = suppliers.some(s => s.name.toLowerCase() === c.name.toLowerCase());
      list.push({ id: c.id, name: c.name, type: isBoth ? 'BOTH' : 'CUSTOMER', phone: c.phone, email: '', gstin: '', city: c.city, state: '', billingAddress: '', shippingAddress: '', balance: c.previousBalance, balanceType: c.previousBalance >= 0 ? 'DEBIT' : 'CREDIT', creditLimit: 0, notes: '', code: '', createdAt: '' });
    });
    suppliers.forEach(s => {
      if (!list.some(p => p.name.toLowerCase() === s.name.toLowerCase())) {
        list.push({ id: s.id, name: s.name, type: 'SUPPLIER', phone: s.phone || '', email: '', gstin: '', city: s.city, state: '', billingAddress: '', shippingAddress: '', balance: s.previousBalance, balanceType: s.previousBalance >= 0 ? 'DEBIT' : 'CREDIT', creditLimit: 0, notes: '', code: s.code, createdAt: '' });
      }
    });
    return list;
  }, [customers, suppliers]);

  const filtered = useMemo(() => {
    let list = allParties;
    if (filterTab !== 'ALL') list = list.filter(p => p.type === filterTab);
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(p => p.name.toLowerCase().includes(q) || p.phone.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || p.gstin.toLowerCase().includes(q) || p.city.toLowerCase().includes(q)); }
    return list;
  }, [allParties, filterTab, search]);

  const partiesTable = useDataTable<UnifiedParty, SortKey>({
    data: filtered,
    initialSortBy: 'name',
    initialSortDir: 'asc',
    initialPageSize: 18,
    pageSizeOptions: [12, 18, 30, 50],
    sortComparators: {
      name: (a, b) => a.name.localeCompare(b.name),
      city: (a, b) => (a.city || '').localeCompare(b.city || ''),
      balance: (a, b) => b.balance - a.balance,
    },
    resetPageOn: [filterTab, viewMode],
  });

  const counts = useMemo(() => ({ ALL: allParties.length, CUSTOMER: allParties.filter(p => p.type === 'CUSTOMER').length, SUPPLIER: allParties.filter(p => p.type === 'SUPPLIER').length, BOTH: allParties.filter(p => p.type === 'BOTH').length }), [allParties]);

  // ── Actions ─────────────────────────────────
  const openCreate = () => { setEditingParty(null); setForm(emptyParty()); setShowModal(true); };
  const openEdit = (p: UnifiedParty) => { setEditingParty(p); setForm({ ...p }); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingParty(null); };
  const formValid = form.name.trim().length >= 2 && (!form.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email));

  const handleSave = () => {
    if (!formValid) { toast.error('Validation Error', 'Party name required (min 2 chars). Email must be valid.'); return; }
    const bal = form.balanceType === 'CREDIT' ? -Math.abs(form.balance) : Math.abs(form.balance);
    if (isEditMode) {
      if (form.type === 'SUPPLIER' || form.type === 'BOTH') { const e = suppliers.find(s => s.id === form.id); if (e) updateSupplier({ ...e, name: form.name, code: form.code || e.code, phone: form.phone, city: form.city, previousBalance: bal }); }
      if (form.type === 'CUSTOMER' || form.type === 'BOTH') { const e = customers.find(c => c.id === form.id); if (e) updateCustomer({ ...e, name: form.name, phone: form.phone, city: form.city, previousBalance: bal }); }
      toast.success('Party Updated', `${form.name} saved.`);
    } else {
      if (form.type === 'SUPPLIER' || form.type === 'BOTH') addSupplier({ name: form.name, code: form.code || form.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4) + '-01', phone: form.phone, city: form.city, previousBalance: bal });
      if (form.type === 'CUSTOMER' || form.type === 'BOTH') addCustomer({ name: form.name, phone: form.phone, city: form.city, previousBalance: bal });
      toast.success('Party Created', `${form.name} registered as ${form.type.toLowerCase()}.`);
    }
    closeModal();
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailParty || payAmount <= 0) {
      toast.error('Invalid Amount', 'Please enter a valid payment amount greater than zero.');
      return;
    }

    const newPayment: PaymentReceipt = {
      id: `p-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      partyType: 'CUSTOMER',
      partyId: detailParty.id,
      partyName: detailParty.name,
      amount: Number(payAmount),
      paymentMode: payMode,
      referenceNo: payRefNo,
      notes: payNotes
    };

    addPayment(newPayment);
    toast.success('Payment Received', `₹${Number(payAmount).toLocaleString('en-IN')} received from ${detailParty.name}. Customer balance updated.`);
    setShowPaymentModal(false);
    setPayAmount(0);
    setPayRefNo('');
    setPayNotes('');
  };

  const handleDeleteParty = async (p: UnifiedParty) => {
    const ok = await dialog.confirm({
      variant: 'destructive',
      title: `Remove ${p.name}?`,
      description: 'This will permanently delete the party record and any associated ledger references. This action cannot be undone.',
      confirmText: 'Delete Party',
    });
    if (ok) {
      if (p.type === 'SUPPLIER' || p.type === 'BOTH') deleteSupplier(p.id);
      if (p.type === 'CUSTOMER' || p.type === 'BOTH') deleteCustomer(p.id);
      toast.info('Party Deleted', `${p.name} removed.`);
      if (detailParty?.id === p.id) setDetailParty(null);
    }
  };

  // ── Helpers ─────────────────────────────────
  const TypeBadge = ({ type }: { type: PartyType }) => {
    const c = { CUSTOMER: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20', SUPPLIER: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', BOTH: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
    return <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border font-mono ${c[type]}`}>{{ CUSTOMER: 'Customer', SUPPLIER: 'Supplier', BOTH: 'Both' }[type]}</span>;
  };
  const Av = ({ name, size = 'w-10 h-10 text-xs' }: { name: string; size?: string }) => <div className={`${size} rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-black shrink-0 shadow-sm`}>{name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</div>;
  const Bal = ({ balance }: { balance: number }) => (<div className="flex items-center space-x-1">{balance >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-500" />}<span className={`font-mono font-bold text-sm ${balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>₹{Math.abs(balance).toLocaleString('en-IN')}</span></div>);
  const Inp = ({ label, value, onChange, placeholder = '', mono = false, type = 'text', required = false, icon }: { label: string; value: string | number; onChange: (v: string) => void; placeholder?: string; mono?: boolean; type?: string; required?: boolean; icon?: React.ReactNode }) => (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-0.5">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors">
            {React.cloneElement(icon as React.ReactElement, { size: 14 })}
          </div>
        )}
        <input 
          type={type} 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          placeholder={placeholder} 
          className={`w-full bg-slate-50/50 dark:bg-slate-900/30 border dark:border-slate-800 border-slate-200 dark:text-white text-slate-900 rounded-xl py-2 text-xs outline-none focus:border-indigo-500 transition-all ${icon ? 'pl-9 pr-3' : 'px-3'} ${mono ? 'font-mono font-bold uppercase' : 'font-medium'}`} 
        />
      </div>
    </div>
  );

  // ── Ledger data for detail view ─────────────
  const supLedger = useMemo(() => {
    if (!detailParty || (detailParty.type !== 'SUPPLIER' && detailParty.type !== 'BOTH')) return [];
    const sup = suppliers.find(s => s.name.toLowerCase() === detailParty.name.toLowerCase());
    return sup ? getSupplierLedger(sup.id) : [];
  }, [detailParty, suppliers, getSupplierLedger]);

  const custLedger = useMemo(() => {
    if (!detailParty || (detailParty.type !== 'CUSTOMER' && detailParty.type !== 'BOTH')) return [];
    const cust = customers.find(c => c.name.toLowerCase() === detailParty.name.toLowerCase());
    return cust ? getCustomerLedger(cust.id) : [];
  }, [detailParty, customers, getCustomerLedger]);

  const supplierLedgerTable = useDataTable<(typeof supLedger)[number], 'date' | 'amount' | 'runningBalance'>({
    data: supLedger,
    initialSortBy: 'date',
    initialSortDir: 'desc',
    initialPageSize: 10,
    pageSizeOptions: [10, 20, 50],
    sortComparators: {
      date: (a, b) => a.date.localeCompare(b.date),
      amount: (a, b) => a.amount - b.amount,
      runningBalance: (a, b) => a.runningBalance - b.runningBalance,
    },
    resetPageOn: [detailParty?.id || ''],
  });

  const customerLedgerTable = useDataTable<(typeof custLedger)[number], 'date' | 'amount' | 'runningBalance'>({
    data: custLedger,
    initialSortBy: 'date',
    initialSortDir: 'desc',
    initialPageSize: 10,
    pageSizeOptions: [10, 20, 50],
    sortComparators: {
      date: (a, b) => a.date.localeCompare(b.date),
      amount: (a, b) => a.amount - b.amount,
      runningBalance: (a, b) => a.runningBalance - b.runningBalance,
    },
    resetPageOn: [detailParty?.id || ''],
  });

  // ═══════════════════════════════════════════
  // PARTY DETAIL PAGE VIEW
  // ═══════════════════════════════════════════
  if (detailParty) {
    const p = detailParty;
    const totalDebit = [...supLedger, ...custLedger].filter(e => e.amount > 0 && e.type !== 'OPENING').reduce((s, e) => s + e.amount, 0);
    const totalCredit = [...supLedger, ...custLedger].filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);
    const outstandingBalance = p.type === 'CUSTOMER' ? (custLedger.length > 0 ? custLedger[0].runningBalance : p.balance) : (supLedger.length > 0 ? supLedger[0].runningBalance : p.balance);

    return (
      <div className="space-y-6 font-sans animate-fade-in">
        {/* Back + Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 dark:bg-slate-900 bg-white p-5 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm">
          <div className="flex items-center space-x-4">
            <button onClick={() => setDetailParty(null)} className="p-2 dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-600 rounded-xl cursor-pointer dark:hover:bg-slate-700 hover:bg-slate-200 transition-colors"><ArrowLeft className="w-5 h-5" /></button>
            <Av name={p.name} size="w-12 h-12 text-sm" />
            <div>
              <div className="flex items-center space-x-2"><h1 className="text-lg font-black dark:text-white text-slate-900">{p.name}</h1><TypeBadge type={p.type} /></div>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] dark:text-slate-400 text-slate-500">
                {p.phone && <span className="flex items-center space-x-1"><Phone className="w-3 h-3" /><span>{p.phone}</span></span>}
                {p.city && <span className="flex items-center space-x-1"><MapPin className="w-3 h-3" /><span>{p.city}{p.state ? `, ${p.state}` : ''}</span></span>}
                {p.gstin && <span className="font-mono font-bold">GSTIN: {p.gstin}</span>}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {p.type === 'CUSTOMER' && (
              <button 
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer active:scale-[0.98]"
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>Receive Payment</span>
              </button>
            )}
            <button 
              onClick={() => setShowStatement(true)}
              className="flex items-center space-x-1.5 px-4 py-2 dark:bg-slate-800 bg-white dark:text-slate-300 text-slate-700 rounded-xl text-xs font-bold border dark:border-slate-700 border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all cursor-pointer active:scale-[0.98]"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Statement</span>
            </button>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
            <button onClick={() => { openEdit(p); }} className="p-2 dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-700 rounded-xl cursor-pointer dark:hover:bg-slate-700 hover:bg-slate-200 transition-colors border dark:border-slate-700 border-slate-300 active:scale-[0.95]"><Edit3 className="w-4 h-4" /></button>
            <button onClick={() => handleDeleteParty(p)} className="p-2 dark:bg-slate-800 bg-slate-100 text-rose-600 dark:text-rose-400 rounded-xl cursor-pointer dark:hover:bg-rose-950/50 hover:bg-rose-50 transition-colors border dark:border-slate-700 border-slate-300 active:scale-[0.95]"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="dark:bg-slate-900 bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm"><div className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-1">Opening Balance</div><Bal balance={p.balance} /></div>
          <div className="dark:bg-slate-900 bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm"><div className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-1">Total Debit</div><span className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">₹{totalDebit.toLocaleString('en-IN')}</span></div>
          <div className="dark:bg-slate-900 bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm"><div className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-1">Total Credit</div><span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">₹{totalCredit.toLocaleString('en-IN')}</span></div>
          <div className="dark:bg-slate-900 bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm"><div className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-1">Current Balance</div><Bal balance={outstandingBalance} /></div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="dark:bg-slate-900 bg-white p-5 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm space-y-3">
            <div className="text-xs font-bold dark:text-white text-slate-900 uppercase tracking-wider border-b dark:border-slate-800 border-slate-200 pb-2">Contact & Identity</div>
            {[{ l: 'Phone', v: p.phone, m: true }, { l: 'Email', v: p.email }, { l: 'GSTIN', v: p.gstin, m: true }, { l: 'Code', v: p.code, m: true }].filter(r => r.v).map((r, i) => (
              <div key={i}><div className="text-[10px] font-bold uppercase dark:text-slate-500 text-slate-400">{r.l}</div><div className={`text-xs dark:text-white text-slate-900 font-semibold ${r.m ? 'font-mono' : ''}`}>{r.v}</div></div>
            ))}
          </div>
          <div className="dark:bg-slate-900 bg-white p-5 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm space-y-3">
            <div className="text-xs font-bold dark:text-white text-slate-900 uppercase tracking-wider border-b dark:border-slate-800 border-slate-200 pb-2">Address</div>
            {[{ l: 'City', v: p.city }, { l: 'State', v: p.state }, { l: 'Billing Address', v: p.billingAddress }, { l: 'Shipping Address', v: p.shippingAddress }].filter(r => r.v).map((r, i) => (
              <div key={i}><div className="text-[10px] font-bold uppercase dark:text-slate-500 text-slate-400">{r.l}</div><div className="text-xs dark:text-white text-slate-900 font-semibold">{r.v}</div></div>
            ))}
            {!p.city && !p.billingAddress && <div className="text-xs dark:text-slate-500 text-slate-400 italic">No address information</div>}
          </div>
          <div className="dark:bg-slate-900 bg-white p-5 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm space-y-3">
            <div className="text-xs font-bold dark:text-white text-slate-900 uppercase tracking-wider border-b dark:border-slate-800 border-slate-200 pb-2">Notes</div>
            {p.notes ? <div className="text-xs dark:text-slate-300 text-slate-700 italic leading-relaxed">{p.notes}</div> : <div className="text-xs dark:text-slate-500 text-slate-400 italic">No notes</div>}
          </div>
        </div>

        {(p.type === 'SUPPLIER' || p.type === 'BOTH') && supLedger.length > 0 && (
          <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2 text-xs font-bold dark:text-emerald-400 text-emerald-700 uppercase tracking-wider"><Users className="w-4 h-4" /><span>Supplier Ledger</span><span className="text-[10px] font-mono dark:bg-slate-800 bg-slate-200 dark:text-slate-400 text-slate-600 px-1.5 py-0.5 rounded ml-auto">{supLedger.length}</span></div>
            <DataTable footer={<Pagination page={supplierLedgerTable.page} totalPages={supplierLedgerTable.totalPages} totalRecords={supplierLedgerTable.totalRecords} pageSize={supplierLedgerTable.pageSize} pageSizeOptions={supplierLedgerTable.pageSizeOptions} onPageChange={supplierLedgerTable.setPage} onPageSizeChange={supplierLedgerTable.setPageSize} label="supplier ledger rows" />}>
              <table className="erp-table text-left text-xs font-sans">
                <thead>
                  <tr className="dark:bg-slate-950 bg-slate-50 dark:text-slate-400 text-slate-600 uppercase font-bold text-[10px] border-b dark:border-slate-800 border-slate-200">
                    <th className="py-3 px-4 w-28">
                      <button type="button" onClick={() => supplierLedgerTable.toggleSort('date')} className="inline-flex items-center gap-1">
                        Date <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3 w-32">Type</th>
                    <th className="py-3 px-3">Bill # / Description</th>
                    <th className="py-3 px-3 text-right text-rose-600 dark:text-rose-400">
                      <button type="button" onClick={() => supplierLedgerTable.toggleSort('amount')} className="inline-flex items-center gap-1 ml-auto">
                        Purchase Amount (Dr) <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">Payment Paid (Cr)</th>
                    <th className="py-3 px-4 text-right font-black text-emerald-700 dark:text-emerald-400">
                      <button type="button" onClick={() => supplierLedgerTable.toggleSort('runningBalance')} className="inline-flex items-center gap-1 ml-auto">
                        Running Balance <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                  {supplierLedgerTable.pageRows.map(entry => {
                    const isPurch = entry.type === 'PURCHASE_VEHICLE' || entry.type === 'PURCHASE_BILL';
                    const isPayment = entry.type === 'PAYMENT';
                    const isOpening = entry.type === 'OPENING';

                    return (
                      <tr key={entry.id} className="dark:hover:bg-slate-800/30 hover:bg-slate-50 group font-sans">
                        <td className="py-3 px-4 font-mono font-medium text-[#64748b] text-xs">{fmtDate(entry.date)}</td>
                        <td className="py-3 px-3 font-sans">
                          {isOpening && <span className="bg-[#f1f5f9] dark:bg-slate-800 text-[#475569] dark:text-slate-400 px-2.5 py-1 rounded-lg text-[10px] font-semibold font-mono uppercase">OPENING</span>}
                          {isPurch && <span className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30 px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center w-max font-mono"><ArrowUpRight className="w-3.5 h-3.5 mr-1 text-rose-600 dark:text-rose-400" /> PURCHASE</span>}
                          {isPayment && <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center w-max font-mono"><ArrowDownRight className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" /> PAYMENT PAID</span>}
                        </td>
                        <td className="py-3 px-3 max-w-[240px] font-sans">
                          <span className="font-semibold dark:text-white text-[#0f172a] block text-sm">{entry.referenceNo || entry.variety || 'Account Balance'}</span>
                          <span className="text-[11px] text-[#64748b] dark:text-slate-500 block truncate font-medium">{entry.note}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-rose-700 dark:text-rose-400 text-sm">
                          {isPurch ? `₹${entry.amount.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                          {isPayment ? `₹${Math.abs(entry.amount).toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-[rgba(16,185,129,0.06)] dark:bg-emerald-950/30 text-sm">
                          ₹{entry.runningBalance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DataTable>
          </div>
        )}

        {(p.type === 'CUSTOMER' || p.type === 'BOTH') && custLedger.length > 0 && (
          <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2 text-xs font-bold dark:text-indigo-400 text-indigo-700 uppercase tracking-wider"><UserCheck className="w-4 h-4" /><span>Customer Ledger</span><span className="text-[10px] font-mono dark:bg-slate-800 bg-slate-200 dark:text-slate-400 text-slate-600 px-1.5 py-0.5 rounded ml-auto">{custLedger.length}</span></div>
            <DataTable footer={<Pagination page={customerLedgerTable.page} totalPages={customerLedgerTable.totalPages} totalRecords={customerLedgerTable.totalRecords} pageSize={customerLedgerTable.pageSize} pageSizeOptions={customerLedgerTable.pageSizeOptions} onPageChange={customerLedgerTable.setPage} onPageSizeChange={customerLedgerTable.setPageSize} label="customer ledger rows" />}>
              <table className="erp-table text-left text-xs font-sans">
                <thead>
                  <tr className="dark:bg-slate-950 bg-slate-50 dark:text-slate-400 text-slate-600 uppercase font-bold text-[10px] border-b dark:border-slate-800 border-slate-200">
                    <th className="py-3 px-4 w-28">
                      <button type="button" onClick={() => customerLedgerTable.toggleSort('date')} className="inline-flex items-center gap-1">
                        Date <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3 w-32">Type</th>
                    <th className="py-3 px-3">Invoice # / Description</th>
                    <th className="py-3 px-3 text-right text-indigo-600 dark:text-indigo-400">
                      <button type="button" onClick={() => customerLedgerTable.toggleSort('amount')} className="inline-flex items-center gap-1 ml-auto">
                        Invoice Amount (Dr) <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400">Payment Recd (Cr)</th>
                    <th className="py-3 px-4 text-right font-black text-[#0369a1] dark:text-sky-400">
                      <button type="button" onClick={() => customerLedgerTable.toggleSort('runningBalance')} className="inline-flex items-center gap-1 ml-auto">
                        Running Balance <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                  {customerLedgerTable.pageRows.map(entry => {
                    const isInvoice = entry.type === 'INVOICE';
                    const isPayment = entry.type === 'PAYMENT';
                    const isOpening = entry.type === 'OPENING';

                    return (
                      <tr key={entry.id} className="dark:hover:bg-slate-800/30 hover:bg-slate-50 group font-sans">
                        <td className="py-3 px-4 font-mono font-medium text-[#64748b] text-xs">{fmtDate(entry.date)}</td>
                        <td className="py-3 px-3 font-sans">
                          {isOpening && <span className="bg-[#f1f5f9] dark:bg-slate-800 text-[#475569] dark:text-slate-400 px-2.5 py-1 rounded-lg text-[10px] font-semibold font-mono uppercase">OPENING</span>}
                          {isInvoice && <span className="bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30 px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center w-max font-mono"><ArrowUpRight className="w-3.5 h-3.5 mr-1 text-sky-600 dark:text-sky-400" /> BILL INVOICE</span>}
                          {isPayment && <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center w-max font-mono"><ArrowDownRight className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" /> RECD PAYMENT</span>}
                        </td>
                        <td className="py-3 px-3 max-w-[240px] font-sans">
                          <span className="font-semibold dark:text-white text-[#0f172a] block text-sm">{entry.referenceNo || 'Account Balance'}</span>
                          <span className="text-[11px] text-[#64748b] dark:text-slate-500 block truncate font-medium">{entry.note}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-sky-700 dark:text-sky-400 text-sm">
                          {isInvoice ? `₹${entry.amount.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                          {isPayment ? `₹${Math.abs(entry.amount).toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#0369a1] dark:text-sky-400 bg-[rgba(0,174,239,0.06)] dark:bg-sky-950/30 text-sm">
                          ₹{entry.runningBalance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DataTable>
          </div>
        )}

        {supLedger.length === 0 && custLedger.length === 0 && (
          <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 py-12 text-center"><Calendar className="w-10 h-10 dark:text-slate-700 text-slate-300 mx-auto mb-3" /><div className="text-sm font-bold dark:text-slate-400 text-slate-500">No transactions yet</div><p className="text-xs dark:text-slate-500 text-slate-400 mt-1">Ledger entries will appear here after purchases or sales.</p></div>
        )}

        {/* Modal for edit from detail page */}
        {showModal && renderModal()}

        {/* Payment Receipt Modal (Customer) */}
        {showPaymentModal && p.type === 'CUSTOMER' && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
            <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl max-w-lg w-full overflow-hidden p-6 space-y-6">
              <div className="flex items-center justify-between border-b dark:border-slate-800 border-slate-100 pb-4 font-sans">
                <h3 className="text-lg font-bold dark:text-white text-slate-900 flex items-center space-x-2">
                  <span>Receive Payment from Customer</span>
                </h3>
                <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleAddPayment} className="space-y-4 font-sans text-xs sm:text-sm">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 font-sans">Receiving From Buyer:</label>
                  <input type="text" readOnly value={p.name} className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 border-slate-200 rounded-xl px-4 py-2.5 font-bold text-slate-900 dark:text-white" />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 font-sans">Amount Received (₹) *</label>
                  <input type="number" required value={payAmount === 0 ? '' : payAmount} placeholder="100000" onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)} className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 border-slate-200 rounded-xl px-4 py-3 text-indigo-600 dark:text-indigo-400 font-mono font-black text-lg outline-none focus:border-indigo-500 transition-all" />
                </div>

                <div className="grid grid-cols-2 gap-4 font-sans">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 font-sans">Payment Mode</label>
                    <select value={payMode} onChange={(e) => setPayMode(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 border-slate-200 rounded-xl px-3 py-2.5 font-bold cursor-pointer outline-none focus:border-indigo-500 transition-all text-slate-900 dark:text-white">
                      <option value="UPI">UPI Transfer</option>
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 font-sans">Reference No</label>
                    <input type="text" value={payRefNo} onChange={(e) => setPayRefNo(e.target.value)} placeholder="e.g. UPI-998812" className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 border-slate-200 rounded-xl px-4 py-2.5 font-mono font-bold outline-none focus:border-indigo-500 transition-all text-slate-900 dark:text-white" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 font-sans">Receipt Note</label>
                  <input type="text" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} placeholder="Payment cleared for previous invoices..." className="w-full bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 transition-all text-slate-900 dark:text-white" />
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t dark:border-slate-800 border-slate-100">
                  <button type="button" onClick={() => setShowPaymentModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                  <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all">Save Payment Receipt</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Statement Preview */}
        <StatementPreview isOpen={showStatement} onClose={() => setShowStatement(false)} title={`${p.type === 'CUSTOMER' ? 'Customer' : 'Supplier'} Account Statement`} subtitle={`${p.name} · ${p.city}`}>
          <div className="space-y-6">
            {/* Party Info */}
            <div className="flex justify-between items-start rounded-lg border border-slate-200 overflow-hidden">
              <div className="flex-1 p-4 bg-slate-50/70">
                <div className="text-[8.5px] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">{p.type === 'BOTH' ? 'Dual Party' : p.type}</div>
                <div className="text-[15px] font-black text-slate-950">{p.name}</div>
                <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                  {p.phone && <div>Phone: {p.phone}</div>}
                  <div>City: {p.city}</div>
                </div>
              </div>
              <div className="p-4 border-l border-slate-200 bg-white text-right min-w-[140px] flex flex-col justify-center">
                <div className="text-[8.5px] font-bold uppercase text-slate-400">Outstanding</div>
                <div className={`text-[16px] font-black font-mono mt-0.5 ${outstandingBalance >= 0 ? 'text-indigo-700' : 'text-emerald-700'}`}>₹{outstandingBalance.toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* Combined Ledger Table for Print */}
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
                {[...supLedger, ...custLedger].sort((a,b) => b.date.localeCompare(a.date)).map((entry, idx) => (
                  <tr key={entry.id} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600">{fmtDate(entry.date)}</td>
                    <td className="py-2.5 px-3 text-[10px] font-semibold text-slate-700 uppercase">{entry.type.replace('_', ' ')}</td>
                    <td className="py-2.5 px-3 text-[10px] text-slate-600 truncate max-w-[150px]">{entry.referenceNo || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[10.5px] text-rose-700">{entry.amount > 0 ? `₹${entry.amount.toLocaleString('en-IN')}` : ''}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[10.5px] text-emerald-700">{entry.amount < 0 ? `₹${Math.abs(entry.amount).toLocaleString('en-IN')}` : ''}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-[10.5px] text-slate-900">₹{entry.runningBalance.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </StatementPreview>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // MODAL RENDER (shared)
  // ═══════════════════════════════════════════
  function renderModal() {
    return (
      <div className="fixed inset-0 z-[99999] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl overflow-hidden animate-slide-up flex flex-col">
          
          {/* Header */}
          <div className="px-6 py-4 border-b dark:border-slate-800 border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-base font-bold dark:text-white text-slate-900">
                {isEditMode ? 'Edit Party Profile' : 'Create New Party'}
              </h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                {isEditMode ? `Update details for ${editingParty?.name}` : 'Register a new buyer or supplier'}
              </p>
            </div>
            <button onClick={closeModal} className="p-1.5 dark:text-slate-400 text-slate-500 hover:text-rose-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content - Compact View */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="space-y-6">
              
              {/* SECTION: BASIC INFO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Inp label="Party Name" value={form.name} onChange={v => f('name', v)} placeholder="e.g. Ramesh Agro Traders" required icon={<Building2 />} />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block ml-0.5">Party Type *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([['CUSTOMER', 'Buyer', <UserCheck key="c" className="w-4 h-4" />], ['SUPPLIER', 'Supplier', <Users key="s" className="w-4 h-4" />], ['BOTH', 'Both', <Users key="b" className="w-4 h-4" />]] as [PartyType, string, React.ReactNode][]).map(([val, lbl, icon]) => (
                      <button 
                        key={val} 
                        type="button"
                        onClick={() => f('type', val)} 
                        className={`flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold border-2 cursor-pointer transition-all ${
                          form.type === val 
                            ? 'border-indigo-500 dark:bg-indigo-500/10 bg-indigo-50 text-indigo-700 dark:text-indigo-400 shadow-sm' 
                            : 'dark:border-slate-800 border-slate-100 dark:text-slate-500 text-slate-500'
                        }`}
                      >
                        {icon}
                        <span>{lbl}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Inp label="Phone" value={form.phone} onChange={v => f('phone', v)} placeholder="+91 99887 77665" icon={<Phone />} />
                <Inp label="GSTIN" value={form.gstin} onChange={v => f('gstin', v.toUpperCase())} placeholder="24AABCT1234A1ZH" mono />
                <div className="sm:col-span-2">
                  <Inp label="Email Address" value={form.email} onChange={v => f('email', v)} placeholder="contact@business.com" icon={<Mail />} />
                </div>
              </div>

              {/* SECTION: ADDRESS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t dark:border-slate-800 border-slate-50">
                <div className="sm:col-span-2">
                  <Inp label="Address" value={form.billingAddress} onChange={v => f('billingAddress', v)} placeholder="Street, Area, Building..." icon={<MapPin />} />
                </div>
                <Inp label="City" value={form.city} onChange={v => f('city', v)} placeholder="City" />
                <Inp label="State" value={form.state} onChange={v => f('state', v)} placeholder="State" />
              </div>

              {/* SECTION: FINANCIAL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t dark:border-slate-800 border-slate-50">
                <Inp label="Opening Balance" type="number" value={form.balance} onChange={v => f('balance', parseFloat(v) || 0)} placeholder="0.00" mono icon={<IndianRupee />} />
                <Inp label="Credit Limit" type="number" value={form.creditLimit} onChange={v => f('creditLimit', parseFloat(v) || 0)} placeholder="No limit" mono icon={<TrendingUp />} />
                
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 block ml-0.5">Balance Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['DEBIT', 'CREDIT'] as const).map(t => (
                      <button 
                        key={t} 
                        type="button"
                        onClick={() => f('balanceType', t)} 
                        className={`py-2 rounded-xl text-xs font-bold border-2 cursor-pointer transition-all ${
                          form.balanceType === t 
                            ? 'border-indigo-500 dark:bg-indigo-500/10 bg-indigo-50 text-indigo-700 dark:text-indigo-400 shadow-sm' 
                            : 'dark:border-slate-800 border-slate-100 dark:text-slate-500 text-slate-500'
                        }`}
                      >
                        {t === 'DEBIT' ? 'Debit (Customer Will Pay)' : 'Credit (We Will Pay)'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION: NOTES */}
              <div className="pt-4 border-t dark:border-slate-800 border-slate-50">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-0.5">Internal Remarks</label>
                  <textarea 
                    value={form.notes} 
                    onChange={e => f('notes', e.target.value)} 
                    rows={2} 
                    placeholder="Additional instructions..." 
                    className="w-full bg-slate-50/50 dark:bg-slate-900/30 border dark:border-slate-800 border-slate-200 dark:text-white text-slate-900 rounded-xl p-3 text-xs font-medium outline-none focus:border-indigo-500 transition-all resize-none shadow-inner" 
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t dark:border-slate-800 border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-slate-50/30 dark:bg-slate-900/30">
            <button 
              onClick={closeModal} 
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={!formValid} 
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              {isEditMode ? 'Update Party' : 'Create Party'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // MAIN LIST/GRID VIEW
  // ═══════════════════════════════════════════
  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 dark:bg-slate-900 bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm">
        <div><h1 className="text-xl font-black dark:text-white text-slate-900 tracking-tight flex items-center space-x-2.5"><Users className="w-6 h-6 text-violet-500" /><span>PARTIES MANAGEMENT</span></h1><p className="text-xs dark:text-slate-400 text-slate-500 mt-0.5">Manage customers, suppliers & dual parties</p></div>
        <button onClick={openCreate} className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20 cursor-pointer transition-all"><Plus className="w-4 h-4 stroke-[2.5]" /><span>New Party</span></button>
      </div>

      {/* Controls */}
      <div className="dark:bg-slate-900 bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm space-y-4">
        <div className="relative"><Search className="w-4 h-4 dark:text-slate-400 text-slate-500 absolute left-3 top-3" /><input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, email, GSTIN, city..." className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 pl-10 pr-10 py-2.5 rounded-xl text-xs outline-none focus:border-indigo-500 transition-all" />{search && <button onClick={() => setSearch('')} className="absolute right-3 top-2.5 dark:text-slate-500 text-slate-400 cursor-pointer hover:text-rose-500"><X className="w-4 h-4" /></button>}</div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">{([['ALL', 'All'], ['CUSTOMER', 'Customers'], ['SUPPLIER', 'Suppliers'], ['BOTH', 'Dual']] as [FilterTab, string][]).map(([key, label]) => (<button key={key} onClick={() => setFilterTab(key)} className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all border ${filterTab === key ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'dark:bg-slate-950 bg-slate-50 dark:text-slate-300 text-slate-600 dark:border-slate-800 border-slate-200'}`}><span>{label}</span><span className={`text-[9px] font-mono px-1 py-0.5 rounded ${filterTab === key ? 'bg-white/20' : 'dark:bg-slate-800 bg-slate-200'}`}>{counts[key]}</span></button>))}</div>
          <div className="flex items-center space-x-2"><div className="relative"><select value={partiesTable.sortBy} onChange={e => partiesTable.toggleSort(e.target.value as SortKey)} className="dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-slate-300 text-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold outline-none cursor-pointer pr-7 appearance-none"><option value="name">Name</option><option value="city">City</option><option value="balance">Balance</option></select><ArrowUpDown className="w-3 h-3 dark:text-slate-500 text-slate-400 absolute right-2 top-2 pointer-events-none" /></div><div className="flex items-center dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 rounded-lg p-0.5"><button onClick={() => setViewMode('GRID')} className={`p-1.5 rounded-md cursor-pointer transition-colors ${viewMode === 'GRID' ? 'bg-indigo-600 text-white shadow-sm' : 'dark:text-slate-400 text-slate-500'}`}><LayoutGrid className="w-3.5 h-3.5" /></button><button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded-md cursor-pointer transition-colors ${viewMode === 'LIST' ? 'bg-indigo-600 text-white shadow-sm' : 'dark:text-slate-400 text-slate-500'}`}><List className="w-3.5 h-3.5" /></button></div></div>
        </div>
      </div>

      {/* Empty */}
      {partiesTable.totalRecords === 0 && (<div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 py-16 text-center animate-fade-in"><Users className="w-12 h-12 dark:text-slate-700 text-slate-300 mx-auto mb-4" /><div className="text-sm font-bold dark:text-slate-400 text-slate-500">{search ? `No parties matching "${search}"` : 'No parties yet'}</div><p className="text-xs dark:text-slate-500 text-slate-400 mt-1">{search ? 'Try a different search' : 'Create your first party'}</p>{!search && <button onClick={openCreate} className="mt-4 inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl font-bold text-xs cursor-pointer"><Plus className="w-3.5 h-3.5" /><span>Add First Party</span></button>}</div>)}

      {/* GRID */}
      {partiesTable.totalRecords > 0 && viewMode === 'GRID' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {partiesTable.pageRows.map(p => (
            <div key={p.id + p.type} className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm hover:shadow-md dark:hover:border-slate-700 hover:border-slate-300 transition-all group overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3"><Av name={p.name} /><div className="min-w-0"><div className="text-sm font-bold dark:text-white text-slate-900 truncate">{p.name}</div><div className="flex items-center space-x-1.5 mt-0.5"><TypeBadge type={p.type} />{p.gstin && <span className="text-[9px] font-mono dark:text-slate-500 text-slate-400">{p.gstin}</span>}</div></div></div>
                  <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => openEdit(p)} className="p-1.5 dark:text-slate-500 text-slate-400 hover:text-indigo-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDeleteParty(p)} className="p-1.5 dark:text-slate-500 text-slate-400 hover:text-rose-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-[11px] dark:text-slate-400 text-slate-500">
                  {p.phone && <div className="flex items-center space-x-1.5"><Phone className="w-3 h-3 shrink-0" /><span>{p.phone}</span></div>}
                  {p.email && <div className="flex items-center space-x-1.5"><Mail className="w-3 h-3 shrink-0" /><span className="truncate">{p.email}</span></div>}
                  {p.city && <div className="flex items-center space-x-1.5"><MapPin className="w-3 h-3 shrink-0" /><span>{p.city}{p.state ? `, ${p.state}` : ''}</span></div>}
                </div>
                <div className="mt-3 pt-3 border-t dark:border-slate-800 border-slate-100 flex items-center justify-between"><Bal balance={p.balance} />{p.creditLimit > 0 && <span className="text-[10px] dark:text-slate-500 text-slate-400 font-mono">Limit: ₹{p.creditLimit.toLocaleString()}</span>}</div>
              </div>
              <div className="px-4 py-2 border-t dark:border-slate-800 border-slate-100 dark:bg-slate-950/50 bg-slate-50 flex items-center justify-between">
                {p.city ? <span className="text-[10px] dark:text-slate-500 text-slate-400 flex items-center space-x-1"><MapPin className="w-3 h-3" /><span>{p.city}</span></span> : <span />}
                <button onClick={() => setDetailParty(p)} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline">View Details →</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LIST */}
      {partiesTable.totalRecords > 0 && viewMode === 'LIST' && (
        <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto"><table className="erp-table w-full text-left text-xs">
            <thead><tr className="dark:bg-slate-950 bg-slate-50 dark:text-slate-400 text-slate-600 uppercase font-bold text-[10px] border-b dark:border-slate-800 border-slate-200">
              <th className="py-3 px-4">Party</th><th className="py-3 px-3">Type</th><th className="py-3 px-3">Contact</th><th className="py-3 px-3 text-right">Balance</th><th className="py-3 px-4 text-center w-28">Actions</th>
            </tr></thead>
            <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
              {partiesTable.pageRows.map(p => (
                <tr key={p.id + p.type} className="dark:hover:bg-slate-800/40 hover:bg-slate-50 transition-colors group">
                  <td className="py-3.5 px-4"><div className="flex items-center space-x-3"><Av name={p.name} size="w-8 h-8 text-[10px]" /><div><div className="text-sm font-bold dark:text-white text-slate-900">{p.name}</div>{p.gstin && <div className="text-[10px] font-mono dark:text-slate-500 text-slate-400">{p.gstin}</div>}</div></div></td>
                  <td className="py-3.5 px-3"><TypeBadge type={p.type} /></td>
                  <td className="py-3.5 px-3 text-[11px] dark:text-slate-400 text-slate-500 space-y-0.5">{p.phone && <div>{p.phone}</div>}{p.city && <div>{p.city}</div>}</td>
                  <td className="py-3.5 px-3 text-right"><Bal balance={p.balance} /></td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <button onClick={() => setDetailParty(p)} className="p-1.5 dark:text-slate-500 text-slate-400 hover:text-indigo-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors" title="View Details"><Building2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => openEdit(p)} className="p-1.5 dark:text-slate-500 text-slate-400 hover:text-cyan-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteParty(p)} className="p-1.5 dark:text-slate-500 text-slate-400 hover:text-rose-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      {partiesTable.totalRecords > 0 && (
        <Pagination
          page={partiesTable.page}
          totalPages={partiesTable.totalPages}
          totalRecords={partiesTable.totalRecords}
          pageSize={partiesTable.pageSize}
          pageSizeOptions={partiesTable.pageSizeOptions}
          onPageChange={partiesTable.setPage}
          onPageSizeChange={partiesTable.setPageSize}
          label="parties"
        />
      )}

      {/* Modal */}
      {showModal && renderModal()}


    </div>
  );
};
