import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileBarChart2, Calendar, Printer, Filter, TrendingUp,
  ArrowUpRight, ArrowDownRight, Package, Users, UserCheck, DollarSign, Layers, Banknote, ArrowUpDown
} from 'lucide-react';
import { StatementPreview } from './ui/StatementPreview';
import { ModuleEmptyState, TableSkeleton } from './ui/DataStates';
import { useDataTable } from '../hooks/useDataTable';
import { DataTable, Pagination } from './ui/table';
import { useAppearance } from '@/hooks';

type ReportTab = 'DAILY' | 'DATERANGE' | 'PARTY' | 'FRUIT' | 'OUTSTANDING' | 'PNL';

export const ReportsModule: React.FC = () => {
  const { vehicles, invoices, purchaseInvoices, payments, suppliers, customers, settings } = useApp();
  const { density, setDensity } = useAppearance();
  const [showReportPreview, setShowReportPreview] = useState(false);
  const reportContentRef = useRef<HTMLDivElement>(null);

  const [activeReport, setActiveReport] = useState<ReportTab>('DAILY');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateFrom, setDateFrom] = useState('2026-05-01');
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const isCompact = density === 'compact';

  const reportTabs: { id: ReportTab; label: string; icon: React.ReactNode }[] = [
    { id: 'DAILY', label: 'Daily Summary', icon: <Calendar className="w-4 h-4" /> },
    { id: 'DATERANGE', label: 'Date Range', icon: <Filter className="w-4 h-4" /> },
    { id: 'PARTY', label: 'Party-wise', icon: <Users className="w-4 h-4" /> },
    { id: 'FRUIT', label: 'Fruit & Variety', icon: <Layers className="w-4 h-4" /> },
    { id: 'OUTSTANDING', label: 'Outstanding', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'PNL', label: 'Trading P&L', icon: <TrendingUp className="w-4 h-4" /> },
  ];

  // ── Helpers ──────────────────────────────────
  const inRange = (d: string) => d >= dateFrom && d <= dateTo;
  const onDate = (d: string) => d === selectedDate;

  const savedVehicles = vehicles.filter(v => v.status === 'SAVED');

  useEffect(() => {
    setIsLoading(true);
    const t = window.setTimeout(() => setIsLoading(false), 180);
    return () => window.clearTimeout(t);
  }, [activeReport, selectedDate, dateFrom, dateTo]);

  // ══════════════════════════════════════════════
  // REPORT 1: DAILY SUMMARY
  // ══════════════════════════════════════════════
  const daily = useMemo(() => {
    const veh = savedVehicles.filter(v => onDate(v.date));
    const pinv = purchaseInvoices.filter(i => onDate(i.date));
    const sinv = invoices.filter(i => onDate(i.date));
    const pay = payments.filter(p => onDate(p.date));

    const totalPurchaseVehicle = veh.reduce((s, v) => s + v.totalAmount, 0);
    const totalPurchaseBill = pinv.reduce((s, i) => s + i.todayAmount, 0);
    const totalSales = sinv.reduce((s, i) => s + i.todayAmount, 0);
    const totalPaidOut = pay.filter(p => p.partyType === 'SUPPLIER').reduce((s, p) => s + p.amount, 0);
    const totalReceived = pay.filter(p => p.partyType === 'CUSTOMER').reduce((s, p) => s + p.amount, 0);
    const totalWeightIn = veh.reduce((s, v) => s + v.totalCalculatedWeight, 0) + pinv.reduce((s, i) => s + i.items.reduce((a, it) => a + (Number(it.weight) || 0), 0), 0);
    const totalWeightOut = sinv.reduce((s, i) => s + i.items.reduce((a, it) => a + (Number(it.weight) || 0), 0), 0);

    return { veh, pinv, sinv, pay, totalPurchaseVehicle, totalPurchaseBill, totalSales, totalPaidOut, totalReceived, totalWeightIn, totalWeightOut };
  }, [selectedDate, savedVehicles, purchaseInvoices, invoices, payments]);

  const dailyTransactions = useMemo(() => {
    const veh = daily.veh.map(v => ({ id: `veh-${v.id}`, type: 'Vehicle Inward', reference: v.arrivalNo, party: v.rows.map(r => r.supplierName).filter((v2, i, a) => a.indexOf(v2) === i).join(', '), amount: v.totalAmount, direction: 'OUT' as const }));
    const pinv = daily.pinv.map(i => ({ id: `pinv-${i.id}`, type: 'Purchase Bill', reference: i.billNo, party: i.supplierName, amount: i.todayAmount, direction: 'OUT' as const }));
    const sinv = daily.sinv.map(i => ({ id: `sinv-${i.id}`, type: 'Sales Invoice', reference: i.invoiceNo, party: i.customerName, amount: i.todayAmount, direction: 'IN' as const }));
    const pay = daily.pay.map(p => ({ id: `pay-${p.id}`, type: `Payment ${p.partyType === 'SUPPLIER' ? 'Out' : 'In'}`, reference: p.referenceNo || '-', party: p.partyName, amount: p.amount, direction: p.partyType === 'SUPPLIER' ? 'OUT' as const : 'IN' as const }));
    return [...veh, ...pinv, ...sinv, ...pay];
  }, [daily]);

  const dailyTable = useDataTable<(typeof dailyTransactions)[number], 'type' | 'reference' | 'party' | 'amount'>({
    data: dailyTransactions,
    initialSortBy: 'amount',
    initialSortDir: 'desc',
    initialPageSize: 12,
    pageSizeOptions: [8, 12, 20, 50],
    sortComparators: {
      type: (a, b) => a.type.localeCompare(b.type),
      reference: (a, b) => a.reference.localeCompare(b.reference),
      party: (a, b) => a.party.localeCompare(b.party),
      amount: (a, b) => a.amount - b.amount,
    },
    resetPageOn: [activeReport, selectedDate],
  });

  // ══════════════════════════════════════════════
  // REPORT 2: DATE RANGE
  // ══════════════════════════════════════════════
  const rangeData = useMemo(() => {
    const veh = savedVehicles.filter(v => inRange(v.date));
    const pinv = purchaseInvoices.filter(i => inRange(i.date));
    const sinv = invoices.filter(i => inRange(i.date));
    const pay = payments.filter(p => inRange(p.date));

    const totalPurchase = veh.reduce((s, v) => s + v.totalAmount, 0) + pinv.reduce((s, i) => s + i.todayAmount, 0);
    const totalSales = sinv.reduce((s, i) => s + i.todayAmount, 0);
    const totalPaidOut = pay.filter(p => p.partyType === 'SUPPLIER').reduce((s, p) => s + p.amount, 0);
    const totalReceived = pay.filter(p => p.partyType === 'CUSTOMER').reduce((s, p) => s + p.amount, 0);

    // Day-wise breakdown
    const dayMap = new Map<string, { purchase: number; sales: number; paidOut: number; received: number }>();
    [...veh.map(v => ({ d: v.date, purchase: v.totalAmount, sales: 0 })),
     ...pinv.map(i => ({ d: i.date, purchase: i.todayAmount, sales: 0 })),
     ...sinv.map(i => ({ d: i.date, purchase: 0, sales: i.todayAmount })),
    ].forEach(r => {
      const ex = dayMap.get(r.d) || { purchase: 0, sales: 0, paidOut: 0, received: 0 };
      ex.purchase += r.purchase;
      ex.sales += r.sales;
      dayMap.set(r.d, ex);
    });
    pay.forEach(p => {
      const ex = dayMap.get(p.date) || { purchase: 0, sales: 0, paidOut: 0, received: 0 };
      if (p.partyType === 'SUPPLIER') ex.paidOut += p.amount;
      else ex.received += p.amount;
      dayMap.set(p.date, ex);
    });
    const days = Array.from(dayMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    return { totalPurchase, totalSales, totalPaidOut, totalReceived, days, vehCount: veh.length, pinvCount: pinv.length, sinvCount: sinv.length, payCount: pay.length };
  }, [dateFrom, dateTo, savedVehicles, purchaseInvoices, invoices, payments]);

  const rangeRows = useMemo(() => rangeData.days.map(([date, d]) => ({ date, ...d, net: d.received - d.paidOut })), [rangeData.days]);
  const rangeTable = useDataTable<(typeof rangeRows)[number], 'date' | 'purchase' | 'sales' | 'paidOut' | 'received' | 'net'>({
    data: rangeRows,
    initialSortBy: 'date',
    initialSortDir: 'asc',
    initialPageSize: 10,
    pageSizeOptions: [10, 20, 50],
    sortComparators: {
      date: (a, b) => a.date.localeCompare(b.date),
      purchase: (a, b) => a.purchase - b.purchase,
      sales: (a, b) => a.sales - b.sales,
      paidOut: (a, b) => a.paidOut - b.paidOut,
      received: (a, b) => a.received - b.received,
      net: (a, b) => a.net - b.net,
    },
    resetPageOn: [activeReport, dateFrom, dateTo],
  });

  // ══════════════════════════════════════════════
  // REPORT 3: PARTY-WISE
  // ══════════════════════════════════════════════
  const partyData = useMemo(() => {
    const supMap = new Map<string, { name: string; purchase: number; paid: number; balance: number }>();
    suppliers.forEach(s => {
      let purchase = s.previousBalance;
      savedVehicles.forEach(v => v.rows.filter(r => r.supplierId === s.id).forEach(r => { purchase += r.amount; }));
      purchaseInvoices.filter(i => i.supplierId === s.id).forEach(i => { purchase += i.todayAmount; });
      const paid = payments.filter(p => p.partyType === 'SUPPLIER' && p.partyId === s.id).reduce((a, p) => a + p.amount, 0)
        + purchaseInvoices.filter(i => i.supplierId === s.id).reduce((a, i) => a + i.paidAmount, 0);
      supMap.set(s.id, { name: s.name, purchase, paid, balance: purchase - paid });
    });

    const custMap = new Map<string, { name: string; sales: number; received: number; balance: number }>();
    customers.forEach(c => {
      let sales = c.previousBalance;
      invoices.filter(i => i.customerId === c.id).forEach(i => { sales += i.todayAmount; });
      const received = payments.filter(p => p.partyType === 'CUSTOMER' && p.partyId === c.id).reduce((a, p) => a + p.amount, 0)
        + invoices.filter(i => i.customerId === c.id).reduce((a, i) => a + i.paidAmount, 0);
      custMap.set(c.id, { name: c.name, sales, received, balance: sales - received });
    });

    return {
      suppliers: Array.from(supMap.values()).sort((a, b) => b.balance - a.balance),
      customers: Array.from(custMap.values()).sort((a, b) => b.balance - a.balance),
    };
  }, [suppliers, customers, savedVehicles, purchaseInvoices, invoices, payments]);

  const supplierTable = useDataTable<(typeof partyData.suppliers)[number], 'name' | 'purchase' | 'paid' | 'balance'>({
    data: partyData.suppliers,
    initialSortBy: 'balance',
    initialSortDir: 'desc',
    initialPageSize: 10,
    pageSizeOptions: [10, 20, 50],
    sortComparators: {
      name: (a, b) => a.name.localeCompare(b.name),
      purchase: (a, b) => a.purchase - b.purchase,
      paid: (a, b) => a.paid - b.paid,
      balance: (a, b) => a.balance - b.balance,
    },
    resetPageOn: [activeReport],
  });

  const customerTable = useDataTable<(typeof partyData.customers)[number], 'name' | 'sales' | 'received' | 'balance'>({
    data: partyData.customers,
    initialSortBy: 'balance',
    initialSortDir: 'desc',
    initialPageSize: 10,
    pageSizeOptions: [10, 20, 50],
    sortComparators: {
      name: (a, b) => a.name.localeCompare(b.name),
      sales: (a, b) => a.sales - b.sales,
      received: (a, b) => a.received - b.received,
      balance: (a, b) => a.balance - b.balance,
    },
    resetPageOn: [activeReport],
  });

  // ══════════════════════════════════════════════
  // REPORT 4: FRUIT & VARIETY
  // ══════════════════════════════════════════════
  const fruitData = useMemo(() => {
    const map = new Map<string, { fruit: string; variety: string; purchased: number; purchaseAmt: number; sold: number; salesAmt: number; stock: number }>();
    savedVehicles.forEach(v => v.rows.forEach(r => {
      const k = `${v.fruitType}||${r.variety}`;
      const e = map.get(k) || { fruit: v.fruitType, variety: r.variety, purchased: 0, purchaseAmt: 0, sold: 0, salesAmt: 0, stock: 0 };
      e.purchased += Number(r.weight) || 0; e.purchaseAmt += r.amount; map.set(k, e);
    }));
    purchaseInvoices.forEach(inv => inv.items.forEach(it => {
      const k = `${it.fruit}||${it.variety}`;
      const e = map.get(k) || { fruit: it.fruit, variety: it.variety, purchased: 0, purchaseAmt: 0, sold: 0, salesAmt: 0, stock: 0 };
      e.purchased += Number(it.weight) || 0; e.purchaseAmt += it.amount; map.set(k, e);
    }));
    invoices.forEach(inv => inv.items.forEach(it => {
      const k = `${it.fruit}||${it.lotVariety}`;
      const e = map.get(k) || { fruit: it.fruit, variety: it.lotVariety, purchased: 0, purchaseAmt: 0, sold: 0, salesAmt: 0, stock: 0 };
      e.sold += Number(it.weight) || 0; e.salesAmt += it.amount; map.set(k, e);
    }));
    map.forEach(v => { v.stock = v.purchased - v.sold; });
    return Array.from(map.values()).sort((a, b) => b.purchaseAmt + b.salesAmt - a.purchaseAmt - a.salesAmt);
  }, [savedVehicles, purchaseInvoices, invoices]);

  const fruitTable = useDataTable<(typeof fruitData)[number], 'fruit' | 'variety' | 'purchased' | 'purchaseAmt' | 'sold' | 'salesAmt' | 'stock'>({
    data: fruitData,
    initialSortBy: 'salesAmt',
    initialSortDir: 'desc',
    initialPageSize: 12,
    pageSizeOptions: [10, 12, 25, 50],
    sortComparators: {
      fruit: (a, b) => a.fruit.localeCompare(b.fruit),
      variety: (a, b) => a.variety.localeCompare(b.variety),
      purchased: (a, b) => a.purchased - b.purchased,
      purchaseAmt: (a, b) => a.purchaseAmt - b.purchaseAmt,
      sold: (a, b) => a.sold - b.sold,
      salesAmt: (a, b) => a.salesAmt - b.salesAmt,
      stock: (a, b) => a.stock - b.stock,
    },
    resetPageOn: [activeReport],
  });

  // ══════════════════════════════════════════════
  // REPORT 5: OUTSTANDING
  // ══════════════════════════════════════════════
  const outstandingData = useMemo(() => {
    const totalSupPayable = partyData.suppliers.reduce((s, x) => s + x.balance, 0);
    const totalCustReceivable = partyData.customers.reduce((s, x) => s + x.balance, 0);
    return { totalSupPayable, totalCustReceivable, net: totalCustReceivable - totalSupPayable };
  }, [partyData]);

  // ══════════════════════════════════════════════
  // REPORT 6: P&L
  // ══════════════════════════════════════════════
  const pnlData = useMemo(() => {
    const totalPurchase = savedVehicles.reduce((s, v) => s + v.totalAmount, 0) + purchaseInvoices.reduce((s, i) => s + i.todayAmount, 0);
    const totalSales = invoices.reduce((s, i) => s + i.todayAmount, 0);
    const totalFreight = savedVehicles.reduce((s, v) => s + (v.freightCharge || 0), 0) + purchaseInvoices.reduce((s, i) => s + (i.freight || 0), 0);
    const totalHamali = savedVehicles.reduce((s, v) => s + (v.hamaliCharge || 0), 0) + purchaseInvoices.reduce((s, i) => s + (i.hamali || 0), 0) + invoices.reduce((s, i) => s + (i.hamali || 0), 0);
    const totalDiscount = invoices.reduce((s, i) => s + (i.discount || 0), 0);
    const grossProfit = totalSales - totalPurchase;
    const netProfit = grossProfit + totalHamali - totalFreight - totalDiscount;
    const margin = totalSales > 0 ? ((grossProfit / totalSales) * 100) : 0;
    return { totalPurchase, totalSales, totalFreight, totalHamali, totalDiscount, grossProfit, netProfit, margin };
  }, [savedVehicles, purchaseInvoices, invoices]);

  // ── Cell helper ─────────────────────────────
  const C = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`erp-panel p-5 rounded-xl ${className}`}>{children}</div>
  );

  const Lbl = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8] mb-1">{children}</div>
  );

  const Big = ({ children, color = 'dark:text-white text-slate-900' }: { children: React.ReactNode; color?: string }) => (
    <div className={`text-xl font-semibold font-mono ${color}`}>{children}</div>
  );

  return (
    <div className={`space-y-6 font-sans ${isCompact ? 'table-compact' : ''}`}>

      {/* ── HEADER ─────────────────────────────────── */}
      <div className="erp-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
        <div>
          <h1 className="erp-title text-[1.1rem] flex items-center space-x-2.5">
            <FileBarChart2 className="w-6 h-6 text-[#00aeef]" />
            <span>REPORTS & ANALYTICS CENTER</span>
          </h1>
          <p className="erp-subtitle mt-1">Daily summaries, date-range analysis, party ledgers, fruit performance, outstanding and P&L</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <button onClick={() => setDensity(density === 'compact' ? 'comfortable' : density === 'comfortable' ? 'spacious' : 'compact')} className="erp-btn-secondary px-3 py-2 text-xs cursor-pointer">
            {density === 'compact' ? 'Compact' : density === 'comfortable' ? 'Comfortable' : 'Spacious'}
          </button>
          <button onClick={() => setShowReportPreview(true)} className="erp-btn-secondary flex items-center space-x-1.5 px-4 py-2 text-xs cursor-pointer">
            <Printer className="w-4 h-4" /><span>Print Report</span>
          </button>
        </div>
      </div>

      {/* ── REPORT TAB SWITCHER ────────────────────── */}
      <div className="flex flex-wrap gap-2 no-print">
        {reportTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveReport(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              activeReport === tab.id
                ? 'bg-[linear-gradient(135deg,#00C896,#00AEEF)] text-white border-transparent shadow-[0_8px_20px_rgba(0,174,239,0.22)]'
                : 'bg-white border-[#e2e8f0] text-[#475569] hover:border-[#00aeef]/40'
            }`}
          >
            {tab.icon}<span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════
          REPORT 1: DAILY SUMMARY
         ══════════════════════════════════════════════ */}
      {activeReport === 'DAILY' && (
        <div className="space-y-5 animate-slide-up">
          <div className="flex items-center space-x-3 no-print">
            <label className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">Select Date:</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="erp-input min-h-0 bg-white font-mono rounded-lg px-3 py-2 text-xs" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            <C><Lbl>🚛 Vehicle Loads</Lbl><Big>{daily.veh.length}</Big></C>
            <C><Lbl>📥 Purchase Bills</Lbl><Big>{daily.pinv.length}</Big></C>
            <C><Lbl>📤 Sales Invoices</Lbl><Big>{daily.sinv.length}</Big></C>
            <C><Lbl>💰 Payments Made</Lbl><Big>{daily.pay.length}</Big></C>
            <C><Lbl>📦 Weight IN (KG)</Lbl><Big color="text-emerald-600 dark:text-emerald-400">{daily.totalWeightIn.toLocaleString()}</Big></C>
            <C><Lbl>📦 Weight OUT (KG)</Lbl><Big color="text-indigo-600 dark:text-indigo-400">{daily.totalWeightOut.toLocaleString()}</Big></C>
            <C><Lbl>⚖️ Net Weight Change</Lbl><Big color={(daily.totalWeightIn - daily.totalWeightOut) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>{(daily.totalWeightIn - daily.totalWeightOut >= 0 ? '+' : '') + (daily.totalWeightIn - daily.totalWeightOut).toLocaleString()} KG</Big></C>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <C><Lbl>🚛 Veh. Purchase Amt</Lbl><Big color="text-rose-600 dark:text-rose-400">₹ {daily.totalPurchaseVehicle.toLocaleString('en-IN')}</Big></C>
            <C><Lbl>📄 Direct Purchase Amt</Lbl><Big color="text-rose-600 dark:text-rose-400">₹ {daily.totalPurchaseBill.toLocaleString('en-IN')}</Big></C>
            <C><Lbl>💵 Total Sales Amt</Lbl><Big color="text-emerald-600 dark:text-emerald-400">₹ {daily.totalSales.toLocaleString('en-IN')}</Big></C>
            <C><Lbl>⬆️ Cash Paid Out</Lbl><Big color="text-rose-600 dark:text-rose-400">₹ {daily.totalPaidOut.toLocaleString('en-IN')}</Big></C>
            <C><Lbl>⬇️ Cash Received</Lbl><Big color="text-emerald-600 dark:text-emerald-400">₹ {daily.totalReceived.toLocaleString('en-IN')}</Big></C>
          </div>

          {/* Transactions table for the day */}
          {isLoading ? (
            <div className="erp-table-wrap rounded-xl"><TableSkeleton rows={6} cols={4} compact={isCompact} /></div>
          ) : (daily.veh.length > 0 || daily.sinv.length > 0 || daily.pinv.length > 0 || daily.pay.length > 0) ? (
            <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 overflow-hidden shadow-sm">
              <div className="px-5 py-3 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 text-xs font-bold dark:text-slate-300 text-slate-800 uppercase tracking-wider">All Transactions — {selectedDate}</div>
              <DataTable
                footer={
                  <Pagination
                    page={dailyTable.page}
                    totalPages={dailyTable.totalPages}
                    totalRecords={dailyTable.totalRecords}
                    pageSize={dailyTable.pageSize}
                    pageSizeOptions={dailyTable.pageSizeOptions}
                    onPageChange={dailyTable.setPage}
                    onPageSizeChange={dailyTable.setPageSize}
                    label="transactions"
                  />
                }
              >
                <table className="erp-table w-full text-left text-xs">
                  <thead><tr className="dark:bg-slate-900/50 bg-slate-100 dark:text-slate-400 text-slate-600 uppercase font-bold text-[10px] border-b dark:border-slate-800 border-slate-200">
                    <th className="py-2.5 px-4"><button type="button" onClick={() => dailyTable.toggleSort('type')} className="inline-flex items-center gap-1">Type <ArrowUpDown className="w-3 h-3" /></button></th><th className="py-2.5 px-3"><button type="button" onClick={() => dailyTable.toggleSort('reference')} className="inline-flex items-center gap-1">Reference <ArrowUpDown className="w-3 h-3" /></button></th><th className="py-2.5 px-3"><button type="button" onClick={() => dailyTable.toggleSort('party')} className="inline-flex items-center gap-1">Party <ArrowUpDown className="w-3 h-3" /></button></th><th className="py-2.5 px-3 text-right"><button type="button" onClick={() => dailyTable.toggleSort('amount')} className="inline-flex items-center gap-1 ml-auto">Amount <ArrowUpDown className="w-3 h-3" /></button></th>
                  </tr></thead>
                  <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                    {dailyTable.pageRows.map(tx => <tr key={tx.id} className="dark:hover:bg-slate-800/40 hover:bg-slate-50"><td className="py-2.5 px-4"><span className={`font-bold ${tx.direction === 'OUT' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{tx.type}</span></td><td className="py-2.5 px-3 font-mono font-bold dark:text-white text-slate-900">{tx.reference}</td><td className="py-2.5 px-3 dark:text-slate-300 text-slate-700">{tx.party}</td><td className={`py-2.5 px-3 text-right font-mono font-bold ${tx.direction === 'OUT' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>₹ {tx.amount.toLocaleString('en-IN')}</td></tr>)}
                  </tbody>
                </table>
              </DataTable>
            </div>
          ) : (
            <div className="erp-table-wrap rounded-xl">
              <ModuleEmptyState
                title="No transactions for selected date"
                subtitle="Try another date or start recording purchase, sales, and payment entries."
              />
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          REPORT 2: DATE RANGE
         ══════════════════════════════════════════════ */}
      {activeReport === 'DATERANGE' && (
        <div className="space-y-5 animate-slide-up">
          <div className="flex flex-wrap items-center gap-3 no-print">
            <label className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">From:</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="erp-input min-h-0 bg-white font-mono rounded-lg px-3 py-2 text-xs" />
            <label className="text-xs font-semibold text-[#64748b] uppercase tracking-wider">To:</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="erp-input min-h-0 bg-white font-mono rounded-lg px-3 py-2 text-xs" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <C><Lbl>Total Purchase</Lbl><Big color="text-rose-600 dark:text-rose-400">₹ {rangeData.totalPurchase.toLocaleString('en-IN')}</Big><div className="text-[10px] dark:text-slate-500 text-slate-400 mt-1 font-medium">{rangeData.vehCount} loads + {rangeData.pinvCount} bills</div></C>
            <C><Lbl>Total Sales</Lbl><Big color="text-emerald-600 dark:text-emerald-400">₹ {rangeData.totalSales.toLocaleString('en-IN')}</Big><div className="text-[10px] dark:text-slate-500 text-slate-400 mt-1 font-medium">{rangeData.sinvCount} invoices</div></C>
            <C><Lbl>Cash Paid Out</Lbl><Big color="text-rose-600 dark:text-rose-400">₹ {rangeData.totalPaidOut.toLocaleString('en-IN')}</Big></C>
            <C><Lbl>Cash Received</Lbl><Big color="text-emerald-600 dark:text-emerald-400">₹ {rangeData.totalReceived.toLocaleString('en-IN')}</Big></C>
          </div>

          {/* Day-wise breakdown table */}
          {isLoading ? (
            <div className="erp-table-wrap rounded-xl"><TableSkeleton rows={6} cols={6} compact={isCompact} /></div>
          ) : rangeData.days.length > 0 ? (
            <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 overflow-hidden shadow-sm">
              <div className="px-5 py-3 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 text-xs font-bold dark:text-slate-300 text-slate-800 uppercase tracking-wider">Day-wise Breakdown</div>
              <DataTable
                footer={
                  <Pagination
                    page={rangeTable.page}
                    totalPages={rangeTable.totalPages}
                    totalRecords={rangeTable.totalRecords}
                    pageSize={rangeTable.pageSize}
                    pageSizeOptions={rangeTable.pageSizeOptions}
                    onPageChange={rangeTable.setPage}
                    onPageSizeChange={rangeTable.setPageSize}
                    label="days"
                  />
                }
              >
                <table className="erp-table w-full text-left text-xs">
                  <thead><tr className="dark:bg-slate-900/50 bg-slate-100 dark:text-slate-400 text-slate-600 uppercase font-bold text-[10px] border-b dark:border-slate-800 border-slate-200">
                    <th className="py-2.5 px-4"><button type="button" onClick={() => rangeTable.toggleSort('date')} className="inline-flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3" /></button></th><th className="py-2.5 px-3 text-right"><button type="button" onClick={() => rangeTable.toggleSort('purchase')} className="inline-flex items-center gap-1 ml-auto">Purchase <ArrowUpDown className="w-3 h-3" /></button></th><th className="py-2.5 px-3 text-right"><button type="button" onClick={() => rangeTable.toggleSort('sales')} className="inline-flex items-center gap-1 ml-auto">Sales <ArrowUpDown className="w-3 h-3" /></button></th><th className="py-2.5 px-3 text-right"><button type="button" onClick={() => rangeTable.toggleSort('paidOut')} className="inline-flex items-center gap-1 ml-auto">Paid Out <ArrowUpDown className="w-3 h-3" /></button></th><th className="py-2.5 px-3 text-right"><button type="button" onClick={() => rangeTable.toggleSort('received')} className="inline-flex items-center gap-1 ml-auto">Received <ArrowUpDown className="w-3 h-3" /></button></th><th className="py-2.5 px-4 text-right"><button type="button" onClick={() => rangeTable.toggleSort('net')} className="inline-flex items-center gap-1 ml-auto">Net Cash Flow <ArrowUpDown className="w-3 h-3" /></button></th>
                  </tr></thead>
                  <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100 font-mono">
                    {rangeTable.pageRows.map((d) => {
                      const net = d.net;
                      return (<tr key={d.date} className="dark:hover:bg-slate-800/40 hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-semibold dark:text-slate-200 text-slate-800">{d.date}</td>
                        <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400 font-semibold">{d.purchase > 0 ? `₹ ${d.purchase.toLocaleString('en-IN')}` : '—'}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{d.sales > 0 ? `₹ ${d.sales.toLocaleString('en-IN')}` : '—'}</td>
                        <td className="py-2.5 px-3 text-right text-rose-600 dark:text-rose-400">{d.paidOut > 0 ? `₹ ${d.paidOut.toLocaleString('en-IN')}` : '—'}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">{d.received > 0 ? `₹ ${d.received.toLocaleString('en-IN')}` : '—'}</td>
                        <td className={`py-2.5 px-4 text-right font-bold ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{net >= 0 ? '+' : ''}₹ {net.toLocaleString('en-IN')}</td>
                      </tr>);
                    })}
                  </tbody>
                </table>
              </DataTable>
            </div>
          ) : (
            <div className="erp-table-wrap rounded-xl">
              <ModuleEmptyState
                title="No activity in selected date range"
                subtitle="Adjust From/To dates to inspect day-wise cash movement and turnover."
              />
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          REPORT 3: PARTY-WISE
         ══════════════════════════════════════════════ */}
      {activeReport === 'PARTY' && (
        <div className="space-y-6 animate-slide-up">
          {/* Suppliers */}
          <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2 text-xs font-bold dark:text-emerald-400 text-emerald-700 uppercase tracking-wider">
              <Users className="w-4 h-4" /><span>Supplier-wise Summary (Payables)</span>
            </div>
            <DataTable
              footer={<Pagination page={supplierTable.page} totalPages={supplierTable.totalPages} totalRecords={supplierTable.totalRecords} pageSize={supplierTable.pageSize} pageSizeOptions={supplierTable.pageSizeOptions} onPageChange={supplierTable.setPage} onPageSizeChange={supplierTable.setPageSize} label="suppliers" />}
            >
              <table className="erp-table w-full text-left text-xs">
                <thead><tr className="dark:bg-slate-900/50 bg-slate-100 dark:text-slate-400 text-slate-600 uppercase font-bold text-[10px] border-b dark:border-slate-800 border-slate-200">
                  <th className="py-2.5 px-4"><button type="button" onClick={() => supplierTable.toggleSort('name')} className="inline-flex items-center gap-1">Supplier Name <ArrowUpDown className="w-3 h-3" /></button></th><th className="py-2.5 px-3 text-right"><button type="button" onClick={() => supplierTable.toggleSort('purchase')} className="inline-flex items-center gap-1 ml-auto">Total Purchase <ArrowUpDown className="w-3 h-3" /></button></th><th className="py-2.5 px-3 text-right"><button type="button" onClick={() => supplierTable.toggleSort('paid')} className="inline-flex items-center gap-1 ml-auto">Total Paid <ArrowUpDown className="w-3 h-3" /></button></th><th className="py-2.5 px-4 text-right font-black"><button type="button" onClick={() => supplierTable.toggleSort('balance')} className="inline-flex items-center gap-1 ml-auto">Outstanding <ArrowUpDown className="w-3 h-3" /></button></th>
                </tr></thead>
                <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                  {supplierTable.pageRows.map(s => (
                    <tr key={s.name} className="dark:hover:bg-slate-800/40 hover:bg-slate-50 font-sans">
                      <td className="py-2.5 px-4 font-bold dark:text-white text-slate-900">{s.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-600 dark:text-rose-400">₹ {s.purchase.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">₹ {s.paid.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-black dark:text-white text-slate-900">₹ {s.balance.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="dark:bg-slate-950 bg-slate-100 font-bold border-t-2 dark:border-slate-700 border-slate-300">
                  <td className="py-2.5 px-4 text-right text-[10px] uppercase tracking-wider dark:text-slate-400 text-slate-500">TOTAL</td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400">₹ {partyData.suppliers.reduce((s,x)=>s+x.purchase,0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">₹ {partyData.suppliers.reduce((s,x)=>s+x.paid,0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-black dark:text-white text-slate-900 text-sm">₹ {partyData.suppliers.reduce((s,x)=>s+x.balance,0).toLocaleString('en-IN')}</td>
                </tr></tfoot>
              </table>
            </DataTable>
          </div>

          {/* Customers */}
          <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2 text-xs font-bold dark:text-indigo-400 text-indigo-700 uppercase tracking-wider">
              <UserCheck className="w-4 h-4" /><span>Customer-wise Summary (Receivables)</span>
            </div>
            <DataTable
              footer={<Pagination page={customerTable.page} totalPages={customerTable.totalPages} totalRecords={customerTable.totalRecords} pageSize={customerTable.pageSize} pageSizeOptions={customerTable.pageSizeOptions} onPageChange={customerTable.setPage} onPageSizeChange={customerTable.setPageSize} label="customers" />}
            >
              <table className="erp-table w-full text-left text-xs">
                <thead><tr className="dark:bg-slate-900/50 bg-slate-100 dark:text-slate-400 text-slate-600 uppercase font-bold text-[10px] border-b dark:border-slate-800 border-slate-200">
                  <th className="py-2.5 px-4"><button type="button" onClick={() => customerTable.toggleSort('name')} className="inline-flex items-center gap-1">Customer Name <ArrowUpDown className="w-3 h-3" /></button></th><th className="py-2.5 px-3 text-right"><button type="button" onClick={() => customerTable.toggleSort('sales')} className="inline-flex items-center gap-1 ml-auto">Total Sales <ArrowUpDown className="w-3 h-3" /></button></th><th className="py-2.5 px-3 text-right"><button type="button" onClick={() => customerTable.toggleSort('received')} className="inline-flex items-center gap-1 ml-auto">Total Received <ArrowUpDown className="w-3 h-3" /></button></th><th className="py-2.5 px-4 text-right font-black"><button type="button" onClick={() => customerTable.toggleSort('balance')} className="inline-flex items-center gap-1 ml-auto">Outstanding <ArrowUpDown className="w-3 h-3" /></button></th>
                </tr></thead>
                <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                  {customerTable.pageRows.map(c => (
                    <tr key={c.name} className="dark:hover:bg-slate-800/40 hover:bg-slate-50 font-sans">
                      <td className="py-2.5 px-4 font-bold dark:text-white text-slate-900">{c.name}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">₹ {c.sales.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600 dark:text-emerald-400">₹ {c.received.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-black dark:text-white text-slate-900">₹ {c.balance.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="dark:bg-slate-950 bg-slate-100 font-bold border-t-2 dark:border-slate-700 border-slate-300">
                  <td className="py-2.5 px-4 text-right text-[10px] uppercase tracking-wider dark:text-slate-400 text-slate-500">TOTAL</td>
                  <td className="py-2.5 px-3 text-right font-mono text-indigo-600 dark:text-indigo-400">₹ {partyData.customers.reduce((s,x)=>s+x.sales,0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400">₹ {partyData.customers.reduce((s,x)=>s+x.received,0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-black dark:text-white text-slate-900 text-sm">₹ {partyData.customers.reduce((s,x)=>s+x.balance,0).toLocaleString('en-IN')}</td>
                </tr></tfoot>
              </table>
            </DataTable>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          REPORT 4: FRUIT & VARIETY
         ══════════════════════════════════════════════ */}
      {activeReport === 'FRUIT' && (
        <div className="space-y-5 animate-slide-up">
          <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2 text-xs font-bold dark:text-teal-400 text-teal-700 uppercase tracking-wider">
              <Package className="w-4 h-4" /><span>Fruit & Variety Performance — Purchase vs Sales vs Stock</span>
            </div>
            <DataTable
              footer={<Pagination page={fruitTable.page} totalPages={fruitTable.totalPages} totalRecords={fruitTable.totalRecords} pageSize={fruitTable.pageSize} pageSizeOptions={fruitTable.pageSizeOptions} onPageChange={fruitTable.setPage} onPageSizeChange={fruitTable.setPageSize} label="fruit lines" />}
            >
              <table className="erp-table w-full text-left text-xs">
                <thead><tr className="dark:bg-slate-900/50 bg-slate-100 dark:text-slate-400 text-slate-600 uppercase font-bold text-[10px] border-b dark:border-slate-800 border-slate-200">
                  <th className="py-2.5 px-4"><button type="button" onClick={() => fruitTable.toggleSort('fruit')} className="inline-flex items-center gap-1">Fruit <ArrowUpDown className="w-3 h-3" /></button></th><th className="py-2.5 px-3"><button type="button" onClick={() => fruitTable.toggleSort('variety')} className="inline-flex items-center gap-1">Variety <ArrowUpDown className="w-3 h-3" /></button></th>
                  <th className="py-2.5 px-3 text-right"><button type="button" onClick={() => fruitTable.toggleSort('purchased')} className="inline-flex items-center gap-1 ml-auto">Purchased (KG) <ArrowUpDown className="w-3 h-3" /></button></th><th className="py-2.5 px-3 text-right"><button type="button" onClick={() => fruitTable.toggleSort('purchaseAmt')} className="inline-flex items-center gap-1 ml-auto">Purchase ₹ <ArrowUpDown className="w-3 h-3" /></button></th>
                  <th className="py-2.5 px-3 text-right"><button type="button" onClick={() => fruitTable.toggleSort('sold')} className="inline-flex items-center gap-1 ml-auto">Sold (KG) <ArrowUpDown className="w-3 h-3" /></button></th><th className="py-2.5 px-3 text-right"><button type="button" onClick={() => fruitTable.toggleSort('salesAmt')} className="inline-flex items-center gap-1 ml-auto">Sales ₹ <ArrowUpDown className="w-3 h-3" /></button></th>
                  <th className="py-2.5 px-3 text-right">Avg Buy/KG</th><th className="py-2.5 px-3 text-right">Avg Sell/KG</th>
                  <th className="py-2.5 px-4 text-right font-black"><button type="button" onClick={() => fruitTable.toggleSort('stock')} className="inline-flex items-center gap-1 ml-auto">Stock (KG) <ArrowUpDown className="w-3 h-3" /></button></th>
                </tr></thead>
                <tbody className="divide-y dark:divide-slate-800/60 divide-slate-100">
                  {fruitTable.pageRows.map((f, i) => {
                    const avgBuy = f.purchased > 0 ? f.purchaseAmt / f.purchased : 0;
                    const avgSell = f.sold > 0 ? f.salesAmt / f.sold : 0;
                    return (
                      <tr key={i} className="dark:hover:bg-slate-800/40 hover:bg-slate-50 font-sans">
                        <td className="py-2.5 px-4 font-bold dark:text-white text-slate-900">{f.fruit}</td>
                        <td className="py-2.5 px-3 font-semibold dark:text-slate-200 text-slate-800">{f.variety}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold">{f.purchased.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-semibold">₹ {f.purchaseAmt.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold">{f.sold.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">₹ {f.salesAmt.toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-3 text-right font-mono dark:text-slate-400 text-slate-600">₹{avgBuy.toFixed(1)}</td>
                        <td className="py-2.5 px-3 text-right font-mono dark:text-slate-400 text-slate-600">₹{avgSell.toFixed(1)}</td>
                        <td className={`py-2.5 px-4 text-right font-mono font-black ${f.stock > 0 ? 'text-teal-600 dark:text-teal-400' : f.stock < 0 ? 'text-rose-600 dark:text-rose-400' : 'dark:text-slate-500 text-slate-400'}`}>{f.stock.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot><tr className="dark:bg-slate-950 bg-slate-100 font-bold border-t-2 dark:border-slate-700 border-slate-300">
                  <td colSpan={2} className="py-2.5 px-4 text-right text-[10px] uppercase tracking-wider dark:text-slate-400 text-slate-500">GRAND TOTAL</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">{fruitData.reduce((s,f)=>s+f.purchased,0).toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-bold">₹ {fruitData.reduce((s,f)=>s+f.purchaseAmt,0).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold">{fruitData.reduce((s,f)=>s+f.sold,0).toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">₹ {fruitData.reduce((s,f)=>s+f.salesAmt,0).toLocaleString('en-IN')}</td>
                  <td colSpan={2}></td>
                  <td className="py-2.5 px-4 text-right font-mono font-black dark:text-teal-400 text-teal-700 text-sm">{fruitData.reduce((s,f)=>s+f.stock,0).toLocaleString()}</td>
                </tr></tfoot>
              </table>
            </DataTable>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          REPORT 5: OUTSTANDING
         ══════════════════════════════════════════════ */}
      {activeReport === 'OUTSTANDING' && (
        <div className="space-y-5 animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <C className="border-l-4 border-l-rose-500">
              <Lbl>Total Supplier Payable (We Owe)</Lbl>
              <Big color="text-rose-600 dark:text-rose-400">₹ {outstandingData.totalSupPayable.toLocaleString('en-IN')}</Big>
              <div className="text-[10px] dark:text-slate-500 text-slate-400 mt-1 font-medium">{partyData.suppliers.filter(s => s.balance > 0).length} suppliers with outstanding</div>
            </C>
            <C className="border-l-4 border-l-indigo-500">
              <Lbl>Total Customer Receivable (They Owe)</Lbl>
              <Big color="text-indigo-600 dark:text-indigo-400">₹ {outstandingData.totalCustReceivable.toLocaleString('en-IN')}</Big>
              <div className="text-[10px] dark:text-slate-500 text-slate-400 mt-1 font-medium">{partyData.customers.filter(c => c.balance > 0).length} customers with dues</div>
            </C>
            <C className={`border-l-4 ${outstandingData.net >= 0 ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
              <Lbl>Net Position (Receivable − Payable)</Lbl>
              <Big color={outstandingData.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>₹ {outstandingData.net.toLocaleString('en-IN')}</Big>
              <div className="text-[10px] dark:text-slate-500 text-slate-400 mt-1 font-bold">{outstandingData.net >= 0 ? '✅ Net Positive — Healthy' : '⚠️ Net Negative — Cash Required'}</div>
            </C>
          </div>

          {/* Top overdue parties */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 overflow-hidden shadow-sm">
              <div className="px-5 py-3 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 text-xs font-bold dark:text-rose-400 text-rose-700 uppercase tracking-wider flex items-center space-x-2"><ArrowUpRight className="w-4 h-4" /><span>Top Supplier Payables</span></div>
              <div className="divide-y dark:divide-slate-800/60 divide-slate-100 max-h-[350px] overflow-y-auto">
                {partyData.suppliers.filter(s => s.balance > 0).map(s => (
                  <div key={s.name} className="flex items-center justify-between px-5 py-3 dark:hover:bg-slate-800/40 hover:bg-slate-50">
                    <span className="font-bold dark:text-white text-slate-900 text-sm truncate max-w-[200px]">{s.name}</span>
                    <span className="font-mono font-black text-rose-600 dark:text-rose-400">₹ {s.balance.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                {partyData.suppliers.filter(s => s.balance > 0).length === 0 && (
                  <ModuleEmptyState title="No supplier payables" subtitle="All supplier balances are currently settled." />
                )}
              </div>
            </div>
            <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 overflow-hidden shadow-sm">
              <div className="px-5 py-3 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 text-xs font-bold dark:text-indigo-400 text-indigo-700 uppercase tracking-wider flex items-center space-x-2"><ArrowDownRight className="w-4 h-4" /><span>Top Customer Receivables</span></div>
              <div className="divide-y dark:divide-slate-800/60 divide-slate-100 max-h-[350px] overflow-y-auto">
                {partyData.customers.filter(c => c.balance > 0).map(c => (
                  <div key={c.name} className="flex items-center justify-between px-5 py-3 dark:hover:bg-slate-800/40 hover:bg-slate-50">
                    <span className="font-bold dark:text-white text-slate-900 text-sm truncate max-w-[200px]">{c.name}</span>
                    <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">₹ {c.balance.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                {partyData.customers.filter(c => c.balance > 0).length === 0 && (
                  <ModuleEmptyState title="No customer receivables" subtitle="No pending customer dues in the current dataset." />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          REPORT 6: TRADING PROFIT & LOSS
         ══════════════════════════════════════════════ */}
      {activeReport === 'PNL' && (
        <div className="space-y-5 animate-slide-up">
          <div className="dark:bg-slate-900 bg-white rounded-2xl border dark:border-slate-800 border-slate-200 overflow-hidden shadow-lg">
            <div className="px-6 py-4 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center space-x-2 text-sm font-bold dark:text-white text-slate-900 uppercase tracking-wider">
             <Banknote className="w-5 h-5 text-amber-500" /><span>Trading Profit & Loss Statement — {settings.company?.name || 'TFC ERP'}</span>
            </div>
            <div className="p-6">
              <table className="erp-table w-full text-sm">
                <tbody>
                  {/* Revenue */}
                  <tr className="border-b dark:border-slate-800 border-slate-200">
                    <td className="py-3 font-bold dark:text-emerald-400 text-emerald-700 uppercase text-xs tracking-wider" colSpan={2}>Revenue / Income</td>
                  </tr>
                  <tr className="dark:hover:bg-slate-800/30 hover:bg-slate-50">
                    <td className="py-2.5 pl-6 dark:text-slate-300 text-slate-700 font-medium">Total Sales Revenue</td>
                    <td className="py-2.5 pr-6 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">₹ {pnlData.totalSales.toLocaleString('en-IN')}</td>
                  </tr>
                  {pnlData.totalHamali > 0 && <tr className="dark:hover:bg-slate-800/30 hover:bg-slate-50">
                    <td className="py-2.5 pl-6 dark:text-slate-300 text-slate-700 font-medium">Hamali / Loading Charges Collected</td>
                    <td className="py-2.5 pr-6 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">₹ {pnlData.totalHamali.toLocaleString('en-IN')}</td>
                  </tr>}

                  {/* Cost */}
                  <tr className="border-b border-t-2 dark:border-slate-700 border-slate-300 mt-4">
                    <td className="py-3 font-bold dark:text-rose-400 text-rose-700 uppercase text-xs tracking-wider" colSpan={2}>Cost of Goods / Expenses</td>
                  </tr>
                  <tr className="dark:hover:bg-slate-800/30 hover:bg-slate-50">
                    <td className="py-2.5 pl-6 dark:text-slate-300 text-slate-700 font-medium">Total Purchase Cost (Vehicle + Direct)</td>
                    <td className="py-2.5 pr-6 text-right font-mono font-bold text-rose-600 dark:text-rose-400">₹ {pnlData.totalPurchase.toLocaleString('en-IN')}</td>
                  </tr>
                  {pnlData.totalFreight > 0 && <tr className="dark:hover:bg-slate-800/30 hover:bg-slate-50">
                    <td className="py-2.5 pl-6 dark:text-slate-300 text-slate-700 font-medium">Freight / Transport Charges</td>
                    <td className="py-2.5 pr-6 text-right font-mono font-bold text-rose-600 dark:text-rose-400">₹ {pnlData.totalFreight.toLocaleString('en-IN')}</td>
                  </tr>}
                  {pnlData.totalDiscount > 0 && <tr className="dark:hover:bg-slate-800/30 hover:bg-slate-50">
                    <td className="py-2.5 pl-6 dark:text-slate-300 text-slate-700 font-medium">Discounts Given to Customers</td>
                    <td className="py-2.5 pr-6 text-right font-mono font-bold text-rose-600 dark:text-rose-400">₹ {pnlData.totalDiscount.toLocaleString('en-IN')}</td>
                  </tr>}

                  {/* Gross Profit */}
                  <tr className="border-t-2 dark:border-slate-600 border-slate-400 dark:bg-slate-950 bg-slate-100">
                    <td className="py-3 pl-6 font-black dark:text-white text-slate-900 uppercase text-xs tracking-wider">Gross Trading Profit / (Loss)</td>
                    <td className={`py-3 pr-6 text-right font-mono font-black text-lg ${pnlData.grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>₹ {pnlData.grossProfit.toLocaleString('en-IN')}</td>
                  </tr>

                  {/* Margin */}
                  <tr className="border-t dark:border-slate-800 border-slate-200 dark:bg-slate-900/50 bg-white">
                    <td className="py-3 pl-6 dark:text-slate-400 text-slate-600 font-semibold">Gross Margin %</td>
                    <td className={`py-3 pr-6 text-right font-mono font-black ${pnlData.margin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{pnlData.margin.toFixed(1)}%</td>
                  </tr>

                  {/* Net Profit */}
                  <tr className="border-t-[3px] dark:border-emerald-500 border-emerald-600 dark:bg-emerald-950/30 bg-emerald-50">
                    <td className="py-4 pl-6 font-black dark:text-white text-slate-900 uppercase text-sm tracking-wider">Net Trading Profit</td>
                    <td className={`py-4 pr-6 text-right font-mono font-black text-2xl ${pnlData.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>₹ {pnlData.netProfit.toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Report Preview */}
      <StatementPreview isOpen={showReportPreview} onClose={() => setShowReportPreview(false)} title={`${activeReport === 'DAILY' ? 'Daily Summary' : activeReport === 'DATERANGE' ? 'Date Range Report' : activeReport === 'PARTY' ? 'Party-wise Report' : activeReport === 'FRUIT' ? 'Fruit & Variety Report' : activeReport === 'OUTSTANDING' ? 'Outstanding Report' : 'Trading P&L Statement'}`} subtitle={activeReport === 'DAILY' ? selectedDate : activeReport === 'DATERANGE' ? `${dateFrom} to ${dateTo}` : undefined}>
        <div ref={reportContentRef} className="space-y-5">
          {activeReport === 'PNL' && (
            <table className="w-full text-[11px]">
              <tbody>
                <tr className="border-b border-slate-200"><td className="py-2 font-bold text-emerald-700 uppercase text-[10px] tracking-wider" colSpan={2}>Revenue</td></tr>
                <tr className="border-b border-slate-100"><td className="py-2 pl-4 text-slate-700">Total Sales Revenue</td><td className="py-2 text-right font-mono font-bold text-emerald-700">₹ {pnlData.totalSales.toLocaleString('en-IN')}</td></tr>
                <tr className="border-b border-slate-200 mt-2"><td className="py-2 font-bold text-rose-700 uppercase text-[10px] tracking-wider" colSpan={2}>Cost & Expenses</td></tr>
                <tr className="border-b border-slate-100"><td className="py-2 pl-4 text-slate-700">Total Purchase Cost</td><td className="py-2 text-right font-mono font-bold text-rose-700">₹ {pnlData.totalPurchase.toLocaleString('en-IN')}</td></tr>
                {pnlData.totalFreight > 0 && <tr className="border-b border-slate-100"><td className="py-2 pl-4 text-slate-700">Freight Charges</td><td className="py-2 text-right font-mono font-bold text-rose-700">₹ {pnlData.totalFreight.toLocaleString('en-IN')}</td></tr>}
                {pnlData.totalDiscount > 0 && <tr className="border-b border-slate-100"><td className="py-2 pl-4 text-slate-700">Discounts Given</td><td className="py-2 text-right font-mono font-bold text-rose-700">₹ {pnlData.totalDiscount.toLocaleString('en-IN')}</td></tr>}
                <tr className="border-t-2 border-slate-900 bg-slate-100"><td className="py-3 pl-4 font-black text-slate-900 uppercase text-[10px]">Gross Profit</td><td className={`py-3 text-right font-mono font-black text-[14px] ${pnlData.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>₹ {pnlData.grossProfit.toLocaleString('en-IN')}</td></tr>
                <tr className="bg-slate-50"><td className="py-2 pl-4 text-slate-600">Margin %</td><td className={`py-2 text-right font-mono font-bold ${pnlData.margin >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{pnlData.margin.toFixed(1)}%</td></tr>
                <tr className="border-t-[3px] border-emerald-600 bg-emerald-50"><td className="py-4 pl-4 font-black text-slate-900 uppercase text-[11px]">Net Profit</td><td className={`py-4 text-right font-mono font-black text-[18px] ${pnlData.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>₹ {pnlData.netProfit.toLocaleString('en-IN')}</td></tr>
              </tbody>
            </table>
          )}

          {activeReport === 'OUTSTANDING' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/60"><div className="text-[9px] font-bold uppercase text-rose-500">Supplier Payable</div><div className="text-[15px] font-black font-mono text-rose-700 mt-0.5">₹{outstandingData.totalSupPayable.toLocaleString('en-IN')}</div></div>
                <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50/60"><div className="text-[9px] font-bold uppercase text-indigo-500">Customer Receivable</div><div className="text-[15px] font-black font-mono text-indigo-700 mt-0.5">₹{outstandingData.totalCustReceivable.toLocaleString('en-IN')}</div></div>
                <div className={`p-3 rounded-lg border ${outstandingData.net >= 0 ? 'border-emerald-200 bg-emerald-50/60' : 'border-rose-200 bg-rose-50/60'}`}><div className="text-[9px] font-bold uppercase text-slate-500">Net Position</div><div className={`text-[15px] font-black font-mono mt-0.5 ${outstandingData.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>₹{outstandingData.net.toLocaleString('en-IN')}</div></div>
              </div>
            </div>
          )}

          {activeReport !== 'PNL' && activeReport !== 'OUTSTANDING' && (
            <div className="text-center text-[11px] text-slate-500 py-6">
              <p className="font-semibold text-slate-700 mb-1">Report: {activeReport === 'DAILY' ? `Daily Summary — ${selectedDate}` : activeReport === 'DATERANGE' ? `${dateFrom} to ${dateTo}` : activeReport === 'PARTY' ? 'Party-wise Summary' : 'Fruit & Variety'}</p>
              <p>Use Print or PDF button to generate the complete report output.</p>
            </div>
          )}
        </div>
      </StatementPreview>
    </div>
  );
};
