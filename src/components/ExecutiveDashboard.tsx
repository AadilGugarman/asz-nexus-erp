import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAppTranslation } from '@/hooks';
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
  const { t } = useAppTranslation('dashboard');
  const toast = useToast();

  const dashboardCardClass = 'dark:bg-slate-800 bg-white rounded-xl border dark:border-slate-700 border-slate-200 shadow-[0_4px_16px_rgba(15,23,42,0.08)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)]';
  const dashboardButtonClass = 'rounded-xl border shadow-[0_4px_12px_rgba(15,23,42,0.1)] transition-all cursor-pointer';
  const premiumIconShell = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_10px_24px_rgba(15,23,42,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_14px_30px_rgba(2,6,23,0.28)]';

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
    savedVehicles.forEach(v => all.push({ id: v.id, date: v.date, type: `🚛 ${t('transactions.inward')}`, ref: v.arrivalNo, party: v.rows.map(r => r.supplierName).filter((x,i,a) => a.indexOf(x) === i).join(', '), amount: -v.totalAmount, color: 'text-rose-500', icon: <ArrowUpRight className="w-4 h-4" /> }));
    purchaseInvoices.forEach(i => all.push({ id: i.id, date: i.date, type: `📄 ${t('transactions.purchase')}`, ref: i.billNo, party: i.supplierName, amount: -i.todayAmount, color: 'text-rose-500', icon: <ArrowUpRight className="w-4 h-4" /> }));
    invoices.forEach(i => all.push({ id: i.id, date: i.date, type: `📤 ${t('transactions.sale')}`, ref: i.invoiceNo, party: i.customerName, amount: i.todayAmount, color: 'text-emerald-500', icon: <ArrowDownRight className="w-4 h-4" /> }));
    payments.forEach(p => all.push({ id: p.id, date: p.date, type: p.partyType === 'SUPPLIER' ? `💸 ${t('transactions.paidOut')}` : `💰 ${t('transactions.received')}`, ref: p.referenceNo || '—', party: p.partyName, amount: p.partyType === 'SUPPLIER' ? -p.amount : p.amount, color: p.partyType === 'SUPPLIER' ? 'text-rose-500' : 'text-emerald-500', icon: p.partyType === 'SUPPLIER' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" /> }));
    return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  }, [savedVehicles, purchaseInvoices, invoices, payments, t]);

  const handleExport = () => {
    const blob = new Blob([getExportData()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
     const coName = settings.company?.name || 'tfc-erp';
    a.download = `${coName.replace(/\s+/g, '-').toLowerCase()}-backup-${today}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(t('toasts.backupExported.title'), t('toasts.backupExported.description'));
  };

  // ── Quick Action Cards ──────────────────────
  const quickActions = [
    { label: t('quickActions.arrival.label'), desc: t('quickActions.arrival.desc'), Icon: Truck, tab: 'arrival', iconWrapClass: `${premiumIconShell} bg-[linear-gradient(145deg,rgba(224,242,254,0.98),rgba(219,234,254,0.92))] border-sky-200/80 text-sky-700 dark:bg-[linear-gradient(145deg,rgba(8,47,73,0.96),rgba(12,74,110,0.92))] dark:border-sky-800/80 dark:text-sky-300`, iconClass: 'h-5 w-5 stroke-[2.35]', key: 'F1' },
    { label: t('quickActions.purchase.label'), desc: t('quickActions.purchase.desc'), Icon: ShoppingBag, tab: 'purchase', iconWrapClass: `${premiumIconShell} bg-[linear-gradient(145deg,rgba(220,252,231,0.98),rgba(204,251,241,0.9))] border-emerald-200/80 text-emerald-700 dark:bg-[linear-gradient(145deg,rgba(6,78,59,0.96),rgba(17,94,89,0.92))] dark:border-emerald-800/75 dark:text-emerald-300`, iconClass: 'h-5 w-5 stroke-[2.35]', key: 'Alt+2' },
    { label: t('quickActions.sales.label'), desc: t('quickActions.sales.desc'), Icon: ShoppingCart, tab: 'sales', iconWrapClass: `${premiumIconShell} bg-[linear-gradient(145deg,rgba(224,231,255,0.98),rgba(238,242,255,0.92))] border-indigo-200/85 text-indigo-700 dark:bg-[linear-gradient(145deg,rgba(49,46,129,0.96),rgba(67,56,202,0.9))] dark:border-indigo-800/80 dark:text-indigo-200`, iconClass: 'h-5 w-5 stroke-[2.35]', key: 'F2' },
    { label: t('quickActions.payment.label'), desc: t('quickActions.payment.desc'), Icon: Wallet, tab: 'payments', iconWrapClass: `${premiumIconShell} bg-[linear-gradient(145deg,rgba(255,247,237,0.98),rgba(254,243,199,0.92))] border-amber-200/85 text-amber-700 dark:bg-[linear-gradient(145deg,rgba(120,53,15,0.95),rgba(146,64,14,0.9))] dark:border-amber-800/80 dark:text-amber-200`, iconClass: 'h-5 w-5 stroke-[2.35]', key: 'Alt+5' },
    { label: t('quickActions.reports.label'), desc: t('quickActions.reports.desc'), Icon: FileBarChart2, tab: 'reports', iconWrapClass: `${premiumIconShell} bg-[linear-gradient(145deg,rgba(224,242,254,0.98),rgba(219,234,254,0.92))] border-cyan-200/85 text-cyan-700 dark:bg-[linear-gradient(145deg,rgba(22,78,99,0.96),rgba(14,116,144,0.9))] dark:border-cyan-800/80 dark:text-cyan-200`, iconClass: 'h-5 w-5 stroke-[2.35]', key: 'Alt+6' },
    { label: t('quickActions.settings.label'), desc: t('quickActions.settings.desc'), Icon: Settings, tab: 'settings', iconWrapClass: `${premiumIconShell} bg-[linear-gradient(145deg,rgba(241,245,249,0.98),rgba(226,232,240,0.92))] border-slate-200/90 text-slate-700 dark:bg-[linear-gradient(145deg,rgba(30,41,59,0.98),rgba(51,65,85,0.92))] dark:border-slate-700/90 dark:text-slate-200`, iconClass: 'h-5 w-5 stroke-[2.3]', key: 'Alt+9' },
  ];

  const kpiCards = [
    { label: t('kpi.totalPurchase'), value: totalPurchase, sub: `${savedVehicles.length + purchaseInvoices.length} ${t('kpi.loadsBills')}`, valueClass: 'text-rose-600 dark:text-rose-300', Icon: DollarSign, iconWrapClass: `${premiumIconShell} bg-[linear-gradient(145deg,rgba(255,241,242,0.98),rgba(254,226,226,0.92))] border-rose-200/80 text-rose-700 dark:bg-[linear-gradient(145deg,rgba(76,5,25,0.98),rgba(136,19,55,0.9))] dark:border-rose-900/70 dark:text-rose-200` },
    { label: t('kpi.totalSales'), value: totalSales, sub: `${invoices.length} ${t('kpi.invoices')}`, valueClass: 'text-emerald-600 dark:text-emerald-300', Icon: TrendingUp, iconWrapClass: `${premiumIconShell} bg-[linear-gradient(145deg,rgba(236,253,245,0.98),rgba(209,250,229,0.92))] border-emerald-200/80 text-emerald-700 dark:bg-[linear-gradient(145deg,rgba(2,44,34,0.98),rgba(6,78,59,0.92))] dark:border-emerald-900/70 dark:text-emerald-200` },
    { label: `${t('kpi.commission')} (${settings.financial.commissionRate}%)`, value: commission, sub: t('kpi.apmcFee'), valueClass: 'text-indigo-700 dark:text-indigo-200', Icon: BarChart3, iconWrapClass: `${premiumIconShell} bg-[linear-gradient(145deg,rgba(238,242,255,0.98),rgba(224,231,255,0.92))] border-indigo-200/85 text-indigo-700 dark:bg-[linear-gradient(145deg,rgba(30,27,75,0.98),rgba(49,46,129,0.92))] dark:border-indigo-900/70 dark:text-indigo-200` },
    { label: t('kpi.stockValuation'), value: stockValuation, sub: `${totalStockKg.toLocaleString()} KG · ${totalStockCrt} CRT`, valueClass: 'text-slate-900 dark:text-slate-50', Icon: Package, iconWrapClass: `${premiumIconShell} bg-[linear-gradient(145deg,rgba(239,246,255,0.98),rgba(224,242,254,0.92))] border-blue-200/85 text-blue-700 dark:bg-[linear-gradient(145deg,rgba(30,58,138,0.98),rgba(30,64,175,0.9))] dark:border-blue-900/75 dark:text-blue-200` },
  ];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t('greeting.morning');
    if (h < 17) return t('greeting.afternoon');
    return t('greeting.evening');
  })();

  const currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const currentDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="space-y-7 font-sans">

      {/* ══════════════════════════════════════════════
          HERO SECTION
         ══════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl border dark:border-slate-700 border-slate-200 shadow-[0_8px_32px_rgba(15,23,42,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
        {/* Background gradient — theme-aware */}
        <div className="absolute inset-0 dark:bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_50%,#0f172a_100%)] bg-[linear-gradient(135deg,#f0fdf9_0%,#e0f2fe_50%,#f0fdf9_100%)]"></div>
        <div className="absolute -right-16 -bottom-24 w-[420px] h-[420px] rounded-full blur-3xl pointer-events-none dark:bg-emerald-500/8 bg-emerald-400/12"></div>
        <div className="absolute -left-20 top-0 w-[340px] h-[340px] rounded-full blur-3xl pointer-events-none dark:bg-sky-500/6 bg-sky-400/10"></div>

        <div className="relative z-10 p-8 md:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            {/* Left: Greeting & Company */}
            <div className="space-y-3 dark:text-white text-slate-900 max-w-2xl">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center space-x-2 dark:bg-white/10 bg-black/6 backdrop-blur-[8px] border dark:border-white/12 border-black/10 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse-soft" />
                  <span>{t('hero.brandBadge')}</span>
                </div>
                <div className="flex items-center space-x-2 dark:text-slate-300 text-slate-500 text-xs font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{currentTime}</span>
                </div>
              </div>

              <div>
                <p className="text-sm dark:text-slate-300 text-slate-600 font-semibold">{greeting}!</p>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mt-1">
     {settings.company?.name || 'TFC ERP'}
                </h1>
              </div>

              <p className="text-sm dark:text-slate-200 text-slate-700 font-medium max-w-xl leading-relaxed">
                {currentDate} — {t('hero.summary')}
              </p>

              {/* Hero Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button onClick={() => setActiveTab('arrival')}
                  className={`${dashboardButtonClass} px-5 py-2.5 dark:bg-white dark:text-slate-950 bg-slate-900 text-white font-black text-xs sm:text-sm dark:border-white/80 border-slate-800 flex items-center space-x-2 hover:-translate-y-0.5`}>
                  <Truck className="w-4 h-4 stroke-[2.5]" /><span>{t('hero.newInward')}</span>
                </button>
                <button onClick={() => setActiveTab('sales')}
                  className={`${dashboardButtonClass} px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm border-emerald-700 flex items-center space-x-2 hover:-translate-y-0.5`}>
                  <ShoppingCart className="w-4 h-4 stroke-[2.5]" /><span>{t('hero.newSales')}</span>
                </button>
                <button onClick={handleExport}
                  className={`${dashboardButtonClass} px-4 py-2.5 dark:bg-slate-700 dark:hover:bg-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-100 text-slate-700 font-semibold text-xs dark:border-slate-600 border-slate-300 flex items-center space-x-2 hover:-translate-y-0.5`}>
                  <Download className="w-4 h-4" /><span className="hidden sm:inline">{t('hero.backup')}</span>
                </button>
              </div>
            </div>

            {/* Right: Today's Live Snapshot */}
            <div className="dark:bg-slate-900 bg-white/80 backdrop-blur-sm rounded-2xl border dark:border-slate-700 border-slate-200 p-5 min-w-[260px] shadow-[0_8px_24px_rgba(15,23,42,0.1)] dark:shadow-[0_12px_32px_rgba(0,0,0,0.3)]">
              <div className="flex items-center space-x-2 mb-4">
                <Calendar className="w-4 h-4 dark:text-sky-300 text-slate-500" />
                <span className="text-xs font-bold uppercase tracking-wider dark:text-sky-200 text-slate-600">{t('hero.snapshotTitle')}</span>
              </div>
              <div className="space-y-3 dark:text-white text-slate-900">
                <div className="flex justify-between items-center text-sm"><span className="dark:text-slate-400 text-slate-500">{t('hero.snapshot.inwardLoads')}</span><span className="font-black font-mono dark:text-slate-100 text-slate-800">{todayStats.loads}</span></div>
                <div className="flex justify-between items-center text-sm"><span className="dark:text-slate-400 text-slate-500">{t('hero.snapshot.purchaseValue')}</span><span className="font-black font-mono text-rose-500 dark:text-rose-300">₹{todayStats.purchaseAmt.toLocaleString('en-IN')}</span></div>
                <div className="flex justify-between items-center text-sm"><span className="dark:text-slate-400 text-slate-500">{t('hero.snapshot.salesBills')}</span><span className="font-black font-mono dark:text-slate-100 text-slate-800">{todayStats.salesCount}</span></div>
                <div className="flex justify-between items-center text-sm"><span className="dark:text-slate-400 text-slate-500">{t('hero.snapshot.salesValue')}</span><span className="font-black font-mono text-emerald-600 dark:text-emerald-300">₹{todayStats.salesAmt.toLocaleString('en-IN')}</span></div>
                <div className="border-t dark:border-slate-700 border-slate-200 pt-2 flex justify-between items-center text-sm"><span className="dark:text-slate-400 text-slate-500">{t('hero.snapshot.weightIn')}</span><span className="font-bold font-mono dark:text-slate-200 text-slate-700">{todayStats.weightIn.toLocaleString()} KG</span></div>
                <div className="flex justify-between items-center text-sm"><span className="dark:text-slate-400 text-slate-500">{t('hero.snapshot.cashInOut')}</span><span className="font-bold font-mono text-xs dark:text-slate-200 text-slate-700">+₹{todayStats.cashIn.toLocaleString()} / -₹{todayStats.cashOut.toLocaleString()}</span></div>
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
          <h2 className="text-sm font-black dark:text-white text-slate-900 uppercase tracking-wider">{t('sections.quickActions')}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map(qa => (
            <button key={qa.tab} onClick={() => setActiveTab(qa.tab)}
              className={`${dashboardCardClass} p-4 dark:hover:border-slate-700/90 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(15,23,42,0.12)] group text-left`}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className={`${qa.iconWrapClass} group-hover:-translate-y-0.5 group-hover:scale-[1.03] transition-transform`}>
                  <qa.Icon className={qa.iconClass} />
                </div>
                <div className="w-max rounded-md border border-slate-200/80 bg-slate-100/90 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-400 dark:border-slate-700/80 dark:bg-slate-800/90 dark:text-slate-500">{qa.key}</div>
              </div>
              <div className="text-xs font-bold tracking-[0.01em] text-slate-900 dark:text-white">{qa.label}</div>
              <div className="mt-1 max-w-[16ch] text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">{qa.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          KPI CARDS
         ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiCards.map((kpi, i) => (
          <div key={i} className={`${dashboardCardClass} p-5 hover:-translate-y-0.5 hover:border-slate-300/90 dark:hover:border-slate-700 hover:shadow-[0_22px_48px_rgba(15,23,42,0.14)]`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 leading-relaxed">{kpi.label}</span>
              <div className={kpi.iconWrapClass}>
                <kpi.Icon className="h-5 w-5 stroke-[2.3]" />
              </div>
            </div>
            <div className={`${kpi.valueClass} text-[1.9rem] leading-none font-black font-mono tracking-[-0.03em]`}>₹ {kpi.value.toLocaleString('en-IN')}</div>
            <div className="mt-2 text-[11px] font-semibold leading-relaxed text-slate-500 dark:text-slate-400">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════
          OUTSTANDING & NET POSITION
         ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Customer Receivable */}
        <button onClick={() => setActiveTab('customers')} className={`${dashboardCardClass} p-5 hover:border-indigo-400/70 dark:hover:border-indigo-500/60 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(15,23,42,0.14)] text-left`}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className={`${premiumIconShell} h-10 w-10 rounded-xl bg-[linear-gradient(145deg,rgba(238,242,255,0.98),rgba(224,231,255,0.92))] border-indigo-200/80 text-indigo-700 dark:bg-[linear-gradient(145deg,rgba(30,27,75,0.98),rgba(49,46,129,0.92))] dark:border-indigo-900/70 dark:text-indigo-200`}>
                <UserCheck className="h-[18px] w-[18px] stroke-[2.3]" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-300 leading-relaxed">{t('sections.outstanding.customerReceivable')}</div>
                <div className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">{t('sections.outstanding.customerHint')}</div>
              </div>
            </div>
            <span className="rounded-md border border-indigo-200/80 bg-indigo-50 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-700 dark:border-indigo-900/70 dark:bg-indigo-950/40 dark:text-indigo-300">{customers.length} {t('sections.outstanding.buyers')}</span>
          </div>
          <div className="text-[1.95rem] leading-none font-black font-mono tracking-[-0.03em] text-indigo-700 dark:text-indigo-200">₹ {totalCustomerReceivable.toLocaleString('en-IN')}</div>
        </button>

        {/* Supplier Payable */}
        <button onClick={() => setActiveTab('suppliers')} className={`${dashboardCardClass} p-5 hover:border-emerald-400/70 dark:hover:border-emerald-500/60 hover:-translate-y-0.5 text-left`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider"><Users className="w-4 h-4" /><span>{t('sections.outstanding.supplierPayable')}</span></div>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">{suppliers.length} {t('sections.outstanding.suppliers')}</span>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-300">₹ {totalSupplierPayable.toLocaleString('en-IN')}</div>
          <div className="text-[10px] dark:text-slate-500 text-slate-400 mt-1 font-medium">{t('sections.outstanding.supplierHint')}</div>
        </button>

        {/* Net Position */}
        <div className={`p-5 rounded-xl border shadow-[0_16px_34px_rgba(15,23,42,0.08)] dark:shadow-[0_18px_38px_rgba(2,6,23,0.3)] ${netPosition >= 0 ? 'dark:bg-emerald-950/26 bg-emerald-50/90 dark:border-emerald-500/22 border-emerald-200/90' : 'dark:bg-rose-950/26 bg-rose-50/90 dark:border-rose-500/22 border-rose-200/90'}`}>
          <div className="flex items-center space-x-2 mb-2">
            {netPosition >= 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
            <span className="text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500">{t('sections.netPosition.title')}</span>
          </div>
          <div className={`text-2xl font-black font-mono ${netPosition >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {netPosition >= 0 ? '+' : ''}₹ {netPosition.toLocaleString('en-IN')}
          </div>
          <div className={`text-[10px] font-bold mt-1 ${netPosition >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
            {netPosition >= 0 ? t('sections.netPosition.positive') : t('sections.netPosition.negative')}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          BOTTOM ROW: TOP VARIETIES + LOW STOCK + RECENT
         ══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Top Varieties */}
        <div className={`${dashboardCardClass} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400 font-bold text-xs uppercase tracking-wider"><Layers className="w-4 h-4" /><span>{t('sections.topVarieties.title')}</span></div>
            <button onClick={() => setActiveTab('inventory')} className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold cursor-pointer hover:underline">{t('sections.topVarieties.viewAll')}</button>
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
            {topVarieties.length === 0 && <div className="text-center text-xs dark:text-slate-500 text-slate-400 py-4">{t('sections.topVarieties.empty')}</div>}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className={`${dashboardCardClass} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider"><AlertTriangle className="w-4 h-4" /><span>{t('sections.lowStock.title')}</span></div>
            <span className="text-[10px] font-mono dark:bg-amber-500/10 bg-amber-50 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-bold">{lowStock.length} {t('sections.lowStock.items')}</span>
          </div>
          <div className="space-y-2.5 max-h-48 overflow-y-auto">
            {lowStock.map(item => (
              <div key={item.key} className="flex items-center justify-between p-2.5 dark:bg-amber-950/18 bg-amber-50/80 rounded-lg border dark:border-amber-500/10 border-amber-200/80">
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
            {lowStock.length === 0 && <div className="text-center text-xs dark:text-slate-500 text-slate-400 py-4">{t('sections.lowStock.allOptimal')}</div>}
          </div>
        </div>

        {/* Gross Profit Quick View */}
        <div className={`${dashboardCardClass} p-5`}>
          <div className="flex items-center space-x-2 mb-4 text-xs font-bold uppercase tracking-wider dark:text-slate-400 text-slate-500"><BarChart3 className="w-4 h-4 text-cyan-500" /><span>{t('sections.profitQuick.title')}</span></div>
          <div className="space-y-3">
            <div className="flex justify-between items-center"><span className="text-xs dark:text-slate-400 text-slate-600">{t('sections.profitQuick.totalSales')}</span><span className="font-mono font-bold text-xs text-emerald-500">₹ {totalSales.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between items-center"><span className="text-xs dark:text-slate-400 text-slate-600">{t('sections.profitQuick.totalPurchase')}</span><span className="font-mono font-bold text-xs text-rose-500">₹ {totalPurchase.toLocaleString('en-IN')}</span></div>
            <div className="border-t dark:border-slate-800 border-slate-200 pt-2 flex justify-between items-center">
              <span className="text-xs font-bold dark:text-white text-slate-900">{t('sections.profitQuick.grossProfit')}</span>
              <span className={`font-mono font-black text-sm ${grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>₹ {grossProfit.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs dark:text-slate-400 text-slate-600">{t('sections.profitQuick.margin')}</span>
              <span className={`font-mono font-bold text-xs ${grossProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(1) : '0.0'}%</span>
            </div>
          </div>
          <button onClick={() => setActiveTab('reports')} className="w-full mt-4 py-2 text-center text-xs font-bold text-cyan-700 dark:text-cyan-300 dark:bg-slate-800/88 bg-slate-100/90 rounded-lg border dark:border-slate-700/80 border-slate-200/80 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">{t('sections.profitQuick.viewReport')}</button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          RECENT TRANSACTIONS FEED
         ══════════════════════════════════════════════ */}
      <div className={`${dashboardCardClass} overflow-hidden`}>
        <div className="px-5 py-3.5 dark:bg-slate-950/90 bg-slate-50/90 border-b dark:border-slate-800/90 border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-bold dark:text-white text-slate-900 uppercase tracking-wider">{t('sections.recent.title')}</span>
            <span className="text-[10px] font-mono dark:bg-slate-800 bg-slate-200 dark:text-slate-400 text-slate-600 px-2 py-0.5 rounded font-bold">{t('sections.recent.live')}</span>
          </div>
          <button onClick={() => setActiveTab('reports')} className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 cursor-pointer hover:underline">{t('sections.recent.fullReports')}</button>
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
          {recentTx.length === 0 && <div className="py-12 text-center text-xs dark:text-slate-500 text-slate-400">{t('sections.recent.empty')}</div>}
        </div>
      </div>
    </div>
  );
};
