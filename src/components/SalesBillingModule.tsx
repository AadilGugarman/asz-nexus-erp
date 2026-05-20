import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Invoice, InvoiceItem } from '../types';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { ShoppingCart, Plus, Save, Search, Eye, Trash2, FileText, Calendar, Copy, Calculator, ArrowUpDown } from 'lucide-react';
import { Combobox } from './ui/Combobox';
import { useToast } from './ui/Toast';
import { useConfirmDialog } from './ui/ConfirmDialog';
import { getNextUniqueInvoiceNumber } from '../utils/invoice-number';
import { useAppTranslation } from '@/hooks';
import { useDataTable } from '../hooks/useDataTable';
import { DataTable, Pagination } from './ui/table';

export const SalesBillingModule: React.FC = () => {
  const { customers, fruits, invoices, saveInvoice, deleteInvoice, addFruit, addFruitVariety, settings, updateSettings } = useApp();
  const { t } = useAppTranslation('billing');
  const toast = useToast();
  const dialog = useConfirmDialog();

  const [activeSubTab, setActiveSubTab] = useState<'NEW_INVOICE' | 'LIST'>('NEW_INVOICE');
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [notes, setNotes] = useState('Standard market credit');

  const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId) || customers[0], [selectedCustomerId, customers]);

  const [hamaliInput, setHamaliInput] = useState<number>(0);
  const [discountInput, setDiscountInput] = useState<number>(0);
  const [showAdvancedDeductions, setShowAdvancedDeductions] = useState<boolean>(true);
  const [paidAmountInput, setPaidAmountInput] = useState<number>(0);

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: `item-${Date.now()}-1`, fruit: fruits[0]?.name || 'Mango', lotVariety: fruits[0]?.varieties[0] || 'Kesar', caret: 10, weight: 200, rate: 90, amount: 18000 }
  ]);

  useEffect(() => {
    if (!settings.invoice.autoInvoiceNo) {
      if (!invoiceNo.trim()) {
        const preview = getNextUniqueInvoiceNumber(settings.invoice, invoices, date, settings.invoice.salesNextNo || 1001);
        setInvoiceNo(preview.invoiceNo);
      }
      return;
    }

    const next = getNextUniqueInvoiceNumber(settings.invoice, invoices, date, settings.invoice.salesNextNo || 1001);
    setInvoiceNo(next.invoiceNo);
  }, [settings.invoice, invoices, date]);

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items]; const item = { ...updated[index] };
    if (field === 'fruit') { item.fruit = value; const fObj = fruits.find(f => f.name === value); item.lotVariety = fObj ? fObj.varieties[0] || 'Standard' : 'Standard'; }
    else if (field === 'caret' || field === 'weight' || field === 'rate') { (item as any)[field] = value; const w = field === 'weight' ? parseFloat(value) || 0 : parseFloat(String(item.weight)) || 0; const r = field === 'rate' ? parseFloat(value) || 0 : parseFloat(String(item.rate)) || 0; item.amount = Math.round(w * r); }
    else { (item as any)[field] = value; }
    updated[index] = item; setItems(updated);
  };

  const addItemRow = () => { setItems(prev => [...prev, { id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, fruit: fruits[0]?.name || 'Mango', lotVariety: fruits[0]?.varieties[0] || 'Kesar', caret: 0, weight: 0, rate: 0, amount: 0 }]); };
  const duplicateItemRow = (i: number) => { const s = items[i]; if (!s) return; const d: InvoiceItem = { ...s, id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` }; const u = [...items]; u.splice(i + 1, 0, d); setItems(u); };
  const removeItemRow = (i: number) => { if (items.length <= 1) return; setItems(items.filter((_, idx) => idx !== i)); };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, rowIndex: number, colIndex: number) => {
    if (e.key === 'Enter') { e.preventDefault(); const n = document.querySelector(`[data-inv-cell="${rowIndex}-${colIndex + 1}"]`) as HTMLElement; if (n) n.focus(); else { const nr = document.querySelector(`[data-inv-cell="${rowIndex + 1}-0"]`) as HTMLElement; if (nr) nr.focus(); else { addItemRow(); setTimeout(() => { (document.querySelector(`[data-inv-cell="${rowIndex + 1}-0"]`) as HTMLElement)?.focus(); }, 50); } } }
    else if (e.key === 'ArrowUp') { (document.querySelector(`[data-inv-cell="${rowIndex - 1}-${colIndex}"]`) as HTMLElement)?.focus(); }
    else if (e.key === 'ArrowDown') { const t = document.querySelector(`[data-inv-cell="${rowIndex + 1}-${colIndex}"]`) as HTMLElement; if (t) t.focus(); else addItemRow(); }
    else if (e.altKey && e.key.toLowerCase() === 'a') { e.preventDefault(); addItemRow(); }
    else if (e.altKey && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateItemRow(rowIndex); }
  };

  const itemsSubtotal = items.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);
  const hamali = parseFloat(String(hamaliInput)) || 0;
  const discount = parseFloat(String(discountInput)) || 0;
  const todayAmount = itemsSubtotal + hamali - discount;
  const previousBalance = selectedCustomer ? selectedCustomer.previousBalance : 0;
  const paidAmount = parseFloat(String(paidAmountInput)) || 0;
  const remainingBalance = previousBalance + todayAmount - paidAmount;
  const totalCarets = items.reduce((sum, item) => sum + (parseFloat(String(item.caret)) || 0), 0);
  const totalWeight = items.reduce((sum, item) => sum + (parseFloat(String(item.weight)) || 0), 0);

  const handleResetForm = () => {
    const next = getNextUniqueInvoiceNumber(settings.invoice, invoices, date, settings.invoice.salesNextNo || 1001);
    setInvoiceNo(next.invoiceNo);
    setItems([{ id: `item-${Date.now()}-1`, fruit: fruits[0]?.name || 'Mango', lotVariety: fruits[0]?.varieties[0] || 'Kesar', caret: 0, weight: 0, rate: 0, amount: 0 }]);
    setHamaliInput(0);
    setDiscountInput(0);
    setPaidAmountInput(0);
    setNotes('Standard market credit');
  };

  const handleSaveInvoice = () => {
    if (!selectedCustomer) { toast.error('No Customer', 'Please select a valid buyer.'); return; }
    if (items.length === 0 || itemsSubtotal <= 0) { toast.warning('Empty Invoice', 'Add at least one item with a positive amount.'); return; }

    let resolvedInvoiceNo = invoiceNo.trim();
    let nextSalesSeed = settings.invoice.salesNextNo || 1001;

    if (settings.invoice.autoInvoiceNo) {
      const next = getNextUniqueInvoiceNumber(settings.invoice, invoices, date, settings.invoice.salesNextNo || 1001);
      resolvedInvoiceNo = next.invoiceNo;
      nextSalesSeed = next.nextSeed;
    } else {
      if (!resolvedInvoiceNo) { toast.error('Invoice Number Missing', 'Please enter an invoice number.'); return; }
      const duplicate = invoices.some(i => i.invoiceNo === resolvedInvoiceNo);
      if (duplicate) { toast.error('Duplicate Invoice Number', 'Invoice number already exists. Use a unique number.'); return; }
      nextSalesSeed = (settings.invoice.salesNextNo || 1001) + 1;
    }

    const newInvoice: Invoice = { id: `inv-${Date.now()}`, invoiceNo: resolvedInvoiceNo, date, customerId: selectedCustomer.id, customerName: selectedCustomer.name, previousBalance, todayAmount, hamali, discount, paidAmount, remainingBalance, notes, items, createdAt: new Date().toISOString() };
    saveInvoice(newInvoice);
    updateSettings({ invoice: { ...settings.invoice, salesNextNo: nextSalesSeed } });
    toast.success('Invoice Created!', `${resolvedInvoiceNo} — ₹${todayAmount.toLocaleString('en-IN')} billed to ${selectedCustomer.name}.`);
    setTimeout(() => { setActiveSubTab('LIST'); handleResetForm(); }, 600);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const filteredInvoices = useMemo(() => invoices.filter(inv => inv.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) || inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || inv.items.some(it => it.fruit.toLowerCase().includes(searchTerm.toLowerCase()))), [invoices, searchTerm]);
  const invoiceTable = useDataTable<Invoice, 'date' | 'invoiceNo' | 'customerName' | 'todayAmount' | 'paidAmount' | 'remainingBalance'>({
    data: filteredInvoices,
    initialSortBy: 'date',
    initialSortDir: 'desc',
    initialPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
    sortComparators: {
      date: (a, b) => a.date.localeCompare(b.date),
      invoiceNo: (a, b) => a.invoiceNo.localeCompare(b.invoiceNo),
      customerName: (a, b) => a.customerName.localeCompare(b.customerName),
      todayAmount: (a, b) => a.todayAmount - b.todayAmount,
      paidAmount: (a, b) => a.paidAmount - b.paidAmount,
      remainingBalance: (a, b) => a.remainingBalance - b.remainingBalance,
    },
    resetPageOn: [activeSubTab],
  });

  // ── Shared class tokens for light/dark ──────
  const card = 'dark:bg-slate-900 bg-white rounded-2xl border dark:border-slate-800 border-slate-200/80 shadow-sm';
  const cardHeader = 'dark:bg-slate-950 bg-slate-50/80 border-b dark:border-slate-800 border-slate-200/80';
  const inp = 'dark:bg-slate-950 bg-white border dark:border-slate-700/80 border-slate-200 dark:text-white text-slate-900 rounded-lg outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10';
  const mutedText = 'dark:text-slate-400 text-slate-500';
  const labelText = 'dark:text-slate-400 text-slate-600';

  return (
    <div className="space-y-6 font-sans">
      {/* ── HEADER ──────────────────────────────────── */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${card} p-4`}>
        <div>
          <h1 className="text-xl font-black dark:text-white text-slate-900 tracking-tight flex items-center space-x-2.5">
            <ShoppingCart className="w-6 h-6 text-indigo-500" /><span>{t('sales.header.title').toUpperCase()}</span>
          </h1>
          <p className={`text-xs ${mutedText} mt-0.5`}>{t('sales.header.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-1.5 dark:bg-slate-950 bg-slate-100 p-1 rounded-xl border dark:border-slate-800 border-slate-200/80">
          {[
            { id: 'NEW_INVOICE', label: t('sales.header.newInvoice'), icon: <Plus className="w-4 h-4" /> },
            { id: 'LIST', label: `${t('sales.header.invoices')} (${invoices.length})`, icon: <FileText className="w-4 h-4" /> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveSubTab(tab.id as any)} className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${activeSubTab === tab.id ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : `${mutedText} dark:hover:text-white hover:text-slate-900`}`}>
              {tab.icon}<span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          NEW INVOICE FORM
         ══════════════════════════════════════════════ */}
      {activeSubTab === 'NEW_INVOICE' && (
        <div className="space-y-5">
          {/* Invoice Header */}
          <div className={`${card} p-5 space-y-5`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b dark:border-slate-800 border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                {settings.invoice.autoInvoiceNo ? (
                  <span className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-full font-mono font-bold">{invoiceNo}</span>
                ) : (
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={e => setInvoiceNo(e.target.value.toUpperCase())}
                    className={`${inp} px-2.5 py-1.5 text-xs font-mono font-bold min-w-[190px]`}
                    placeholder="Invoice No"
                  />
                )}
                <div className="flex items-center space-x-1.5">
                  <span className={`text-xs ${mutedText} font-medium`}>{t('sales.newInvoice.date')}</span>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} className={`${inp} px-2.5 py-1.5 text-xs font-mono font-bold`} />
                </div>
              </div>
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button type="button" onClick={() => setShowAdvancedDeductions(!showAdvancedDeductions)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer font-bold shrink-0">
                  <Calculator className="w-3.5 h-3.5" /><span>{showAdvancedDeductions ? t('sales.newInvoice.hideCharges') : t('sales.newInvoice.showCharges')}</span>
                </button>
                <div className="flex items-center space-x-2 flex-1 sm:flex-initial min-w-0">
                  <label className={`text-[11px] font-bold uppercase tracking-wider ${labelText} whitespace-nowrap`}>{t('sales.newInvoice.buyer')}</label>
                  <Combobox value={selectedCustomer.name} onChange={val => { const m = customers.find(c => c.name === val) || customers[0]; if (m) setSelectedCustomerId(m.id); }} options={customers.map(c => c.name)} placeholder="Select Customer..." searchPlaceholder="Search customer..." creatable={false} />
                </div>
              </div>
            </div>

            {/* Hamali & Discount */}
            {showAdvancedDeductions && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 dark:bg-slate-950/50 bg-slate-50/60 p-4 rounded-xl border dark:border-slate-800 border-slate-100 animate-slide-down">
                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider ${labelText} mb-1.5`}>+ Hamali (₹)</label>
                  <div className="relative"><span className="absolute left-3 top-2.5 text-xs dark:text-slate-500 text-slate-400 font-mono">₹</span>
                    <input type="number" value={hamaliInput === 0 ? '' : hamaliInput} placeholder="0" onChange={e => setHamaliInput(parseFloat(e.target.value) || 0)} className={`w-full ${inp} pl-7 pr-3 py-2.5 text-xs font-mono font-bold dark:text-indigo-400 text-indigo-600`} />
                  </div>
                </div>
                <div>
                  <label className={`block text-[11px] font-bold uppercase tracking-wider ${labelText} mb-1.5`}>− Discount (₹)</label>
                  <div className="relative"><span className="absolute left-3 top-2.5 text-xs dark:text-slate-500 text-slate-400 font-mono">₹</span>
                    <input type="number" value={discountInput === 0 ? '' : discountInput} placeholder="0" onChange={e => setDiscountInput(parseFloat(e.target.value) || 0)} className={`w-full ${inp} pl-7 pr-3 py-2.5 text-xs font-mono font-bold dark:text-rose-400 text-rose-600 dark:border-rose-500/30 border-rose-200`} />
                  </div>
                </div>
              </div>
            )}

            {/* Balance Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-3.5 dark:bg-slate-950 bg-slate-50/80 rounded-xl border dark:border-slate-800 border-slate-100">
                <span className={`text-[10px] ${mutedText} uppercase font-bold block tracking-wider`}>{t('sales.newInvoice.previousOutstanding')}</span>
                <span className="text-lg font-black font-mono dark:text-slate-200 text-slate-900 mt-1 block">₹ {previousBalance.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-3.5 dark:bg-indigo-950/30 bg-indigo-50/60 rounded-xl border dark:border-indigo-500/20 border-indigo-100">
                <span className="text-[10px] text-indigo-600 dark:text-indigo-300 uppercase font-bold block tracking-wider">+ {t('sales.newInvoice.netTodayBill')}</span>
                <span className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1 block">₹ {todayAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-3.5 dark:bg-emerald-950/30 bg-emerald-50/60 rounded-xl border dark:border-emerald-500/20 border-emerald-100">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-300 uppercase font-bold block tracking-wider">− {t('sales.newInvoice.cashPaid')}</span>
                <div className="flex items-center mt-1"><span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold mr-1.5 text-base">₹</span>
                  <input type="number" value={paidAmountInput === 0 ? '' : paidAmountInput} placeholder="0" onChange={e => setPaidAmountInput(parseFloat(e.target.value) || 0)} className={`w-full ${inp} px-2.5 py-1 text-base font-mono font-extrabold dark:text-emerald-300 text-emerald-700 dark:border-emerald-500/30 border-emerald-200`} />
                </div>
              </div>
              <div className="p-3.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl shadow-lg flex flex-col justify-center">
                <span className="text-[10px] text-indigo-100 uppercase font-black block tracking-wider">{t('sales.newInvoice.finalBalance')}</span>
                <span className="text-2xl font-black font-mono text-white mt-1 block">₹ {remainingBalance.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className={`${card} overflow-hidden`}>
            <div className={`px-5 py-3.5 ${cardHeader} flex items-center justify-between`}>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider dark:text-slate-200 text-slate-800">{t('sales.newInvoice.items')}</span>
                <span className={`text-[10px] font-mono font-bold dark:bg-slate-800 bg-slate-100 ${mutedText} px-2 py-0.5 rounded-full border dark:border-slate-700 border-slate-200`}>{items.length}</span>
              </div>
              <button type="button" onClick={addItemRow} className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-all"><Plus className="w-3.5 h-3.5" /><span>{t('sales.newInvoice.addRow')}</span></button>
            </div>

            <div className="overflow-x-auto">
              <table className="erp-table w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className={`${cardHeader} dark:text-slate-400 text-slate-600 text-[11px] font-bold uppercase tracking-wider select-none`}>
                    <th className="py-3 px-4 min-w-[160px]">{t('sales.table.fruit')}</th>
                    <th className="py-3 px-3 min-w-[160px]">{t('sales.table.variety')}</th>
                    <th className="py-3 px-3 w-24 text-right">{t('sales.table.carets')}</th>
                    <th className="py-3 px-3 w-28 text-right">{t('sales.table.weight')}</th>
                    <th className="py-3 px-3 w-28 text-right">{t('sales.table.rate')}</th>
                    <th className="py-3 px-4 w-36 text-right font-black text-indigo-600 dark:text-indigo-400">{t('sales.table.amount')}</th>
                    <th className="py-3 px-3 w-20 text-center">{t('sales.table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100 font-mono">
                  {items.map((it, idx) => {
                    const fruitObj = fruits.find(f => f.name === it.fruit) || fruits[0];
                    const varieties = fruitObj ? fruitObj.varieties : ['Standard'];
                    return (
                      <tr key={it.id} className="dark:hover:bg-slate-800/30 hover:bg-slate-50/80 font-sans group transition-colors">
                        <td className="p-1.5 px-3" data-inv-cell={`${idx}-0`}>
                          <Combobox value={it.fruit} onChange={val => handleItemChange(idx, 'fruit', val)} options={fruits.map(f => f.name)} placeholder="Fruit..." searchPlaceholder="Search..." creatable={true} onCreate={nf => addFruit(nf)} />
                        </td>
                        <td className="p-1.5" data-inv-cell={`${idx}-1`}>
                          <Combobox value={it.lotVariety} onChange={val => handleItemChange(idx, 'lotVariety', val)} options={varieties} placeholder="Variety..." searchPlaceholder="Search..." creatable={true} onCreate={nv => { if (fruitObj) addFruitVariety(fruitObj.id, nv); }} />
                        </td>
                        <td className="p-1.5 text-right"><input type="number" data-inv-cell={`${idx}-2`} value={it.caret === 0 ? '' : it.caret} placeholder="0" onChange={e => handleItemChange(idx, 'caret', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 2)} className={`w-full ${inp} p-2 text-right text-xs font-mono font-semibold`} /></td>
                        <td className="p-1.5 text-right"><input type="number" step="0.1" data-inv-cell={`${idx}-3`} value={it.weight === 0 ? '' : it.weight} placeholder="0.0" onChange={e => handleItemChange(idx, 'weight', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 3)} className={`w-full ${inp} p-2 text-right text-xs font-mono font-semibold`} /></td>
                        <td className="p-1.5 text-right"><input type="number" step="0.5" data-inv-cell={`${idx}-4`} value={it.rate === 0 ? '' : it.rate} placeholder="0.00" onChange={e => handleItemChange(idx, 'rate', e.target.value)} onKeyDown={e => handleKeyDown(e, idx, 4)} className={`w-full ${inp} p-2 text-right text-xs font-mono font-bold dark:text-indigo-300 text-indigo-600`} /></td>
                        <td className="p-2 px-4 text-right font-black font-mono text-indigo-600 dark:text-indigo-400 dark:bg-indigo-950/15 bg-indigo-50/40 text-sm">₹ {it.amount.toLocaleString('en-IN')}</td>
                        <td className="p-1.5 text-center">
                          <div className="flex items-center justify-center space-x-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => duplicateItemRow(idx)} title="Duplicate" className={`p-1.5 ${mutedText} hover:text-indigo-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors`}><Copy className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => removeItemRow(idx)} disabled={items.length <= 1} title="Remove" className={`p-1.5 ${mutedText} hover:text-rose-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors disabled:opacity-30`}><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className={`${cardHeader} font-bold text-xs uppercase tracking-wider dark:text-slate-300 text-slate-800 font-sans border-t-2 dark:border-slate-700 border-slate-200`}>
                    <td colSpan={2} className={`py-3.5 px-4 text-right ${mutedText}`}>Subtotal:</td>
                    <td className="py-3.5 px-3 text-right font-mono text-indigo-600 dark:text-indigo-400 font-bold">{totalCarets} CRT</td>
                    <td className="py-3.5 px-3 text-right font-mono text-indigo-600 dark:text-indigo-400 font-bold">{totalWeight.toFixed(1)} KG</td>
                    <td className={`py-3.5 px-3 text-right ${mutedText} text-[10px]`}>Avg: ₹{(totalWeight > 0 ? itemsSubtotal / totalWeight : 0).toFixed(1)}/kg</td>
                    <td className="py-3.5 px-4 text-right font-mono text-indigo-600 dark:text-indigo-400 font-black text-base">₹ {itemsSubtotal.toLocaleString('en-IN')}</td>
                    <td />
                  </tr>
                  {(hamali > 0 || discount > 0) && (
                    <tr className={`dark:bg-slate-900/50 bg-slate-50/60 font-bold text-xs uppercase tracking-wider border-t dark:border-slate-800 border-slate-100 dark:text-slate-300 text-slate-700`}>
                      <td colSpan={5} className={`py-2.5 px-4 text-right ${mutedText}`}>{hamali > 0 ? `+ Hamali: ₹${hamali}` : ''} {discount > 0 ? `${hamali > 0 ? ' | ' : ''}− Discount: ₹${discount}` : ''}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-black text-base">₹ {todayAmount.toLocaleString('en-IN')}</td>
                      <td />
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>

            {/* Action Footer */}
            <div className={`p-5 ${cardHeader} border-t flex flex-col sm:flex-row items-center justify-between gap-4`}>
              <div className="flex items-center space-x-3 w-full sm:w-1/2">
                <span className={`text-[11px] ${labelText} font-bold uppercase tracking-wider whitespace-nowrap`}>Note:</span>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment terms..." className={`w-full ${inp} px-3.5 py-2.5 text-xs`} />
              </div>
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button type="button" onClick={handleResetForm} className="px-5 py-3 dark:bg-slate-800 bg-slate-100 dark:hover:bg-slate-700 hover:bg-slate-200 dark:text-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors border dark:border-slate-700 border-slate-200">Clear</button>
                <button type="button" onClick={handleSaveInvoice} className="px-7 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-sm font-black shadow-lg shadow-indigo-500/20 cursor-pointer transition-all flex items-center space-x-2">
                  <Save className="w-5 h-5 stroke-[2.5]" /><span>Save Invoice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          INVOICE LIST
         ══════════════════════════════════════════════ */}
      {activeSubTab === 'LIST' && (
        <div className={`${card} p-5 space-y-5`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b dark:border-slate-800 border-slate-100 pb-4">
            <h2 className="text-sm font-bold dark:text-white text-slate-900 flex items-center space-x-2">
              <span>{t('sales.list.title')}</span>
              <span className={`text-[10px] font-mono font-bold dark:bg-slate-800 bg-slate-100 ${mutedText} px-2 py-0.5 rounded border dark:border-slate-700 border-slate-200`}>{invoiceTable.totalRecords}</span>
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className={`w-4 h-4 ${mutedText} absolute left-3 top-3`} />
              <input type="text" placeholder={t('sales.list.searchPlaceholder')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={`w-full ${inp} pl-9 pr-4 py-2.5 text-xs placeholder-slate-400`} />
            </div>
          </div>

          <DataTable
            footer={
              <Pagination
                page={invoiceTable.page}
                totalPages={invoiceTable.totalPages}
                totalRecords={invoiceTable.totalRecords}
                pageSize={invoiceTable.pageSize}
                pageSizeOptions={invoiceTable.pageSizeOptions}
                onPageChange={invoiceTable.setPage}
                onPageSizeChange={invoiceTable.setPageSize}
                label="invoices"
              />
            }
          >
            <table className="erp-table w-full text-left border-collapse text-xs sm:text-sm">
              <thead><tr className={`${cardHeader} dark:text-slate-400 text-slate-600 uppercase font-bold text-[11px]`}>
                <th className="py-3 px-4"><button type="button" onClick={() => invoiceTable.toggleSort('invoiceNo')} className="inline-flex items-center gap-1">{t('sales.list.invoiceDate')} <ArrowUpDown className="w-3.5 h-3.5" /></button></th><th className="py-3 px-3"><button type="button" onClick={() => invoiceTable.toggleSort('customerName')} className="inline-flex items-center gap-1">{t('sales.list.customer')} <ArrowUpDown className="w-3.5 h-3.5" /></button></th><th className="py-3 px-3 text-right">{t('sales.table.carets')}</th><th className="py-3 px-3 text-right">{t('sales.table.weight')}</th><th className="py-3 px-3 text-right font-black text-indigo-600 dark:text-indigo-400"><button type="button" onClick={() => invoiceTable.toggleSort('todayAmount')} className="inline-flex items-center gap-1 ml-auto">{t('sales.list.total')} <ArrowUpDown className="w-3.5 h-3.5" /></button></th><th className="py-3 px-3 text-right text-emerald-600 dark:text-emerald-400"><button type="button" onClick={() => invoiceTable.toggleSort('paidAmount')} className="inline-flex items-center gap-1 ml-auto">{t('sales.list.paid')} <ArrowUpDown className="w-3.5 h-3.5" /></button></th><th className="py-3 px-3 text-right font-black dark:text-slate-200 text-slate-900"><button type="button" onClick={() => invoiceTable.toggleSort('remainingBalance')} className="inline-flex items-center gap-1 ml-auto">{t('sales.list.balance')} <ArrowUpDown className="w-3.5 h-3.5" /></button></th><th className="py-3 px-4 text-center">{t('sales.table.actions')}</th>
              </tr></thead>
              <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                {invoiceTable.totalRecords === 0 ? (
                  <tr><td colSpan={8} className={`py-16 text-center ${mutedText} font-sans text-sm`}>No invoices found.</td></tr>
                ) : invoiceTable.pageRows.map(inv => {
                  const carets = inv.items.reduce((s, it) => s + (Number(it.caret) || 0), 0);
                  const weight = inv.items.reduce((s, it) => s + (Number(it.weight) || 0), 0);
                  return (
                    <tr key={inv.id} className="dark:hover:bg-slate-800/30 hover:bg-slate-50/80 transition-colors font-sans group">
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-bold dark:text-slate-200 text-slate-900 block text-sm">{inv.invoiceNo}</span>
                        <span className={`text-[11px] ${mutedText} flex items-center mt-0.5 font-sans`}><Calendar className="w-3 h-3 mr-1 text-indigo-500" />{inv.date}</span>
                      </td>
                      <td className="py-3.5 px-3 font-sans">
                        <span className="font-bold dark:text-white text-slate-900 block text-sm">{inv.customerName}</span>
                        <span className={`${mutedText} text-[11px] block truncate max-w-[180px]`}>{inv.items.length} lots</span>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold dark:text-slate-300 text-slate-700">{carets}</td>
                      <td className="py-3.5 px-3 text-right font-mono font-semibold dark:text-slate-300 text-slate-700">{weight}</td>
                      <td className="py-3.5 px-3 text-right font-black font-mono text-indigo-600 dark:text-indigo-400 text-sm">₹ {inv.todayAmount.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-3 text-right font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm">₹ {inv.paidAmount.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-3 text-right font-black font-mono dark:text-slate-200 text-slate-900 text-sm">₹ {inv.remainingBalance.toLocaleString('en-IN')}</td>
                      <td className="py-3.5 px-4 text-center font-sans">
                        <div className="flex items-center justify-center space-x-1">
                          <button onClick={() => setPreviewInvoice(inv)} className="px-3 py-1.5 dark:bg-slate-800 bg-slate-100 hover:bg-indigo-600 dark:hover:bg-indigo-600 hover:text-white dark:text-slate-300 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all shadow-sm cursor-pointer border dark:border-slate-700 border-slate-200 hover:border-indigo-600"><Eye className="w-3.5 h-3.5" /><span>View</span></button>
                          <button onClick={async () => { const ok = await dialog.confirm({ variant: 'destructive', title: `Delete Invoice ${inv.invoiceNo}?`, description: `This will permanently remove the invoice for ${inv.customerName} and revert customer balance and stock levels.`, confirmText: 'Delete Invoice' }); if (ok) { deleteInvoice(inv.id); toast.info('Invoice Deleted', `${inv.invoiceNo} removed.`); } }} className={`p-2 ${mutedText} hover:text-rose-500 dark:hover:bg-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors`}><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTable>
        </div>
      )}

      <InvoicePreviewModal invoice={previewInvoice} onClose={() => setPreviewInvoice(null)} />
    </div>
  );
};
