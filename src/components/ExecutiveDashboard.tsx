import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart3, TrendingUp, DollarSign, Package, Users, UserCheck,
  ArrowUpRight, ArrowDownRight, Sparkles, Download, Layers,
  Truck, ShoppingCart, ShoppingBag, Wallet, FileBarChart2, Settings,
  Clock, Zap, AlertTriangle, CheckCircle2, Calendar, Box
} from 'lucide-react';
import { useToast } from './ui/Toast';

interface ExecutiveDashboardProps {
  setActiveTab: (tab: string) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ setActiveTab }) => {
  const { vehicles, invoices, purchaseInvoices, inventory, suppliers, customers, payments, settings, getExportData } = useApp();
  const toast = useToast();

  const savedVehicles = vehicles.filter(v => v.status === 'SAVED');
  const commRate = settings.financial.commissionRate / 100;

  // ── Financial Calculations ──────────────────
  const totalPurchase = savedVehicles.reduce((s, v) => s + v.totalAmount, 0) + purchaseInvoices.reduce((s, i) => s + i.todayAmount, 0);
  const totalSales = invoices.reduce((s, i) => s + i.todayAmount, 0);
  const grossProfit = totalSales - totalPurchase;
  const commission = Math.round(totalSales * commRate);
  const totalStockKg = inventory.reduce((s, i) => s + i.totalWeight, 0);
  const totalStockCrt = inventory.reduce((s, i) => s + i.totalCarets, 0);
  const stockValuation = totalStockKg * 115;

  const totalSupplierPayable = suppliers.reduce((s, sup) => s + sup.previousBalance, 0) + totalPurchase - payments.filter(p => p.partyType === 'SUPPLIER').reduce((s, p) => s + p.amount, 0);
  const totalCustomerReceivable = customers.reduce((s, c) => s + c.previousBalance, 0) + totalSales - payments.filter(p => p.partyType === 'CUSTOMER').reduce((s, p) => s + p.amount, 0);
  const netPosition = totalCustomerReceivable - totalSupplierPayable;

  // ── Today's Snapshot ────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const todayStats = useMemo(() => {
    const tVeh = savedVehicles.filter(v => v.date === today);
    const tPinv = purchaseInvoices.filter(i => i.date === today);
    const tSinv = invoices.filter(i => i.date === today);
    const tPay = payments.filter(p => p.date === today);
    return {
      loads: tVeh.length + tPinv.length,
      purchaseAmt: tVeh.reduce((s, v) => s + v.totalAmount, 0) + tPinv.reduce((s, i) => s + i.todayAmount, 0),
      salesCount: tSinv.length,
      salesAmt: tSinv.reduce((s, i) => s + i.todayAmount, 0),
      paymentsCount: tPay.length,
      cashIn: tPay.filter(p => p.partyType === 'CUSTOMER').reduce((s, p) => s + p.amount, 0),
      cashOut: tPay.filter(p => p.partyType === 'SUPPLIER').reduce((s, p) => s + p.amount, 0),
      weightIn: tVeh.reduce((s, v) => s + v.totalCalculatedWeight, 0) + tPinv.reduce((s, i) => s + i.items.reduce((a, it) => a + (Number(it.weight) || 0), 0), 0),
    };
  }, [today, savedVehicles, purchaseInvoices, invoices, payments]);

  // ── Top Varieties ───────────────────────────
  const topVarieties = useMemo(() => {
    const map = new Map<string, { weight: number; fruit: string }>();
    inventory.forEach(item => { map.set(item.variety, { weight: item.totalWeight, fruit: item.fruit }); });
    return Array.from(map.entries()).sort((a, b) => b[1].weight - a[1].weight).slice(0, 5);
  }, [inventory]);

  // ── Low Stock Alerts ────────────────────────
  const lowStock = useMemo(() => inventory.filter(i => i.totalWeight > 0 && i.totalWeight <= 200), [inventory]);

  // ── Recent transactions (latest 8) ──────────
  const recentTx = useMemo(() => {
    const all: { id: string; date: string; type: string; ref: string; party: string; amount: number; color: string; icon: React.ReactNode }[] = [];
    savedVehicles.forEach(v => all.push({ id: v.id, date: v.date, type: '🚛 Inward', ref: v.arrivalNo, party: v.rows.map(r => r.supplierName).filter((x,i,a) => a.indexOf(x) === i).join(', '), amount: -v.totalAmount, color: 'text-rose-500', icon: <ArrowUpRight className="w-4 h-4" /> }));
    purchaseInvoices.forEach(i => all.push({ id: i.id, date: i.date, type: '📄 Purchase', ref: i.billNo, party: i.supplierName, amount: -i.todayAmount, color: 'text-rose-500', icon: <ArrowUpRight className="w-4 h-4" /> }));
    invoices.forEach(i => all.push({ id: i.id, date: i.date, type: '📤 Sale', ref: i.invoiceNo, party: i.customerName, amount: i.todayAmount, color: 'text-emerald-500', icon: <ArrowDownRight className="w-4 h-4" /> }));
    payments.forEach(p => all.push({ id: p.id, date: p.date, type: p.partyType === 'SUPPLIER' ? '💸 Paid Out' : '💰 Received', ref: p.referenceNo || '—', party: p.partyName, amount: p.partyType === 'SUPPLIER' ? -p.amount : p.amount, color: p.partyType === 'SUPPLIER' ? 'text-rose-500' : 'text-emerald-500', icon: p.partyType === 'SUPPLIER' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" /> }));
    return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  }, [savedVehicles, purchaseInvoices, invoices, payments]);

  const handleExport = () => {
    const blob = new Blob([getExportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${settings.company.name.replace(/\s+/g, '-').toLowerCase()}-backup-${today}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success('Backup Exported', 'Full ERP data downloaded as JSON.');
  };

  // ── Quick Action Cards ──────────────────────
  const quickActions = [
    { label: 'Vehicle Inward', desc: 'Gate entry & supplier allocation', icon: <Truck className="w-6 h-6" />, tab: 'arrival', color: 'from-emerald-500 to-teal-500', textColor: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', key: 'F1' },
    { label: 'Purchase Bill', desc: 'Direct supplier purchase entry', icon: <ShoppingBag className="w-6 h-6" />, tab: 'purchase', color: 'from-teal-500 to-cyan-500', textColor: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10', key: 'Alt+2' },
    { label: 'Sales Invoice', desc: 'Customer billing & cash memo', icon: <ShoppingCart className="w-6 h-6" />, tab: 'sales', color: 'from-indigo-500 to-violet-500', textColor: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10', key: 'F2' },
    { label: 'Record Payment', desc: 'Pay supplier or receive from buyer', icon: <Wallet className="w-6 h-6" />, tab: 'payments', color: 'from-amber-500 to-orange-500', textColor: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', key: 'Alt+5' },
    { label: 'View Reports', desc: 'Daily, date range, P&L analytics', icon: <FileBarChart2 className="w-6 h-6" />, tab: 'reports', color: 'from-cyan-500 to-blue-500', textColor: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10', key: 'Alt+6' },
    { label: 'Settings', desc: 'Company, financial, backup config', icon: <Settings className="w-6 h-6" />, tab: 'settings', color: 'from-slate-500 to-slate-600', textColor: 'dark:text-slate-300 text-slate-600', bg: 'dark:bg-slate-800 bg-slate-100', key: 'Alt+9' },
  ];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();

  const currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const currentDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-7 font-sans">

      {/* ══════════════════════════════════════════════
          HERO SECTION
         ══════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl border dark:border-slate-800 border-slate-200 shadow-2xl">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br dark:from-slate-900 dark:via-emerald-950/80 dark:to-slate-900 from-emerald-600 via-teal-600 to-cyan-600"></div>
        <div className="absolute -right-20 -bottom-20 w-[500px] h-[500px] bg-white/5 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -top-20 w-[400px] h-[400px] bg-black/5 dark:bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0zMCAwdjYwTTYwIDMwSDAiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-30 pointer-events-none"></div>

        <div className="relative z-10 p-8 md:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            {/* Left: Greeting & Company */}
            <div className="space-y-3 text-white max-w-2xl">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center space-x-2 bg-white/15 dark:bg-emerald-500/15 backdrop-blur-sm border border-white/20 dark:border-emerald-500/25 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse-soft" />
                  <span>ASZ Nexus ERP</span>
                </div>
                <div className="flex items-center space-x-2 text-white/70 dark:text-slate-400 text-xs font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{currentTime}</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-white/70 dark:text-emerald-300/60 font-semibold">{greeting}!</p>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mt-1">
                  {settings.company.name}
                </h1>
              </div>

              <p className="text-sm text-white/80 dark:text-slate-300 font-medium max-w-xl leading-relaxed">
                {currentDate} — Real-time sync across vehicle arrivals, customer billing, warehouse inventory, supplier ledgers & payments.
              </p>

              {/* Hero Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button onClick={() => setActiveTab('arrival')}
                  className="px-5 py-2.5 bg-white dark:bg-gradient-to-r dark:from-emerald-500 dark:to-teal-500 text-emerald-950 dark:text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-lg transition-all flex items-center space-x-2 cursor-pointer hover:shadow-xl hover:scale-[1.02]">
                  <Truck className="w-4 h-4 stroke-[2.5]" /><span>New Inward Load</span>
                </button>
                <button onClick={() => setActiveTab('sales')}
                  className="px-5 py-2.5 bg-white/15 dark:bg-indigo-600 backdrop-blur-sm text-white font-bold rounded-xl text-xs sm:text-sm shadow-lg border border-white/20 dark:border-indigo-500 transition-all flex items-center space-x-2 cursor-pointer hover:bg-white/25 dark:hover:bg-indigo-500">
                  <ShoppingCart className="w-4 h-4 stroke-[2.5]" /><span>New Sales Bill</span>
                </button>
                <button onClick={handleExport}
                  className="px-4 py-2.5 bg-white/10 dark:bg-slate-800/80 backdrop-blur-sm text-white font-semibold rounded-xl text-xs border border-white/15 dark:border-slate-700 transition-all flex items-center space-x-2 cursor-pointer hover:bg-white/20">
                  <Download className="w-4 h-4" /><span className="hidden sm:inline">Backup</span>
                </button>
              </div>
            </div>

            {/* Right: Today's Live Snapshot */}
            <div className="dark:bg-slate-950/70 bg-white/15 backdrop-blur-xl rounded-2xl border dark:border-slate-800 border-white/20 p-5 min-w-[260px] shadow-xl">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="w-4 h-4 text-white dark:text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white/80 dark:text-emerald-400">Today's Live Snapshot</span>
              </div>
              <div className="space-y-3 text-white">
                <div className="flex justify-between items-center text-sm"><span className="text-white/70 dark:text-slate-400">Inward Loads</span><span className="font-black font-mono">{todayStats.loads}</span></div>
                <div className="flex justify-between items-center text-sm"><span className="text-white/70 dark:text-slate-400">Purchase Value</span><span className="font-black font-mono text-rose-300">₹{todayStats.purchaseAmt.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between items-center text-sm"><span className="text-white/70 dark:text-slate-400">Sales Bills</span><span className="font-black font-mono">{todayStats.salesCount}</span></div>
                <div className="flex justify-between items-center text-sm"><span className="text-white/70 dark:text-slate-400">Sales Value</span><span className="font-black font-mono text-emerald-300">₹{todayStats.salesAmt.toLocaleString('en-IN')}</span></div>
                <div className="border-t border-white/10 dark:border-slate-800 pt-2 flex justify-between items-center text-sm"><span className="text-white/70 dark:text-slate-400">Weight IN</span><span className="font-bold font-mono">{todayStats.weightIn.toLocaleString()} KG</span></div>
                <div className="flex justify-between items-center text-sm"><span className="text-white/70 dark:text-slate-400">Cash IN / OUT</span><span className="font-bold font-mono text-xs">+₹{todayStats.cashIn.toLocaleString()} / -₹{todayStats.cashOut.toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          QUICK ACTIONS GRID
         ══════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center space-x-2 mb-4">
          <Zap className="w-5 h-5 text-amber-500" />
          <h2 className="text-sm font-black dark:text-white text-slate-900 uppercase tracking-wider">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map(qa => (
            <button key={qa.tab} onClick={() => setActiveTab(qa.tab)}
              className="dark:bg-slate-900 bg-white p-4 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm dark:hover:border-slate-700 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group text-left">
              <div className={`p-2.5 rounded-xl ${qa.bg} ${qa.textColor} w-max mb-3 group-hover:scale-110 transition-transform`}>
                {qa.icon}
              </div>
              <div className="text-xs font-bold dark:text-white text-slate-900">{qa.label}</div>
              <div className="text-[10px] dark:text-slate-500 text-slate-400 mt-0.5 leading-relaxed">{qa.desc}</div>
              <div className="text-[9px] font-mono font-bold dark:text-slate-600 text-slate-300 mt-2 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded w-max">{qa.key}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          KPI CARDS
         ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total Purchase', value: totalPurchase, sub: `${savedVehicles.length + purchaseInvoices.length} loads/bills`, color: 'text-rose-500', icon: <DollarSign className="w-5 h-5" />, iconBg: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
          { label: 'Total Sales', value: totalSales, sub: `${invoices.length} invoices`, color: 'text-emerald-500', icon: <TrendingUp className="w-5 h-5" />, iconBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
          { label: `Commission (${settings.financial.commissionRate}%)`, value: commission, sub: 'APMC agent fee', color: 'text-emerald-600 dark:text-emerald-400', icon: <BarChart3 className="w-5 h-5" />, iconBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
          { label: 'Stock Valuation', value: stockValuation, sub: `${totalStockKg.toLocaleString()} KG · ${totalStockCrt} CRT`, color: 'dark:text-white text-slate-900', icon: <Package className="w-5 h-5" />, iconBg: 'bg-teal-500/10 text-teal-500 border-teal-500/20' },
        ].map((kpi, i) => (
          <div key={i} className="dark:bg-slate-900 bg-white p-5 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500">{kpi.label}</span>
              <div className={`p-2 rounded-xl border ${kpi.iconBg}`}>{kpi.icon}</div>
            </div>
            <div className={`text-2xl font-black font-mono ${kpi.color}`}>₹ {kpi.value.toLocaleString('en-IN')}</div>
            <div className="text-[10px] dark:text-slate-500 text-slate-400 mt-1 font-semibold">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════
          OUTSTANDING & NET POSITION
         ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Customer Receivable */}
        <button onClick={() => setActiveTab('customers')} className="dark:bg-slate-900 bg-white p-5 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm hover:border-indigo-500 transition-all cursor-pointer text-left">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider"><UserCheck className="w-4 h-4" /><span>Customer Receivable</span></div>
            <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20 font-bold">{customers.length} buyers</span>
          </div>
          <div className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-300">₹ {totalCustomerReceivable.toLocaleString('en-IN')}</div>
          <div className="text-[10px] dark:text-slate-500 text-slate-400 mt-1 font-medium">They owe us → click to manage</div>
        </button>

        {/* Supplier Payable */}
        <button onClick={() => setActiveTab('suppliers')} className="dark:bg-slate-900 bg-white p-5 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm hover:border-emerald-500 transition-all cursor-pointer text-left">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider"><Users className="w-4 h-4" /><span>Supplier Payable</span></div>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">{suppliers.length} suppliers</span>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-300">₹ {totalSupplierPayable.toLocaleString('en-IN')}</div>
          <div className="text-[10px] dark:text-slate-500 text-slate-400 mt-1 font-medium">We owe them → click to manage</div>
        </button>

        {/* Net Position */}
        <div className={`p-5 rounded-xl border shadow-sm ${netPosition >= 0 ? 'dark:bg-emerald-950/30 bg-emerald-50 dark:border-emerald-500/30 border-emerald-200' : 'dark:bg-rose-950/30 bg-rose-50 dark:border-rose-500/30 border-rose-200'}`}>
          <div className="flex items-center space-x-2 mb-2">
            {netPosition >= 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
            <span className="text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500">Net Financial Position</span>
          </div>
          <div className={`text-2xl font-black font-mono ${netPosition >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {netPosition >= 0 ? '+' : ''}₹ {netPosition.toLocaleString('en-IN')}
          </div>
          <div className={`text-[10px] font-bold mt-1 ${netPosition >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
            {netPosition >= 0 ? '✅ Net Positive — Receivables exceed Payables' : '⚠️ Net Negative — More payables than receivables'}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          BOTTOM ROW: TOP VARIETIES + LOW STOCK + RECENT
         ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Top Varieties */}
        <div className="dark:bg-slate-900 bg-white p-5 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400 font-bold text-xs uppercase tracking-wider"><Layers className="w-4 h-4" /><span>Top 5 Varieties</span></div>
            <button onClick={() => setActiveTab('inventory')} className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold cursor-pointer hover:underline">View All →</button>
          </div>
          <div className="space-y-2.5">
            {topVarieties.map(([v, info], idx) => (
              <div key={v} className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="w-5 h-5 rounded dark:bg-slate-800 bg-slate-100 dark:text-slate-400 text-slate-600 text-[10px] font-mono flex items-center justify-center font-bold">{idx + 1}</span>
                  <div>
                    <span className="text-xs font-bold dark:text-white text-slate-900">{v}</span>
                    <span className="text-[10px] dark:text-slate-500 text-slate-400 ml-1.5">({info.fruit})</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs text-teal-600 dark:text-teal-400">{info.weight.toLocaleString()} KG</span>
              </div>
            ))}
            {topVarieties.length === 0 && <div className="text-center text-xs dark:text-slate-500 text-slate-400 py-4">No stock yet</div>}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="dark:bg-slate-900 bg-white p-5 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider"><AlertTriangle className="w-4 h-4" /><span>Low Stock Alerts</span></div>
            <span className="text-[10px] font-mono dark:bg-amber-500/10 bg-amber-50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-bold">{lowStock.length} items</span>
          </div>
          <div className="space-y-2.5 max-h-48 overflow-y-auto">
            {lowStock.map(item => (
              <div key={item.key} className="flex items-center justify-between p-2.5 dark:bg-amber-950/20 bg-amber-50 rounded-lg border dark:border-amber-500/10 border-amber-200">
                <div className="flex items-center space-x-2">
                  <Box className="w-3.5 h-3.5 text-amber-500" />
                  <div>
                    <span className="text-xs font-bold dark:text-white text-slate-900">{item.variety}</span>
                    <span className="text-[10px] dark:text-slate-500 text-slate-400 ml-1">({item.fruit})</span>
                  </div>
                </div>
                <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400">{item.totalWeight} KG</span>
              </div>
            ))}
            {lowStock.length === 0 && <div className="text-center text-xs dark:text-slate-500 text-slate-400 py-4">All stock levels optimal 🎉</div>}
          </div>
        </div>

        {/* Gross Profit Quick View */}
        <div className="dark:bg-slate-900 bg-white p-5 rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-4 text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500"><BarChart3 className="w-4 h-4 text-cyan-500" /><span>Profit Quick View</span></div>
          <div className="space-y-3">
            <div className="flex justify-between items-center"><span className="text-xs dark:text-slate-400 text-slate-600">Total Sales</span><span className="font-mono font-bold text-xs text-emerald-500">₹ {totalSales.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between items-center"><span className="text-xs dark:text-slate-400 text-slate-600">Total Purchase</span><span className="font-mono font-bold text-xs text-rose-500">₹ {totalPurchase.toLocaleString('en-IN')}</span></div>
            <div className="border-t dark:border-slate-800 border-slate-200 pt-2 flex justify-between items-center">
              <span className="text-xs font-bold dark:text-white text-slate-900">Gross Profit</span>
              <span className={`font-mono font-black text-sm ${grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>₹ {grossProfit.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs dark:text-slate-400 text-slate-600">Margin</span>
              <span className={`font-mono font-bold text-xs ${grossProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(1) : '0.0'}%</span>
            </div>
          </div>
          <button onClick={() => setActiveTab('reports')} className="w-full mt-4 py-2 text-center text-xs font-bold text-cyan-600 dark:text-cyan-400 dark:bg-slate-800 bg-slate-100 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">View Full P&L Report →</button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          RECENT TRANSACTIONS FEED
         ══════════════════════════════════════════════ */}
      <div className="dark:bg-slate-900 bg-white rounded-xl border dark:border-slate-800 border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 dark:bg-slate-950 bg-slate-50 border-b dark:border-slate-800 border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-bold dark:text-white text-slate-900 uppercase tracking-wider">Recent Transactions</span>
            <span className="text-[10px] font-mono dark:bg-slate-800 bg-slate-200 dark:text-slate-400 text-slate-600 px-2 py-0.5 rounded font-bold">Live</span>
          </div>
          <button onClick={() => setActiveTab('reports')} className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 cursor-pointer hover:underline">Full Reports →</button>
        </div>
        <div className="divide-y dark:divide-slate-800/60 divide-slate-100">
          {recentTx.map(tx => (
            <div key={tx.id + tx.type} className="flex items-center justify-between px-5 py-3 dark:hover:bg-slate-800/30 hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-3 min-w-0">
                <div className={`p-1.5 rounded-lg ${tx.amount >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{tx.icon}</div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold dark:text-white text-slate-900">{tx.type}</span>
                    <span className="text-[10px] font-mono dark:text-slate-500 text-slate-400">{tx.ref}</span>
                  </div>
                  <div className="text-[10px] dark:text-slate-400 text-slate-500 truncate max-w-[250px]">{tx.party}</div>
                </div>
              </div>
              <div className="text-right shrink-0 ml-4">
                <div className={`text-sm font-black font-mono ${tx.color}`}>{tx.amount >= 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString('en-IN')}</div>
                <div className="text-[10px] font-mono dark:text-slate-600 text-slate-400">{tx.date}</div>
              </div>
            </div>
          ))}
          {recentTx.length === 0 && <div className="py-12 text-center text-xs dark:text-slate-500 text-slate-400">No transactions yet. Start by recording a vehicle arrival!</div>}
        </div>
      </div>
    </div>
  );
};
