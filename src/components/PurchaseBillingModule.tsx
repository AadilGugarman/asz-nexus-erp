import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { PurchaseInvoice, PurchaseInvoiceItem } from '../types';
import { PurchasePreviewModal } from './PurchasePreviewModal';
import { ShoppingBag, Plus, Save, Search, Eye, Trash2, FileText, Calendar, Copy, Calculator, ArrowUpDown } from 'lucide-react';
import { Combobox } from './ui/Combobox';
import { useToast } from './ui/Toast';
import { useConfirmDialog } from './ui/ConfirmDialog';
import { ModuleEmptyState, TableSkeleton } from './ui/DataStates';

export const PurchaseBillingModule: React.FC = () => {
  const { suppliers, fruits, purchaseInvoices, savePurchaseInvoice, deletePurchaseInvoice, addFruit, addFruitVariety } = useApp();
  const toast = useToast();
  const dialog = useConfirmDialog();

  const [activeSubTab, setActiveSubTab] = useState<'NEW_INVOICE' | 'LIST'>('NEW_INVOICE');
  const [previewInvoice, setPreviewInvoice] = useState<PurchaseInvoice | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'billNo' | 'todayAmount' | 'remainingBalance'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Form State
  const [billNo, setBillNo] = useState(`PUR-2026-${String(purchaseInvoices.length + 101).padStart(3, '0')}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedSupplierId, setSelectedSupplierId] = useState(suppliers[0]?.id || '');
  const [notes, setNotes] = useState('Direct farm/supplier delivery');

  const selectedSupplier = useMemo(() => {
    return suppliers.find(s => s.id === selectedSupplierId) || suppliers[0];
  }, [selectedSupplierId, suppliers]);

  // Advanced Billing Deductions State
  const [freightInput, setFreightInput] = useState<number>(0);
  const [hamaliInput, setHamaliInput] = useState<number>(0);
  const [showAdvancedDeductions, setShowAdvancedDeductions] = useState<boolean>(true);

  // Payment State
  const [paidAmountInput, setPaidAmountInput] = useState<number>(0);

  // Billing Items State
  const [items, setItems] = useState<PurchaseInvoiceItem[]>([
    {
      id: `item-${Date.now()}-1`,
      fruit: fruits[0]?.name || 'Mango',
      variety: fruits[0]?.varieties[0] || 'Kesar',
      caret: 20,
      weight: 400,
      rate: 70,
      amount: 28000
    }
  ]);

  // (using toast instead of inline banners)

  // Handle cell changes in invoice table
  const handleItemChange = (index: number, field: keyof PurchaseInvoiceItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index] };

    if (field === 'fruit') {
      item.fruit = value;
      const fObj = fruits.find(f => f.name === value);
      item.variety = fObj ? fObj.varieties[0] || 'Standard' : 'Standard';
    } else if (field === 'caret' || field === 'weight' || field === 'rate') {
      (item as any)[field] = value;
      const w = field === 'weight' ? parseFloat(value) || 0 : parseFloat(String(item.weight)) || 0;
      const r = field === 'rate' ? parseFloat(value) || 0 : parseFloat(String(item.rate)) || 0;
      item.amount = Math.round(w * r);
    } else {
      (item as any)[field] = value;
    }

    updated[index] = item;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        fruit: fruits[0]?.name || 'Mango',
        variety: fruits[0]?.varieties[0] || 'Kesar',
        caret: 0,
        weight: 0,
        rate: 0,
        amount: 0
      }
    ]);
  };

  const duplicateItemRow = (index: number) => {
    const source = items[index];
    if (!source) return;
    const duplicated: PurchaseInvoiceItem = {
      ...source,
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    const updated = [...items];
    updated.splice(index + 1, 0, duplicated);
    setItems(updated);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Keyboard navigation for invoice items table
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, rowIndex: number, colIndex: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = document.querySelector(`[data-pinv-cell="${rowIndex}-${colIndex + 1}"]`) as HTMLElement;
      if (nextInput) {
        nextInput.focus();
      } else {
        const nextRowInput = document.querySelector(`[data-pinv-cell="${rowIndex + 1}-0"]`) as HTMLElement;
        if (nextRowInput) {
          nextRowInput.focus();
        } else {
          addItemRow();
          setTimeout(() => {
            const addedRowInput = document.querySelector(`[data-pinv-cell="${rowIndex + 1}-0"]`) as HTMLElement;
            addedRowInput?.focus();
          }, 50);
        }
      }
    } else if (e.key === 'ArrowUp') {
      const target = document.querySelector(`[data-pinv-cell="${rowIndex - 1}-${colIndex}"]`) as HTMLElement;
      target?.focus();
    } else if (e.key === 'ArrowDown') {
      const target = document.querySelector(`[data-pinv-cell="${rowIndex + 1}-${colIndex}"]`) as HTMLElement;
      if (target) target.focus();
      else addItemRow();
    } else if (e.key === 'ArrowLeft' && (e.target as HTMLInputElement).selectionStart === 0) {
      const target = document.querySelector(`[data-pinv-cell="${rowIndex}-${colIndex - 1}"]`) as HTMLElement;
      target?.focus();
    } else if (e.key === 'ArrowRight' && (e.target as HTMLInputElement).selectionEnd === (e.target as HTMLInputElement).value?.length) {
      const target = document.querySelector(`[data-pinv-cell="${rowIndex}-${colIndex + 1}"]`) as HTMLElement;
      target?.focus();
    } else if (e.altKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      addItemRow();
    } else if (e.altKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      duplicateItemRow(rowIndex);
    }
  };

  // Calculations
  const itemsSubtotal = items.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);
  const freight = parseFloat(String(freightInput)) || 0;
  const hamali = parseFloat(String(hamaliInput)) || 0;
  const todayAmount = itemsSubtotal + freight + hamali;

  const previousBalance = selectedSupplier ? selectedSupplier.previousBalance : 0;
  const paidAmount = parseFloat(String(paidAmountInput)) || 0;

  // Formula: Remaining Supplier Balance = Previous Balance + Today Bill - Paid Amount
  const remainingBalance = previousBalance + todayAmount - paidAmount;

  const totalCarets = items.reduce((sum, item) => sum + (parseFloat(String(item.caret)) || 0), 0);
  const totalWeight = items.reduce((sum, item) => sum + (parseFloat(String(item.weight)) || 0), 0);

  const handleResetForm = () => {
    setBillNo(`PUR-2026-${String(purchaseInvoices.length + 101).padStart(3, '0')}`);
    setItems([
      {
        id: `item-${Date.now()}-1`,
        fruit: fruits[0]?.name || 'Mango',
        variety: fruits[0]?.varieties[0] || 'Kesar',
        caret: 0,
        weight: 0,
        rate: 0,
        amount: 0
      }
    ]);
    setFreightInput(0);
    setHamaliInput(0);
    setPaidAmountInput(0);
    setNotes('Direct farm/supplier delivery');
  };

  const handleSaveInvoice = () => {
    if (!selectedSupplier) {
      toast.error('No Supplier Selected', 'Please select a valid supplier before saving the purchase bill.');
      return;
    }
    if (items.length === 0 || itemsSubtotal <= 0) {
      toast.warning('Empty Purchase Bill', 'Please enter at least one valid fruit item row with a positive amount.');
      return;
    }

    const newInvoice: PurchaseInvoice = {
      id: `pinv-${Date.now()}`,
      billNo,
      date,
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      previousBalance,
      todayAmount,
      freight,
      hamali,
      paidAmount,
      remainingBalance,
      notes,
      items,
      createdAt: new Date().toISOString()
    };

    savePurchaseInvoice(newInvoice);
    toast.success('Purchase Bill Saved!', `${billNo} — ₹${todayAmount.toLocaleString('en-IN')} from ${selectedSupplier.name}. Stock incremented.`);
    setTimeout(() => {
      setActiveSubTab('LIST');
      handleResetForm();
    }, 600);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const listSearchRef = useRef<HTMLInputElement>(null);
  const nextFieldRef = useRef<HTMLInputElement>(null);
  const filteredInvoices = useMemo(() => {
    const filtered = purchaseInvoices.filter(inv => {
      return (
        inv.billNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.items.some(it => it.fruit.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });

    return [...filtered].sort((a, b) => {
      const factor = sortDir === 'asc' ? 1 : -1;
      if (sortBy === 'billNo') return a.billNo.localeCompare(b.billNo) * factor;
      if (sortBy === 'todayAmount') return (a.todayAmount - b.todayAmount) * factor;
      if (sortBy === 'remainingBalance') return (a.remainingBalance - b.remainingBalance) * factor;
      return a.date.localeCompare(b.date) * factor;
    });
  }, [purchaseInvoices, searchTerm, sortBy, sortDir]);

  useEffect(() => {
    if (activeSubTab !== 'LIST') return;
    setIsListLoading(true);
    const t = window.setTimeout(() => setIsListLoading(false), 180);
    return () => window.clearTimeout(t);
  }, [activeSubTab, searchTerm, sortBy, sortDir]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && activeSubTab === 'LIST') {
        e.preventDefault();
        listSearchRef.current?.focus();
      }
      if (e.ctrlKey && e.key === 'Enter' && activeSubTab === 'NEW_INVOICE') {
        e.preventDefault();
        handleSaveInvoice();
      }
      if (e.altKey && e.key.toLowerCase() === 'n' && activeSubTab === 'NEW_INVOICE') {
        e.preventDefault();
        addItemRow();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeSubTab, items, selectedSupplierId, notes, billNo, date, freightInput, hamaliInput, paidAmountInput]);

  const handleSort = (key: 'date' | 'billNo' | 'todayAmount' | 'remainingBalance') => {
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
            <ShoppingBag className="w-6 h-6 text-[#00c896]" />
            <span>DIRECT PURCHASE BILLING & INVOICES</span>
          </h1>
          <p className="erp-subtitle mt-1">Premium fast supplier purchase bill entry, auto stock increment, and supplier balance sync</p>
        </div>

        <div className="erp-surface flex items-center space-x-2 p-1.5">
          <button
            onClick={() => setActiveSubTab('NEW_INVOICE')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
              activeSubTab === 'NEW_INVOICE'
                ? 'bg-[linear-gradient(135deg,#00C896,#00AEEF)] text-white shadow-[0_8px_20px_rgba(0,174,239,0.22)]'
                : 'text-[#64748b] hover:text-[#0f172a] hover:bg-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>New Purchase Bill</span>
          </button>
          <button
            onClick={() => setActiveSubTab('LIST')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
              activeSubTab === 'LIST'
                ? 'bg-[linear-gradient(135deg,#00C896,#00AEEF)] text-white shadow-[0_8px_20px_rgba(0,174,239,0.22)]'
                : 'text-[#64748b] hover:text-[#0f172a] hover:bg-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Purchase Bills ({purchaseInvoices.length})</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: NEW INVOICE ENTRY FORM */}
      {activeSubTab === 'NEW_INVOICE' && (
        <div className="space-y-6">
          {/* HEADER SELECTION & BALANCE DISPLAY */}
          <div className="erp-panel p-6 rounded-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#edf2f7] pb-4">
              <div className="flex items-center space-x-3">
                <span className="text-xs bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 px-3 py-1 rounded-full font-mono font-bold">
                  {billNo}
                </span>
                <div className="flex items-center space-x-1 font-mono">
                  <span className="text-xs dark:text-slate-400 text-slate-600 font-medium font-sans">Date:</span>
                  <input
                    ref={nextFieldRef}
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="erp-input min-h-0 py-1 px-2.5 text-xs font-semibold"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-4 w-full sm:w-auto font-sans">
                <button
                  type="button"
                  onClick={() => setShowAdvancedDeductions(!showAdvancedDeductions)}
                  className="text-xs text-emerald-500 hover:underline flex items-center space-x-1 cursor-pointer font-bold"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>{showAdvancedDeductions ? 'Hide Freight/Hamali' : 'Add Freight & Hamali'}</span>
                </button>
                <div className="flex items-center space-x-2 flex-1 sm:flex-initial">
                  <label className="text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 whitespace-nowrap">Supplier / Orchard:</label>
                  <Combobox
                    value={selectedSupplier.name}
                    onChange={(val) => {
                      const matched = suppliers.find(s => s.name === val) || suppliers[0];
                      if (matched) setSelectedSupplierId(matched.id);
                      // Move to next field on selection
                      setTimeout(() => nextFieldRef.current?.focus(), 0);
                    }}
                    options={suppliers.map(s => s.name)}
                    placeholder="Select Supplier..."
                    searchPlaceholder="Search supplier..."
                    creatable={false}
                  />
                </div>
              </div>
            </div>

            {/* Advanced charges bar */}
            {showAdvancedDeductions && (
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 dark:bg-slate-950/60 bg-slate-100 p-4 rounded-xl border border-slate-800 dark:border-slate-800 border-slate-200 text-xs">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1">+ Lorry Freight (Bhaada ₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-500 font-mono">₹</span>
                    <input
                      type="number"
                      value={freightInput === 0 ? '' : freightInput}
                      placeholder="0"
                      onChange={(e) => setFreightInput(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 dark:bg-slate-900 bg-white border border-slate-700/80 dark:border-slate-700/80 border-slate-300 focus:border-emerald-500 text-emerald-500 font-mono font-bold rounded-lg pl-7 pr-3 py-1.5 outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Added to total bill amount</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-600 mb-1">+ Unloading Labour (Hamali ₹)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-xs text-slate-500 font-mono">₹</span>
                    <input
                      type="number"
                      value={hamaliInput === 0 ? '' : hamaliInput}
                      placeholder="0"
                      onChange={(e) => setHamaliInput(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-900 dark:bg-slate-900 bg-white border border-slate-700/80 dark:border-slate-700/80 border-slate-300 focus:border-emerald-500 text-emerald-500 font-mono font-bold rounded-lg pl-7 pr-3 py-1.5 outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Added to total bill amount</span>
                </div>
              </div>
            )}

            {/* LIVE SUPPLIER BALANCE FORMULA BAR */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-[#f8fafc] p-4 rounded-xl border border-[#e2e8f0]">
              <div className="p-3.5 bg-white rounded-xl border border-[#e2e8f0] shadow-sm">
                <span className="text-[10px] text-[#64748b] uppercase font-semibold block tracking-wider">Previous Outstanding</span>
                <span className="text-xl font-semibold font-mono text-[#0f172a] mt-1 block">
                  ₹ {previousBalance.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3.5 bg-[rgba(0,200,150,0.08)] rounded-xl border border-[rgba(0,200,150,0.25)] shadow-sm">
                <span className="text-[10px] text-[#00c896] uppercase font-semibold block tracking-wider">+ Net Today Bill</span>
                <span className="text-xl font-semibold font-mono text-[#00c896] mt-1 block">
                  ₹ {todayAmount.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="p-3.5 bg-[rgba(0,174,239,0.08)] rounded-xl border border-[rgba(0,174,239,0.25)] shadow-sm">
                <span className="text-[10px] text-[#00aeef] uppercase font-semibold block tracking-wider">- Cash Paid Instantly</span>
                <div className="flex items-center mt-1">
                  <span className="text-[#00aeef] font-mono font-semibold mr-1.5 text-base">₹</span>
                  <input
                    type="number"
                    value={paidAmountInput === 0 ? '' : paidAmountInput}
                    placeholder="0"
                    onChange={(e) => setPaidAmountInput(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-[#00aeef]/40 text-[#0369a1] font-mono font-semibold rounded-lg px-3 py-1 text-base outline-none focus:ring-2 focus:ring-[#00aeef]/20 transition-all"
                  />
                </div>
              </div>
              <div className="p-3.5 bg-[linear-gradient(135deg,#00C896,#00AEEF)] text-white rounded-xl shadow-lg flex flex-col justify-center font-semibold">
                <span className="text-[10px] text-white/90 uppercase font-semibold block tracking-wider">Final Supplier Payable</span>
                <span className="text-2xl font-semibold font-mono text-white mt-1 block">
                  ₹ {remainingBalance.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* MAIN BILLING TABLE */}
          <div className="erp-table-wrap rounded-2xl font-sans">
            <div className="px-5 py-4 bg-[#f8fafc] border-b border-[#edf2f7] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2.5 h-2.5 rounded-full bg-[#00c896] animate-pulse"></div>
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#475569]">Purchased Fruit Items</span>
                <span className="text-xs bg-[#f1f5f9] text-[#475569] px-2 py-0.5 rounded-full font-mono font-semibold border border-[#e2e8f0]">{items.length} items active</span>
              </div>
              <button
                type="button"
                onClick={addItemRow}
                className="erp-btn-primary flex items-center space-x-1 px-3 py-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Row (Alt+A)</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="erp-table text-left text-xs sm:text-sm">
                <thead>
                  <tr className="select-none">
                    <th className="py-3 px-4 w-48 min-w-[160px]">Fruit Category</th>
                    <th className="py-3 px-3 w-48 min-w-[160px]">Variety (Vakkal)</th>
                    <th className="py-3 px-3 w-28 text-right min-w-[100px]">Carets Qty</th>
                    <th className="py-3 px-3 w-32 text-right min-w-[100px]">Weight (KG)</th>
                    <th className="py-3 px-3 w-32 text-right min-w-[100px]">Rate (₹/KG)</th>
                    <th className="py-3 px-4 w-36 text-right font-black text-emerald-500 min-w-[140px]">Subtotal Amount</th>
                    <th className="py-3 px-3 w-20 text-center min-w-[90px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {items.map((it, idx) => {
                    const fruitObj = fruits.find(f => f.name === it.fruit) || fruits[0];
                    const varieties = fruitObj ? fruitObj.varieties : ['Standard'];

                    return (
                      <tr key={it.id} className="font-sans group focus-within:bg-[#f8fafc] transition-colors">
                        <td className="p-1 px-3" data-pinv-cell={`${idx}-0`}>
                          <Combobox
                            value={it.fruit}
                            onChange={(val) => handleItemChange(idx, 'fruit', val)}
                            options={fruits.map(f => f.name)}
                            placeholder="Select Fruit..."
                            searchPlaceholder="Search or add fruit..."
                            creatable={true}
                            onCreate={(newFruit) => addFruit(newFruit)}
                          />
                        </td>

                        <td className="p-1" data-pinv-cell={`${idx}-1`}>
                          <Combobox
                            value={it.variety}
                            onChange={(val) => handleItemChange(idx, 'variety', val)}
                            options={varieties}
                            placeholder="Select Variety..."
                            searchPlaceholder="Search or add variety..."
                            creatable={true}
                            onCreate={(newVar) => {
                              if (fruitObj) addFruitVariety(fruitObj.id, newVar);
                            }}
                          />
                        </td>

                        <td className="p-1 text-right font-mono">
                          <input
                            type="number"
                            data-pinv-cell={`${idx}-2`}
                            value={it.caret === 0 ? '' : it.caret}
                            placeholder="0"
                            onChange={(e) => handleItemChange(idx, 'caret', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, idx, 2)}
                            className="w-full bg-white border border-[#dbe4ef] focus:border-[#00c896] text-[#0f172a] rounded-lg p-2 text-right text-xs outline-none font-mono font-semibold"
                          />
                        </td>

                        <td className="p-1 text-right font-mono">
                          <input
                            type="number"
                            step="0.1"
                            data-pinv-cell={`${idx}-3`}
                            value={it.weight === 0 ? '' : it.weight}
                            placeholder="0.0"
                            onChange={(e) => handleItemChange(idx, 'weight', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, idx, 3)}
                            className="w-full bg-white border border-[#dbe4ef] focus:border-[#00c896] text-[#0f172a] rounded-lg p-2 text-right text-xs outline-none font-mono font-semibold"
                          />
                        </td>

                        <td className="p-1 text-right font-mono font-semibold">
                          <input
                            type="number"
                            step="0.5"
                            data-pinv-cell={`${idx}-4`}
                            value={it.rate === 0 ? '' : it.rate}
                            placeholder="0.00"
                            onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, idx, 4)}
                            className="w-full bg-white border border-[#dbe4ef] focus:border-[#00c896] text-[#0f766e] font-semibold rounded-lg p-2 text-right text-xs outline-none"
                          />
                        </td>

                        <td className="p-2 px-4 text-right font-semibold font-mono text-[#0f766e] bg-[rgba(0,200,150,0.08)] text-sm">
                          ₹ {it.amount.toLocaleString('en-IN')}
                        </td>

                        <td className="p-1 text-center">
                          <div className="flex items-center justify-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => duplicateItemRow(idx)}
                              title="Duplicate Row"
                              className="p-1.5 text-[#64748b] hover:text-[#0f766e] hover:bg-[#f1f5f9] rounded-lg transition-colors cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              disabled={items.length <= 1}
                              title="Remove Row"
                              className="p-1.5 text-[#64748b] hover:text-rose-500 hover:bg-[#f1f5f9] rounded-lg transition-colors disabled:opacity-30 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[#f8fafc] font-semibold text-xs uppercase tracking-wider border-t border-[#edf2f7] text-[#475569] font-sans">
                    <td colSpan={2} className="py-4 px-4 text-right text-[#64748b]">Inline Subtotal:</td>
                    <td className="py-4 px-3 text-right font-mono text-[#0f766e]">{totalCarets} CRT</td>
                    <td className="py-4 px-3 text-right font-mono text-[#0f766e]">{totalWeight.toFixed(1)} KG</td>
                    <td className="py-4 px-3 text-right text-[#64748b]">Avg: ₹{(totalWeight > 0 ? itemsSubtotal / totalWeight : 0).toFixed(1)}/kg</td>
                    <td className="py-4 px-4 text-right font-mono text-[#0f766e] text-base bg-[rgba(0,200,150,0.08)] border-l border-[rgba(0,200,150,0.2)]">
                      ₹ {itemsSubtotal.toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-3 text-[#64748b] text-[11px] font-normal">
                      Use <kbd className="bg-[#f1f5f9] px-1 font-mono text-[#0f766e]">Enter</kbd> or <kbd className="bg-[#f1f5f9] px-1 font-mono text-[#0f766e]">Arrows</kbd>
                    </td>
                  </tr>
                  {(freight > 0 || hamali > 0) && (
                    <tr className="bg-slate-900 dark:bg-slate-900 bg-white font-bold text-xs uppercase tracking-wider border-t border-slate-800 dark:border-slate-800 border-slate-200 dark:text-slate-300 text-slate-900">
                      <td colSpan={5} className="py-3 px-4 text-right dark:text-slate-400 text-slate-600">
                        {freight > 0 ? `+ Freight: ₹${freight} | ` : ''} {hamali > 0 ? `+ Hamali: ₹${hamali}` : ''}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-500 font-black text-base bg-emerald-950/30">
                        ₹ {todayAmount.toLocaleString('en-IN')}
                      </td>
                      <td></td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>

            {/* Invoice Notes & Action */}
            <div className="p-5 bg-[#f8fafc] border-t border-[#edf2f7] flex flex-col sm:flex-row items-center justify-between gap-5">
              <div className="flex items-center space-x-3 w-full sm:w-1/2">
                <span className="text-xs dark:text-slate-400 text-slate-600 font-bold uppercase tracking-wider whitespace-nowrap">Remarks / Notes:</span>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Farm gate delivery, quality check remarks..."
                  className="erp-input w-full px-4 py-2 text-xs"
                />
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="erp-btn-secondary px-6 py-3.5 text-xs"
                >
                  Clear Form
                </button>
                <button
                  type="button"
                  onClick={handleSaveInvoice}
                  className="erp-btn-primary px-8 py-3.5 text-sm flex items-center justify-center space-x-2"
                >
                  <Save className="w-5 h-5 stroke-[2.5]" />
                  <span>COMPLETE PURCHASE & INCREMENT STOCK</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: INVOICES LIST */}
      {activeSubTab === 'LIST' && (
        <div className={`erp-table-wrap rounded-2xl p-6 space-y-6 font-sans ${isCompact ? 'table-compact' : ''}`}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#edf2f7] pb-4">
            <h2 className="text-base font-bold dark:text-white text-slate-900 flex items-center space-x-2">
              <span>Direct Purchase Invoices Archive</span>
              <span className="text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono px-2.5 py-0.5 rounded font-bold">
                {filteredInvoices.length} Bills Synced
              </span>
            </h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsCompact(v => !v)}
                className="erp-btn-secondary px-3 py-2 text-xs"
              >
                {isCompact ? 'Comfortable' : 'Compact'}
              </button>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-3.5" />
              <input
                ref={listSearchRef}
                type="text"
                placeholder="Search bill #, supplier name, fruit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="erp-input w-full pl-9 pr-4"
              />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto scroll-smooth">
            <table className="erp-table text-left text-xs sm:text-sm">
              <thead>
                <tr>
                  <th className="py-3.5 px-4">
                    <button type="button" onClick={() => handleSort('billNo')} className="inline-flex items-center gap-1">
                      Bill # / Date <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3.5 px-3">Supplier / Orchard</th>
                  <th className="py-3.5 px-3 text-right">Carets</th>
                  <th className="py-3.5 px-3 text-right">Weight (KG)</th>
                  <th className="py-3.5 px-3 text-right font-black text-emerald-500">
                    <button type="button" onClick={() => handleSort('todayAmount')} className="inline-flex items-center gap-1 ml-auto">
                      Bill Total <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3.5 px-3 text-right text-indigo-500">Cash Paid Now</th>
                  <th className="py-3.5 px-3 text-right font-black dark:text-slate-100 text-slate-950">
                    <button type="button" onClick={() => handleSort('remainingBalance')} className="inline-flex items-center gap-1 ml-auto">
                      Final Balance <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="py-3.5 px-4 text-center sticky right-0 bg-[#f8fafc] z-[3]">Actions / View</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {isListLoading ? (
                  <tr>
                    <td colSpan={8} className="p-0">
                      <TableSkeleton rows={6} cols={8} compact={isCompact} />
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-0">
                      <ModuleEmptyState
                        title="No purchase bills found"
                        subtitle="Try a different search or create a new purchase bill."
                      />
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map(inv => {
                    const carets = inv.items.reduce((s, it) => s + (Number(it.caret) || 0), 0);
                    const weight = inv.items.reduce((s, it) => s + (Number(it.weight) || 0), 0);

                    return (
                      <tr key={inv.id} className="transition-colors font-sans group">
                        <td className="py-4 px-4 font-mono">
                          <span className="font-bold dark:text-slate-200 text-slate-900 block text-sm">{inv.billNo}</span>
                          <span className="text-[11px] dark:text-slate-400 text-slate-600 flex items-center mt-0.5 font-sans">
                            <Calendar className="w-3 h-3 mr-1 text-emerald-500" />
                            {inv.date}
                          </span>
                        </td>
                        <td className="py-4 px-3 font-sans">
                          <span className="font-bold dark:text-white text-slate-950 block text-sm">{inv.supplierName}</span>
                          <span className="dark:text-slate-400 text-slate-600 text-[11px] block truncate max-w-[180px]">{inv.items.length} items ({inv.items.map(i => i.fruit).join(', ')})</span>
                        </td>
                        <td className="py-4 px-3 text-right font-mono font-semibold dark:text-slate-300 text-slate-800">
                          {carets} <span className="text-[10px] dark:text-slate-500 text-slate-600 font-normal font-sans">CRT</span>
                        </td>
                        <td className="py-4 px-3 text-right font-mono font-semibold dark:text-slate-300 text-slate-800">
                          {weight} <span className="text-[10px] dark:text-slate-500 text-slate-600 font-normal font-sans">KG</span>
                        </td>
                        <td className="py-4 px-3 text-right font-black font-mono text-emerald-500 text-sm bg-emerald-950/10">
                          ₹ {inv.todayAmount.toLocaleString('en-IN')}
                          {(inv.freight || inv.hamali) ? (
                            <span className="block text-[10px] font-sans font-normal dark:text-slate-400 text-slate-600">Net charges</span>
                          ) : null}
                        </td>
                        <td className="py-4 px-3 text-right font-bold font-mono text-indigo-500 text-sm">
                          ₹ {inv.paidAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-3 text-right font-black font-mono dark:text-slate-100 text-slate-950 text-sm">
                          ₹ {inv.remainingBalance.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 px-4 text-center font-sans sticky right-0 bg-white z-[2] border-l border-[#edf2f7]">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => setPreviewInvoice(inv)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all shadow cursor-pointer"
                              title="View Billa / Print Bill"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Billa</span>
                            </button>
                            <button
                              onClick={async () => {
                                const ok = await dialog.confirm({ variant: 'destructive', title: `Delete Purchase Bill ${inv.billNo}?`, description: `This will permanently remove the bill from ${inv.supplierName} and revert supplier balance and stock inventory.`, confirmText: 'Delete Bill' });
                                if (ok) { deletePurchaseInvoice(inv.id); toast.info('Bill Deleted', `${inv.billNo} removed.`); }
                              }}
                              className="p-2 dark:text-slate-400 text-slate-600 hover:text-rose-500 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                              title="Delete Bill"
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
        </div>
      )}

      {/* Purchase Billa Preview Modal */}
      <PurchasePreviewModal
        invoice={previewInvoice}
        onClose={() => setPreviewInvoice(null)}
      />
    </div>
  );
};
