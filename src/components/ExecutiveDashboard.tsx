import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAppTranslation } from '@/hooks';
import { fmtDate } from '@/utils/format';
import {
  TrendingUp, DollarSign, Users, UserCheck,
  ArrowUpRight, ArrowDownRight, Sparkles, Download,
  Truck, ShoppingCart, ShoppingBag, Wallet, FileBarChart2, Settings,
  Clock, Zap, Calendar,
} from 'lucide-react';
import { useToast } from './ui/Toast';
import { useAppearanceStore } from '@/store/appearance.store';

// ── Design tokens ─────────────────────────────────────────────────────────────
// Returns the full token set for the current theme.
// All inline style= values come from here so dark mode works correctly.
function buildTokens(isDark: boolean) {
  return {
    // ── Hero gradient ─────────────────────────────
    heroBg: isDark
      ? 'linear-gradient(135deg, #0b1120 0%, #131e30 45%, #0f1a2a 100%)'
      : 'linear-gradient(135deg, #f0f9ff 0%, #ffffff 45%, #ecfeff 100%)',
    heroGlowBlue: isDark ? 'rgba(59,130,246,0.07)' : 'rgba(14,165,233,0.08)',
    heroGlowCyan: isDark ? 'rgba(6,182,212,0.04)'  : 'rgba(6,182,212,0.06)',

    // ── Surfaces ──────────────────────────────────
    cardBg:          isDark ? '#131e30'                    : '#ffffff',
    cardBorder:      isDark ? 'rgba(30,48,72,0.9)'         : 'rgba(15,23,42,0.08)',
    cardBorderHover: isDark ? 'rgba(59,130,246,0.40)'      : 'rgba(59,130,246,0.30)',
    cardShadow:      isDark
      ? '0 1px 4px rgba(0,0,0,0.4), 0 0 0 1px rgba(30,48,72,0.6)'
      : '0 1px 3px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.05)',
    cardShadowHover: isDark
      ? '0 4px 16px rgba(0,0,0,0.45), 0 0 0 1px rgba(30,48,72,0.5)'
      : '0 4px 12px rgba(15,23,42,0.08), 0 12px 32px rgba(15,23,42,0.07)',

    // ── Snapshot panel ────────────────────────────
    snapshotBg:     isDark ? 'rgba(15,26,42,0.85)'  : 'rgba(255,255,255,0.75)',
    snapshotBorder: isDark ? 'rgba(30,48,72,0.9)'   : 'rgba(15,23,42,0.09)',
    snapshotDivider:isDark ? 'rgba(30,48,72,0.8)'   : 'rgba(15,23,42,0.07)',

    // ── Text hierarchy ────────────────────────────
    heroHeading:   isDark ? '#e8f0fe' : '#0f172a',
    textPrimary:   isDark ? '#e8f0fe' : '#1e293b',
    textSecondary: isDark ? '#94b4d4' : '#64748b',
    textMuted:     isDark ? '#6a8aaa' : '#94a3b8',

    // ── Badges / pills ────────────────────────────
    pillBg:     isDark ? 'rgba(19,30,48,0.9)'  : 'rgba(241,245,249,0.90)',
    pillBorder: isDark ? 'rgba(42,64,96,0.9)'  : 'rgba(15,23,42,0.10)',
    pillText:   isDark ? '#94b4d4'             : '#475569',

    // ── Feed header bg ────────────────────────────
    feedHeaderBg: isDark ? '#0f1a2a' : '#f8fafc',

    // ── Row hover ─────────────────────────────────
    rowHoverBg: isDark ? '#1a2d45' : '#f8fafc',

    // ── Blue accent ───────────────────────────────
    blue:       '#2563eb',
    blueDim:    isDark ? 'rgba(37,99,235,0.12)'  : 'rgba(37,99,235,0.08)',
    blueBorder: isDark ? 'rgba(37,99,235,0.30)'  : 'rgba(37,99,235,0.20)',
    blueText:   isDark ? '#60a5fa'               : '#1d4ed8',

    // ── Emerald ───────────────────────────────────
    emerald:       '#059669',
    emeraldDim:    isDark ? 'rgba(5,150,105,0.12)'  : 'rgba(5,150,105,0.08)',
    emeraldBorder: isDark ? 'rgba(5,150,105,0.28)'  : 'rgba(5,150,105,0.18)',
    emeraldText:   isDark ? '#34d399'               : '#047857',

    // ── Rose ──────────────────────────────────────
    rose:    '#e11d48',
    roseDim: isDark ? 'rgba(225,29,72,0.10)'  : 'rgba(225,29,72,0.07)',
    roseText:isDark ? '#fb7185'               : '#be123c',

    // ── Amber ─────────────────────────────────────
    amber:       '#d97706',
    amberDim:    isDark ? 'rgba(217,119,6,0.12)'  : 'rgba(217,119,6,0.08)',
    amberBorder: isDark ? 'rgba(217,119,6,0.28)'  : 'rgba(217,119,6,0.18)',
    amberText:   isDark ? '#fbbf24'               : '#b45309',

    // ── Divider ───────────────────────────────────
    divider: isDark ? 'rgba(30,48,72,0.8)' : 'rgba(15,23,42,0.07)',

    // ── Hero badge ────────────────────────────────
    heroBadgeBg:     isDark ? 'rgba(30,58,92,0.85)'  : 'rgba(224,242,254,0.85)',
    heroBadgeBorder: isDark ? 'rgba(59,130,246,0.25)': 'rgba(14,165,233,0.20)',
    heroBadgeText:   isDark ? '#60b8f0'              : '#0369a1',
    heroBadgeIcon:   isDark ? '#60b8f0'              : '#0284c7',

    // ── Backup button ─────────────────────────────
    backupBg:     isDark ? 'rgba(19,30,48,0.85)'  : 'rgba(255,255,255,0.80)',
    backupBorder: isDark ? 'rgba(30,48,72,0.9)'   : 'rgba(15,23,42,0.08)',
  } as const;
}


interface ExecutiveDashboardProps {
  setActiveTab: (tab: string) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ setActiveTab }) => {
  const { vehicles, invoices, purchaseInvoices, suppliers, customers, payments, settings, getExportData } = useApp() || {};
  const { t } = useAppTranslation('dashboard');
  const toast = useToast();
  const resolvedTheme = useAppearanceStore(s => s.resolvedTheme);
  const D = useMemo(() => buildTokens(resolvedTheme === 'dark'), [resolvedTheme]);

  if (!useApp()) {
    return <div className="p-8 text-center text-slate-500">Loading dashboard...</div>;
  }

  const savedVehicles = (vehicles || []).filter(v => v?.status === 'SAVED');

  // ── Financial calculations ────────────────────────────────────────────────
  const totalPurchase = useMemo(() => {
    const vAmt = (savedVehicles || []).reduce((s, v) => s + (v?.totalAmount || 0), 0);
    const pAmt = (purchaseInvoices || []).reduce((s, i) => s + (i?.todayAmount || 0), 0);
    return vAmt + pAmt;
  }, [savedVehicles, purchaseInvoices]);

  const totalSales = useMemo(() => {
    return (invoices || []).reduce((s, i) => s + (i?.todayAmount || 0), 0);
  }, [invoices]);

  const totalSupplierPayable = useMemo(() => {
    const prev = (suppliers || []).reduce((s, sup) => s + (sup?.previousBalance || 0), 0);
    const paid = (payments || []).filter(p => p?.partyType === 'SUPPLIER').reduce((s, p) => s + (p?.amount || 0), 0);
    return prev + totalPurchase - paid;
  }, [suppliers, totalPurchase, payments]);

  const totalCustomerReceivable = useMemo(() => {
    const prev = (customers || []).reduce((s, c) => s + (c?.previousBalance || 0), 0);
    const received = (payments || []).filter(p => p?.partyType === 'CUSTOMER').reduce((s, p) => s + (p?.amount || 0), 0);
    return prev + totalSales - received;
  }, [customers, totalSales, payments]);

  // ── Today's snapshot ──────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const todayStats = useMemo(() => {
    const tVeh = (savedVehicles || []).filter(v => v?.date === today);
    const tPinv = (purchaseInvoices || []).filter(i => i?.date === today);
    const tSinv = (invoices || []).filter(i => i?.date === today);
    const tPay = (payments || []).filter(p => p?.date === today);
    
    return {
      loads: tVeh.length + tPinv.length,
      purchaseAmt: tVeh.reduce((s, v) => s + (v?.totalAmount || 0), 0) + tPinv.reduce((s, i) => s + (i?.todayAmount || 0), 0),
      salesCount: tSinv.length,
      salesAmt: tSinv.reduce((s, i) => s + (i?.todayAmount || 0), 0),
      paymentsCount: tPay.length,
      cashIn: tPay.filter(p => p?.partyType === 'CUSTOMER').reduce((s, p) => s + (p?.amount || 0), 0),
      cashOut: tPay.filter(p => p?.partyType === 'SUPPLIER').reduce((s, p) => s + (p?.amount || 0), 0),
      weightIn: tVeh.reduce((s, v) => s + (v?.totalCalculatedWeight || 0), 0) + 
                tPinv.reduce((s, i) => s + (i?.items || []).reduce((a, it) => a + (Number(it?.weight) || 0), 0), 0),
    };
  }, [today, savedVehicles, purchaseInvoices, invoices, payments]);

  // ── Recent transactions ───────────────────────────────────────────────────
  const recentTx = useMemo(() => {
    const all: { id: string; date: string; type: string; ref: string; party: string; amount: number; isCredit: boolean }[] = [];
    
    (savedVehicles || []).forEach(v => {
      if (!v) return;
      all.push({ 
        id: v.id, 
        date: v.date, 
        type: `🚛 ${t('transactions.inward') || 'Inward'}`, 
        ref: v.arrivalNo || '—', 
        party: (v.rows || []).map(r => r?.supplierName).filter((x, i, a) => x && a.indexOf(x) === i).join(', ') || '—', 
        amount: -(v.totalAmount || 0), 
        isCredit: false 
      });
    });

    (purchaseInvoices || []).forEach(i => {
      if (!i) return;
      all.push({ 
        id: i.id, 
        date: i.date, 
        type: `📄 ${t('transactions.purchase') || 'Purchase'}`, 
        ref: i.billNo || '—', 
        party: i.supplierName || '—', 
        amount: -(i.todayAmount || 0), 
        isCredit: false 
      });
    });

    (invoices || []).forEach(i => {
      if (!i) return;
      all.push({ 
        id: i.id, 
        date: i.date, 
        type: `📤 ${t('transactions.sale') || 'Sale'}`, 
        ref: i.invoiceNo || '—', 
        party: i.customerName || '—', 
        amount: (i.todayAmount || 0), 
        isCredit: true 
      });
    });

    (payments || []).forEach(p => {
      if (!p) return;
      all.push({ 
        id: p.id, 
        date: p.date, 
        type: p.partyType === 'SUPPLIER' ? `💸 ${t('transactions.paidOut') || 'Paid Out'}` : `💰 ${t('transactions.received') || 'Received'}`, 
        ref: p.referenceNo || '—', 
        party: p.partyName || '—', 
        amount: p.partyType === 'SUPPLIER' ? -(p.amount || 0) : (p.amount || 0), 
        isCredit: p.partyType === 'CUSTOMER' 
      });
    });

    return all.sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 8);
  }, [savedVehicles, purchaseInvoices, invoices, payments, t]);

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const blob = new Blob([getExportData()], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    const coName = settings.company?.name || 'tfc-erp';
    a.download = `${coName.replace(/\s+/g, '-').toLowerCase()}-backup-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('toasts.backupExported.title'), t('toasts.backupExported.description'));
  };

  // ── Greeting ──────────────────────────────────────────────────────────────
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t('greeting.morning');
    if (h < 17) return t('greeting.afternoon');
    return t('greeting.evening');
  })();
  const currentTime = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const currentDate = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // ── Quick actions ─────────────────────────────────────────────────────────
  const quickActions = [
    { label: t('quickActions.arrival.label'),  desc: t('quickActions.arrival.desc'),  Icon: Truck,         tab: 'arrival',   iconBg: D.blueDim,    iconBorder: D.blueBorder,    iconColor: D.blue,        key: 'F1'    },
    { label: t('quickActions.purchase.label'), desc: t('quickActions.purchase.desc'), Icon: ShoppingBag,   tab: 'purchase',  iconBg: D.emeraldDim, iconBorder: D.emeraldBorder, iconColor: D.emerald,     key: 'Alt+2' },
    { label: t('quickActions.sales.label'),    desc: t('quickActions.sales.desc'),    Icon: ShoppingCart,  tab: 'sales',     iconBg: 'rgba(99,102,241,0.08)', iconBorder: 'rgba(99,102,241,0.18)', iconColor: '#4f46e5', key: 'F2'    },
    { label: t('quickActions.payment.label'),  desc: t('quickActions.payment.desc'),  Icon: Wallet,        tab: 'payments',  iconBg: D.amberDim,   iconBorder: D.amberBorder,   iconColor: D.amber,       key: 'Alt+5' },
    { label: t('quickActions.reports.label'),  desc: t('quickActions.reports.desc'),  Icon: FileBarChart2, tab: 'reports',   iconBg: 'rgba(14,165,233,0.08)', iconBorder: 'rgba(14,165,233,0.18)', iconColor: '#0284c7', key: 'Alt+6' },
    { label: t('quickActions.settings.label'), desc: t('quickActions.settings.desc'), Icon: Settings,      tab: 'settings',  iconBg: 'rgba(100,116,139,0.08)', iconBorder: 'rgba(100,116,139,0.15)', iconColor: '#475569', key: 'Alt+9' },
  ];

  // ── KPI cards — purchase & sales only ────────────────────────────────────
  const kpiCards = [
    { label: t('kpi.totalPurchase'), value: totalPurchase, sub: `${savedVehicles.length + purchaseInvoices.length} ${t('kpi.loadsBills')}`, valueColor: D.roseText,    Icon: DollarSign, iconBg: D.roseDim,    iconBorder: 'rgba(225,29,72,0.15)',  iconColor: D.rose    },
    { label: t('kpi.totalSales'),    value: totalSales,    sub: `${invoices.length} ${t('kpi.invoices')}`,                                  valueColor: D.emeraldText, Icon: TrendingUp, iconBg: D.emeraldDim, iconBorder: D.emeraldBorder,         iconColor: D.emerald },
  ];


  return (
    <div className="space-y-6 font-sans">

      {/* ════════════════════════════════════════════════════════════════════
          HERO SECTION — deep navy-to-slate gradient
         ════════════════════════════════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: D.heroBg,
          border: `1px solid ${D.cardBorder}`,
          boxShadow: '0 2px 8px rgba(15,23,42,0.06), 0 8px 32px rgba(15,23,42,0.05)',
        }}
      >
        {/* Ambient glow orbs */}
        <div className="pointer-events-none absolute -right-24 -bottom-24 w-[480px] h-[480px] rounded-full blur-3xl" style={{ background: D.heroGlowBlue }} />
        <div className="pointer-events-none absolute -left-20 -top-10 w-[360px] h-[360px] rounded-full blur-3xl" style={{ background: D.heroGlowCyan }} />
        {/* Subtle dot grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.018]" style={{ backgroundImage: 'radial-gradient(circle, #0f172a 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative z-10 p-7 md:p-9">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">

            {/* Left — greeting & actions */}
            <div className="space-y-4 max-w-xl">
              {/* Top badges row */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div
                  className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider"
                  style={{ background: D.heroBadgeBg, border: `1px solid ${D.heroBadgeBorder}`, color: D.heroBadgeText, backdropFilter: 'blur(8px)' }}
                >
                  <Sparkles className="w-3 h-3" style={{ color: D.heroBadgeIcon }} />
                  <span>{t('hero.brandBadge')}</span>
                </div>
                <div
                  className="flex items-center space-x-1.5 text-[11px] font-mono"
                  style={{ color: D.textMuted }}
                >
                  <Clock className="w-3 h-3" />
                  <span>{currentTime}</span>
                </div>
              </div>

              {/* Greeting + company name */}
              <div>
                <p className="text-sm font-semibold" style={{ color: D.textSecondary }}>{greeting}!</p>
                <h1
                  className="text-3xl md:text-[2.4rem] font-black tracking-tight leading-tight mt-1"
                  style={{ color: D.heroHeading }}
                >
                  {settings.company?.name || 'TFC ERP'}
                </h1>
              </div>

              <p className="text-sm font-medium leading-relaxed" style={{ color: D.textSecondary }}>
                {currentDate} — {t('hero.summary')}
              </p>

              {/* CTA buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  onClick={() => setActiveTab('arrival')}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 hover:-translate-y-0.5 cursor-pointer"
                  style={{ background: D.blue, color: '#fff', boxShadow: `0 4px 14px rgba(37,99,235,0.25)` }}
                >
                  <Truck className="w-4 h-4 stroke-[2.5]" />
                  <span>{t('hero.newInward')}</span>
                </button>
                <button
                  onClick={() => setActiveTab('sales')}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 hover:-translate-y-0.5 cursor-pointer"
                  style={{ background: D.emerald, color: '#fff', boxShadow: `0 4px 14px rgba(5,150,105,0.22)` }}
                >
                  <ShoppingCart className="w-4 h-4 stroke-[2.5]" />
                  <span>{t('hero.newSales')}</span>
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 hover:-translate-y-0.5 cursor-pointer"
                  style={{ background: D.backupBg, border: `1px solid ${D.backupBorder}`, color: D.textSecondary, backdropFilter: 'blur(8px)' }}
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('hero.backup')}</span>
                </button>
              </div>
            </div>

            {/* Right — today's live snapshot */}
            <div
              className="rounded-xl p-5 min-w-[260px] backdrop-blur-sm"
              style={{ background: D.snapshotBg, border: `1px solid ${D.snapshotBorder}`, boxShadow: '0 2px 8px rgba(15,23,42,0.06), 0 8px 24px rgba(15,23,42,0.05)' }}
            >
              <div className="flex items-center space-x-2 mb-4">
                {/* Live indicator */}
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: D.emerald }} />
                <Calendar className="w-3.5 h-3.5" style={{ color: D.textMuted }} />
                <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: D.textSecondary }}>{t('hero.snapshotTitle')}</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: t('hero.snapshot.inwardLoads'),   value: String(todayStats.loads),                                                                    valueColor: D.textPrimary },
                  { label: t('hero.snapshot.purchaseValue'), value: `₹${todayStats.purchaseAmt.toLocaleString('en-IN')}`,                                        valueColor: D.roseText    },
                  { label: t('hero.snapshot.salesBills'),    value: String(todayStats.salesCount),                                                               valueColor: D.textPrimary },
                  { label: t('hero.snapshot.salesValue'),    value: `₹${todayStats.salesAmt.toLocaleString('en-IN')}`,                                           valueColor: D.emeraldText },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center text-sm">
                    <span style={{ color: D.textSecondary }}>{row.label}</span>
                    <span className="font-black font-mono" style={{ color: row.valueColor }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${D.snapshotDivider}` }} className="pt-2.5 space-y-2.5">
                  <div className="flex justify-between items-center text-sm">
                    <span style={{ color: D.textSecondary }}>{t('hero.snapshot.weightIn')}</span>
                    <span className="font-bold font-mono" style={{ color: D.textPrimary }}>{todayStats.weightIn.toLocaleString()} KG</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span style={{ color: D.textSecondary }}>{t('hero.snapshot.cashInOut')}</span>
                    <span className="font-bold font-mono text-xs" style={{ color: D.textPrimary }}>+₹{todayStats.cashIn.toLocaleString()} / -₹{todayStats.cashOut.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>


      {/* ════════════════════════════════════════════════════════════════════
          QUICK ACTIONS
         ════════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center space-x-2 mb-3.5">
          <Zap className="w-4 h-4" style={{ color: D.amberText }} />
          <h2 className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: D.textSecondary }}>{t('sections.quickActions')}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {quickActions.map(qa => (
            <button
              key={qa.tab}
              onClick={() => setActiveTab(qa.tab)}
              className="group p-4 rounded-xl text-left transition-all duration-150 hover:-translate-y-0.5 cursor-pointer"
              style={{ background: D.cardBg, border: `1px solid ${D.cardBorder}`, boxShadow: D.cardShadow }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = D.cardBorderHover; (e.currentTarget as HTMLButtonElement).style.boxShadow = D.cardShadowHover; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = D.cardBorder;      (e.currentTarget as HTMLButtonElement).style.boxShadow = D.cardShadow;      }}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:scale-[1.04]"
                  style={{ background: qa.iconBg, border: `1px solid ${qa.iconBorder}` }}
                >
                  <qa.Icon className="h-[18px] w-[18px] stroke-[2.3]" style={{ color: qa.iconColor }} />
                </div>
                <span
                  className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                  style={{ background: D.pillBg, border: `1px solid ${D.pillBorder}`, color: D.textMuted }}
                >
                  {qa.key}
                </span>              </div>
              <div className="text-[12px] font-bold" style={{ color: D.textPrimary }}>{qa.label}</div>
              <div className="mt-0.5 text-[10px] leading-relaxed max-w-[16ch]" style={{ color: D.textSecondary }}>{qa.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          KPI CARDS
         ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 gap-4">
        {kpiCards.map((kpi, i) => (
          <div
            key={i}
            className="p-5 rounded-xl transition-all duration-150 hover:-translate-y-0.5"
            style={{ background: D.cardBg, border: `1px solid ${D.cardBorder}`, boxShadow: D.cardShadow }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = D.cardBorderHover; (e.currentTarget as HTMLDivElement).style.boxShadow = D.cardShadowHover; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = D.cardBorder;      (e.currentTarget as HTMLDivElement).style.boxShadow = D.cardShadow;      }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.13em] leading-relaxed" style={{ color: D.textSecondary }}>{kpi.label}</span>
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: kpi.iconBg, border: `1px solid ${kpi.iconBorder}` }}
              >
                <kpi.Icon className="h-[18px] w-[18px] stroke-[2.3]" style={{ color: kpi.iconColor }} />
              </div>
            </div>
            <div className="text-[1.85rem] leading-none font-black font-mono tracking-[-0.03em]" style={{ color: kpi.valueColor }}>
              ₹ {kpi.value.toLocaleString('en-IN')}
            </div>
            <div className="mt-2 text-[11px] font-semibold" style={{ color: D.textSecondary }}>{kpi.sub}</div>
          </div>
        ))}
      </div>


      {/* ════════════════════════════════════════════════════════════════════
          OUTSTANDING BALANCES
         ════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Customer receivable */}
        <button
          onClick={() => setActiveTab('customers')}
          className="p-5 rounded-xl text-left transition-all duration-150 hover:-translate-y-0.5 cursor-pointer"
          style={{ background: D.cardBg, border: `1px solid ${D.cardBorder}`, boxShadow: D.cardShadow }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = D.blueBorder; (e.currentTarget as HTMLButtonElement).style.boxShadow = D.cardShadowHover; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = D.cardBorder; (e.currentTarget as HTMLButtonElement).style.boxShadow = D.cardShadow; }}
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: D.blueDim, border: `1px solid ${D.blueBorder}` }}>
                <UserCheck className="h-[17px] w-[17px] stroke-[2.3]" style={{ color: D.blueText }} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: D.textSecondary }}>{t('sections.outstanding.customerReceivable')}</div>
                <div className="text-[10px] font-medium truncate" style={{ color: D.textMuted }}>{t('sections.outstanding.customerHint')}</div>
              </div>
            </div>
            <span className="shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{ background: D.pillBg, border: `1px solid ${D.pillBorder}`, color: D.textSecondary }}>
              {customers.length} {t('sections.outstanding.buyers')}
            </span>
          </div>
          <div className="text-[1.85rem] leading-none font-black font-mono tracking-[-0.03em]" style={{ color: D.blueText }}>
            ₹ {totalCustomerReceivable.toLocaleString('en-IN')}
          </div>
        </button>

        {/* Supplier payable */}
        <button
          onClick={() => setActiveTab('suppliers')}
          className="p-5 rounded-xl text-left transition-all duration-150 hover:-translate-y-0.5 cursor-pointer"
          style={{ background: D.cardBg, border: `1px solid ${D.cardBorder}`, boxShadow: D.cardShadow }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = D.emeraldBorder; (e.currentTarget as HTMLButtonElement).style.boxShadow = D.cardShadowHover; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = D.cardBorder;    (e.currentTarget as HTMLButtonElement).style.boxShadow = D.cardShadow; }}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: D.emeraldDim, border: `1px solid ${D.emeraldBorder}` }}>
                <Users className="h-[17px] w-[17px] stroke-[2.3]" style={{ color: D.emeraldText }} />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.13em]" style={{ color: D.textSecondary }}>{t('sections.outstanding.supplierPayable')}</div>
                <div className="text-[10px] font-medium" style={{ color: D.textMuted }}>{t('sections.outstanding.supplierHint')}</div>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{ background: D.pillBg, border: `1px solid ${D.pillBorder}`, color: D.textSecondary }}>
              {suppliers.length} {t('sections.outstanding.suppliers')}
            </span>
          </div>
          <div className="text-[1.85rem] leading-none font-black font-mono tracking-[-0.03em]" style={{ color: D.emeraldText }}>
            ₹ {totalSupplierPayable.toLocaleString('en-IN')}
          </div>
        </button>

      </div>


      {/* ════════════════════════════════════════════════════════════════════
          RECENT TRANSACTIONS FEED
         ════════════════════════════════════════════════════════════════════ */}
      <div className="rounded-xl overflow-hidden" style={{ background: D.cardBg, border: `1px solid ${D.cardBorder}`, boxShadow: D.cardShadow }}>
        {/* Feed header */}
        <div
          className="px-5 py-3.5 flex items-center justify-between"
          style={{ background: D.feedHeaderBg, borderBottom: `1px solid ${D.divider}` }}
        >
          <div className="flex items-center space-x-2.5">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: D.emerald }} />
            <span className="text-[11px] font-bold uppercase tracking-[0.13em]" style={{ color: D.textPrimary }}>{t('sections.recent.title')}</span>
            <span
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded"
              style={{ background: D.emeraldDim, border: `1px solid ${D.emeraldBorder}`, color: D.emeraldText }}
            >
              {t('sections.recent.live')}
            </span>
          </div>
          <button onClick={() => setActiveTab('reports')} className="text-[10px] font-bold cursor-pointer hover:underline" style={{ color: D.blue }}>
            {t('sections.recent.fullReports')}
          </button>
        </div>

        {/* Transaction rows */}
        <div>
          {recentTx.map(tx => (
            <div
              key={tx.id + tx.type}
              className="flex items-center justify-between px-5 py-3 transition-colors duration-100"
              style={{ borderBottom: `1px solid ${D.divider}` }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = D.rowHoverBg; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className="p-1.5 rounded-lg shrink-0"
                  style={{
                    background: tx.isCredit ? D.emeraldDim : D.roseDim,
                  }}
                >
                  {tx.isCredit
                    ? <ArrowDownRight className="w-4 h-4" style={{ color: D.emeraldText }} />
                    : <ArrowUpRight   className="w-4 h-4" style={{ color: D.roseText }} />
                  }
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold" style={{ color: D.textPrimary }}>{tx.type}</span>
                    <span className="text-[10px] font-mono" style={{ color: D.textSecondary }}>{tx.ref}</span>
                  </div>
                  <div className="text-[10px] truncate max-w-[250px]" style={{ color: D.textSecondary }}>{tx.party}</div>
                </div>
              </div>
              <div className="text-right shrink-0 ml-4">
                <div className="text-sm font-black font-mono" style={{ color: tx.isCredit ? D.emeraldText : D.roseText }}>
                  {tx.amount >= 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] font-mono" style={{ color: D.textMuted }}>{fmtDate(tx.date)}</div>
              </div>
            </div>
          ))}
          {recentTx.length === 0 && (
            <div className="py-12 text-center text-xs" style={{ color: D.textSecondary }}>{t('sections.recent.empty')}</div>
          )}
        </div>
      </div>

    </div>
  );
};
