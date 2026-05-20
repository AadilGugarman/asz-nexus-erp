import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from './ui/Toast';
import { useConfirmDialog } from './ui/ConfirmDialog';
import {
  Users, UserCheck, Search, Plus, LayoutGrid, List,
  Phone, Mail, MapPin, TrendingUp, TrendingDown, X, Edit3,
  Trash2, Building2, DollarSign, StickyNote,
  ArrowUpDown, ArrowLeft, ArrowUpRight, ArrowDownRight, Calendar
} from 'lucide-react';

type PartyType = 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
type ViewMode = 'GRID' | 'LIST';
type FilterTab = 'ALL' | 'CUSTOMER' | 'SUPPLIER' | 'BOTH';
type SortKey = 'name' | 'city' | 'balance';
type FormSection = 'BASIC' | 'ADDRESS' | 'FINANCIAL' | 'NOTES';

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
  const { suppliers, customers, addSupplier, updateSupplier, deleteSupplier, addCustomer, updateCustomer, deleteCustomer, getSupplierLedger, getCustomerLedger } = useApp();
  const toast = useToast();
  const dialog = useConfirmDialog();

  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [viewMode, setViewMode] = useState<ViewMode>('GRID');
  const [showModal, setShowModal] = useState(false);
  const [editingParty, setEditingParty] = useState<UnifiedParty | null>(null);
  const [formSection, setFormSection] = useState<FormSection>('BASIC');

  const [form, setForm] = useState<UnifiedParty>(emptyParty());
  const [detailParty, setDetailParty] = useState<UnifiedParty | null>(null);
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
    list.sort((a, b) => { if (sortKey === 'name') return a.name.localeCompare(b.name); if (sortKey === 'city') return (a.city || '').localeCompare(b.city || ''); if (sortKey === 'balance') return b.balance - a.balance; return 0; });
    return list;
  }, [allParties, filterTab, search, sortKey]);

  const counts = useMemo(() => ({ ALL: allParties.length, CUSTOMER: allParties.filter(p => p.type === 'CUSTOMER').length, SUPPLIER: allParties.filter(p => p.type === 'SUPPLIER').length, BOTH: allParties.filter(p => p.type === 'BOTH').length }), [allParties]);

  // ── Actions ─────────────────────────────────
  const openCreate = () => { setEditingParty(null); setForm(emptyParty()); setFormSection('BASIC'); setShowModal(true); };
  const openEdit = (p: UnifiedParty) => { setEditingParty(p); setForm({ ...p }); setFormSection('BASIC'); setShowModal(true); };
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
    <div><label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1">{label}{required && <span className="text-rose-500 ml-0.5">*</span>}</label><div className="relative">{icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-400">{icon}</div>}<input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl py-2.5 text-xs outline-none focus:border-indigo-500 transition-all ${icon ? 'pl-10 pr-4' : 'px-4'} ${mono ? 'font-mono font-bold uppercase' : 'font-medium'}`} /></div></div>
  );
  const formSections: { id: FormSection; label: string; icon: React.ReactNode }[] = [
    { id: 'BASIC', label: 'Basic Info', icon: <Building2 className="w-4 h-4" /> },
    { id: 'ADDRESS', label: 'Address', icon: <MapPin className="w-4 h-4" /> },
    { id: 'FINANCIAL', label: 'Financial', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'NOTES', label: 'Notes', icon: <StickyNote className="w-4 h-4" /> },
  ];

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

  // ═══════════════════════════════════════════
  // PARTY DETAIL PAGE VIEW
  // ═══════════════════════════════════════════
  if (detailParty) {
    const p = detailParty;
    const totalDebit = [...supLedger, ...custLedger].filter(e => e.amount > 0 && e.type !== 'OPENING').reduce((s, e) => s + e.amount, 0);
    const totalCredit = [...supLedger, ...custLedger].filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);

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
            <button onClick={() => { openEdit(p); }} className="flex items-center space-x-1.5 px-4 py-2 dark:bg-slate-800 bg-slate-100 dark:text-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer dark:hover:bg-slate-700 hover:bg-slate-200 transition-colors border dark:border-slate-700 border-slate-300"><Edit3 className="w-3.5 h-3.5" /><span>Edit</span></button>
            <button onClick={() => handleDeleteParty(p)} className="flex items-center space-x-1.5 px-4 py-2 dark:bg-slate-800 bg-slate-100 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold cursor-pointer dark:hover:bg-rose-950/50 hover:bg-rose-50 transition-colors border dark:border-slate-700 border-slate-300"><Trash2 className="w-3.5 h-3.5" /><span>Delete</span></button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="dark:bg-slate-900 bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm"><div className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-1">Opening Balance</div><Bal balance={p.balance} /></div>
          <div className="dark:bg-slate-900 bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm"><div className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-1">Total Debit</div><span className="font-mono font-bold text-sm text-rose-600 dark:text-rose-400">₹{totalDebit.toLocaleString('en-IN')}</span></div>
          <div className="dark:bg-slate-900 bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm"><div className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-1">Total Credit</div><span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">₹{totalCredit.toLocaleString('en-IN')}</span></div>
          <div className="dark:bg-slate-900 bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm"><div className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500 mb-1">Current Balance</div><Bal balance={([...supLedger, ...custLedger].length > 0 ? [...supLedger, ...custLedger][0].runningBalance : p.balance)} /></div>
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

        {/* Ledger Tables */}
        {(p.type === 'SUPPLIER' || p.type === 'BOTH') && supLedger.length > 0 && (
          <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2 text-xs font-bold dark:text-emerald-400 text-emerald-700 uppercase tracking-wider"><Users className="w-4 h-4" /><span>Supplier Ledger</span><span className="text-[10px] font-mono dark:bg-slate-800 bg-slate-200 dark:text-slate-400 text-slate-600 px-1.5 py-0.5 rounded ml-auto">{supLedger.length}</span></div>
            <div className="overflow-x-auto"><table className="w-full text-left text-xs">
              <thead><tr className="dark:bg-slate-950/50 bg-slate-100 dark:text-slate-400 text-slate-600 uppercase font-bold text-[10px] border-b dark:border-slate-800 border-slate-200">
                <th className="py-2.5 px-4">Date</th><th className="py-2.5 px-3">Type</th><th className="py-2.5 px-3">Reference</th><th className="py-2.5 px-3 text-right">Debit</th><th className="py-2.5 px-3 text-right">Credit</th><th className="py-2.5 px-4 text-right font-black">Balance</th>
              </tr></thead>
              <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                {supLedger.map(e => {
                  const isPurch = e.type === 'PURCHASE_VEHICLE' || e.type === 'PURCHASE_BILL';
                  return (<tr key={e.id} className="dark:hover:bg-slate-800/30 hover:bg-slate-50 font-sans">
                    <td className="py-2.5 px-4 font-mono text-xs dark:text-slate-300 text-slate-700">{e.date}</td>
                    <td className="py-2.5 px-3">{isPurch ? <span className="text-[9px] font-bold text-rose-500 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded flex items-center w-max"><ArrowUpRight className="w-3 h-3 mr-0.5" />Purchase</span> : e.type === 'PAYMENT' ? <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center w-max"><ArrowDownRight className="w-3 h-3 mr-0.5" />Payment</span> : <span className="text-[9px] font-bold dark:text-slate-400 text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Opening</span>}</td>
                    <td className="py-2.5 px-3 dark:text-slate-300 text-slate-700 font-semibold truncate max-w-[150px]">{e.referenceNo || e.variety || e.note || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">{e.amount > 0 ? `₹${e.amount.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{e.amount < 0 ? `₹${Math.abs(e.amount).toLocaleString('en-IN')}` : '—'}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-black dark:text-white text-slate-900">₹{e.runningBalance.toLocaleString('en-IN')}</td>
                  </tr>);
                })}
              </tbody>
            </table></div>
          </div>
        )}

        {(p.type === 'CUSTOMER' || p.type === 'BOTH') && custLedger.length > 0 && (
          <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2 text-xs font-bold dark:text-indigo-400 text-indigo-700 uppercase tracking-wider"><UserCheck className="w-4 h-4" /><span>Customer Ledger</span><span className="text-[10px] font-mono dark:bg-slate-800 bg-slate-200 dark:text-slate-400 text-slate-600 px-1.5 py-0.5 rounded ml-auto">{custLedger.length}</span></div>
            <div className="overflow-x-auto"><table className="w-full text-left text-xs">
              <thead><tr className="dark:bg-slate-950/50 bg-slate-100 dark:text-slate-400 text-slate-600 uppercase font-bold text-[10px] border-b dark:border-slate-800 border-slate-200">
                <th className="py-2.5 px-4">Date</th><th className="py-2.5 px-3">Type</th><th className="py-2.5 px-3">Reference</th><th className="py-2.5 px-3 text-right">Debit</th><th className="py-2.5 px-3 text-right">Credit</th><th className="py-2.5 px-4 text-right font-black">Balance</th>
              </tr></thead>
              <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                {custLedger.map(e => (
                  <tr key={e.id} className="dark:hover:bg-slate-800/30 hover:bg-slate-50 font-sans">
                    <td className="py-2.5 px-4 font-mono text-xs dark:text-slate-300 text-slate-700">{e.date}</td>
                    <td className="py-2.5 px-3">{e.type === 'INVOICE' ? <span className="text-[9px] font-bold text-indigo-500 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded flex items-center w-max"><ArrowUpRight className="w-3 h-3 mr-0.5" />Invoice</span> : e.type === 'PAYMENT' ? <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center w-max"><ArrowDownRight className="w-3 h-3 mr-0.5" />Payment</span> : <span className="text-[9px] font-bold dark:text-slate-400 text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">Opening</span>}</td>
                    <td className="py-2.5 px-3 dark:text-slate-300 text-slate-700 font-semibold truncate max-w-[150px]">{e.referenceNo || e.note || '—'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">{e.amount > 0 ? `₹${e.amount.toLocaleString('en-IN')}` : '—'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{e.amount < 0 ? `₹${Math.abs(e.amount).toLocaleString('en-IN')}` : '—'}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-black dark:text-white text-slate-900">₹{e.runningBalance.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}

        {supLedger.length === 0 && custLedger.length === 0 && (
          <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 py-12 text-center"><Calendar className="w-10 h-10 dark:text-slate-700 text-slate-300 mx-auto mb-3" /><div className="text-sm font-bold dark:text-slate-400 text-slate-500">No transactions yet</div><p className="text-xs dark:text-slate-500 text-slate-400 mt-1">Ledger entries will appear here after purchases or sales.</p></div>
        )}

        {/* Modal for edit from detail page */}
        {showModal && renderModal()}
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // MODAL RENDER (shared)
  // ═══════════════════════════════════════════
  function renderModal() {
    return (
      <div className="fixed inset-0 z-[99999] overflow-y-auto bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-10 animate-fade-in">
        <div className="dark:bg-slate-900 bg-white border dark:border-slate-800 border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-slide-up">
          <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-3"><div className={`p-2 rounded-lg ${isEditMode ? 'bg-cyan-500/10 text-cyan-500' : 'bg-indigo-500/10 text-indigo-500'}`}><Users className="w-5 h-5" /></div><div><h3 className="text-sm font-bold dark:text-white text-slate-900">{isEditMode ? 'Edit Party' : 'Create Party'}</h3><p className="text-[10px] dark:text-slate-400 text-slate-500">{isEditMode ? `Editing ${editingParty?.name}` : 'Add a new customer or supplier'}</p></div></div>
            <button onClick={closeModal} className="p-1.5 dark:text-slate-400 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex">
            <div className="hidden sm:block w-44 shrink-0 border-r dark:border-slate-800 border-slate-200 dark:bg-slate-950/50 bg-slate-50 py-3 px-2">
              {formSections.map(s => (<button key={s.id} onClick={() => setFormSection(s.id)} className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all mb-0.5 ${formSection === s.id ? 'bg-indigo-600 text-white shadow-sm' : 'dark:text-slate-400 text-slate-600 dark:hover:bg-slate-800 hover:bg-slate-100'}`}>{s.icon}<span>{s.label}</span></button>))}
            </div>
            <div className="sm:hidden flex border-b dark:border-slate-800 border-slate-200 overflow-x-auto px-2 pt-2 w-full shrink-0">
              {formSections.map(s => (<button key={s.id} onClick={() => setFormSection(s.id)} className={`flex items-center space-x-1 px-3 py-2 text-[11px] font-bold whitespace-nowrap cursor-pointer border-b-2 transition-all ${formSection === s.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent dark:text-slate-400 text-slate-500'}`}>{s.icon}<span>{s.label}</span></button>))}
            </div>
          </div>
          <div className="p-6 space-y-4 min-h-[280px]">
            {formSection === 'BASIC' && (<div className="space-y-4 animate-fade-in"><Inp label="Party Name" value={form.name} onChange={v => f('name', v)} placeholder="e.g. Ramesh Agro Traders" required icon={<Building2 className="w-4 h-4" />} /><div><label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1.5">Party Type <span className="text-rose-500">*</span></label><div className="grid grid-cols-3 gap-2">{([['CUSTOMER', 'Customer', <UserCheck key="c" className="w-4 h-4" />], ['SUPPLIER', 'Supplier', <Users key="s" className="w-4 h-4" />], ['BOTH', 'Both', <Users key="b" className="w-4 h-4" />]] as [PartyType, string, React.ReactNode][]).map(([val, lbl, icon]) => (<button key={val} onClick={() => f('type', val)} className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold border-2 cursor-pointer transition-all ${form.type === val ? 'border-indigo-500 dark:bg-indigo-500/10 bg-indigo-50 text-indigo-700 dark:text-indigo-400 shadow-md' : 'dark:border-slate-800 border-slate-200 dark:text-slate-400 text-slate-500'}`}>{icon}<span>{lbl}</span></button>))}</div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Inp label="GSTIN" value={form.gstin} onChange={v => f('gstin', v.toUpperCase())} placeholder="24AABCT1234A1ZH" mono /><Inp label="Phone" value={form.phone} onChange={v => f('phone', v)} placeholder="+91 99887 77665" icon={<Phone className="w-4 h-4" />} /></div><Inp label="Email" value={form.email} onChange={v => f('email', v)} placeholder="accounts@company.in" icon={<Mail className="w-4 h-4" />} /></div>)}
            {formSection === 'ADDRESS' && (<div className="space-y-4 animate-fade-in"><Inp label="Billing Address" value={form.billingAddress} onChange={v => f('billingAddress', v)} placeholder="Shop 102, APMC Yard..." icon={<MapPin className="w-4 h-4" />} /><Inp label="Shipping Address" value={form.shippingAddress} onChange={v => f('shippingAddress', v)} placeholder="Same as billing..." icon={<MapPin className="w-4 h-4" />} /><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Inp label="City" value={form.city} onChange={v => f('city', v)} placeholder="Surat" /><Inp label="State" value={form.state} onChange={v => f('state', v)} placeholder="Gujarat" /></div></div>)}
            {formSection === 'FINANCIAL' && (<div className="space-y-4 animate-fade-in"><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Inp label="Opening Balance (₹)" type="number" value={form.balance} onChange={v => f('balance', parseFloat(v) || 0)} placeholder="0" mono icon={<DollarSign className="w-4 h-4" />} /><div><label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1">Balance Type</label><div className="grid grid-cols-2 gap-2">{(['DEBIT', 'CREDIT'] as const).map(t => (<button key={t} onClick={() => f('balanceType', t)} className={`py-2.5 rounded-xl text-xs font-bold border-2 cursor-pointer transition-all ${form.balanceType === t ? 'border-indigo-500 dark:bg-indigo-500/10 bg-indigo-50 text-indigo-700 dark:text-indigo-400' : 'dark:border-slate-800 border-slate-200 dark:text-slate-400 text-slate-500'}`}>{t === 'DEBIT' ? 'Debit (They owe)' : 'Credit (We owe)'}</button>))}</div></div></div><Inp label="Credit Limit (₹)" type="number" value={form.creditLimit} onChange={v => f('creditLimit', parseFloat(v) || 0)} placeholder="0" mono icon={<DollarSign className="w-4 h-4" />} /></div>)}
            {formSection === 'NOTES' && (<div className="space-y-4 animate-fade-in"><div><label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1">Internal Notes</label><textarea value={form.notes} onChange={e => f('notes', e.target.value)} rows={5} placeholder="Payment terms, delivery preferences..." className="w-full dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-white text-slate-900 rounded-xl p-3 text-xs outline-none focus:border-indigo-500 resize-none transition-all" /></div></div>)}
          </div>
          <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-t dark:border-slate-800 border-slate-200 flex items-center justify-between">
            <button onClick={closeModal} className="px-4 py-2 dark:bg-slate-800 bg-slate-200 dark:text-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Cancel</button>
            <button onClick={handleSave} disabled={!formValid} className={`flex items-center space-x-1.5 px-6 py-2.5 rounded-xl text-xs font-black shadow-lg cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isEditMode ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-cyan-500/20' : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-indigo-500/20'}`}><span>{isEditMode ? 'Update Party' : 'Create Party'}</span></button>
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
          <div className="flex items-center space-x-2"><div className="relative"><select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 dark:text-slate-300 text-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold outline-none cursor-pointer pr-7 appearance-none"><option value="name">Name</option><option value="city">City</option><option value="balance">Balance</option></select><ArrowUpDown className="w-3 h-3 dark:text-slate-500 text-slate-400 absolute right-2 top-2 pointer-events-none" /></div><div className="flex items-center dark:bg-slate-950 bg-slate-50 border dark:border-slate-700/80 border-slate-300 rounded-lg p-0.5"><button onClick={() => setViewMode('GRID')} className={`p-1.5 rounded-md cursor-pointer transition-colors ${viewMode === 'GRID' ? 'bg-indigo-600 text-white shadow-sm' : 'dark:text-slate-400 text-slate-500'}`}><LayoutGrid className="w-3.5 h-3.5" /></button><button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded-md cursor-pointer transition-colors ${viewMode === 'LIST' ? 'bg-indigo-600 text-white shadow-sm' : 'dark:text-slate-400 text-slate-500'}`}><List className="w-3.5 h-3.5" /></button></div></div>
        </div>
      </div>

      {/* Empty */}
      {filtered.length === 0 && (<div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 py-16 text-center animate-fade-in"><Users className="w-12 h-12 dark:text-slate-700 text-slate-300 mx-auto mb-4" /><div className="text-sm font-bold dark:text-slate-400 text-slate-500">{search ? `No parties matching "${search}"` : 'No parties yet'}</div><p className="text-xs dark:text-slate-500 text-slate-400 mt-1">{search ? 'Try a different search' : 'Create your first party'}</p>{!search && <button onClick={openCreate} className="mt-4 inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl font-bold text-xs cursor-pointer"><Plus className="w-3.5 h-3.5" /><span>Add First Party</span></button>}</div>)}

      {/* GRID */}
      {filtered.length > 0 && viewMode === 'GRID' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {filtered.map(p => (
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
      {filtered.length > 0 && viewMode === 'LIST' && (
        <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden animate-fade-in">
          <div className="overflow-x-auto"><table className="w-full text-left text-xs">
            <thead><tr className="dark:bg-slate-950 bg-slate-50 dark:text-slate-400 text-slate-600 uppercase font-bold text-[10px] border-b dark:border-slate-800 border-slate-200">
              <th className="py-3 px-4">Party</th><th className="py-3 px-3">Type</th><th className="py-3 px-3">Contact</th><th className="py-3 px-3 text-right">Balance</th><th className="py-3 px-4 text-center w-28">Actions</th>
            </tr></thead>
            <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
              {filtered.map(p => (
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

      {/* Modal */}
      {showModal && renderModal()}


    </div>
  );
};
