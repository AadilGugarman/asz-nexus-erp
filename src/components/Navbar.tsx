import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Truck, ShoppingCart, ShoppingBag, Users, UserCheck, Package,
  Settings, Keyboard, BarChart3, Wallet, FileBarChart2, Contact,
  PanelLeftClose, PanelLeft, ChevronRight, Menu, X
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenShortcuts: () => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  badge?: string;
  group?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenShortcuts, collapsed, setCollapsed }) => {
  const { settings } = useApp();
  const coName = settings.company.name;
  const initials = coName.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();

  const [mobileOpen, setMobileOpen] = useState(false);

  const navGroups: { title: string; items: NavItem[] }[] = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
      ]
    },
    {
      title: 'Transactions',
      items: [
        { id: 'arrival', label: 'Vehicle Inward', icon: Truck, badge: 'IN' },
        { id: 'purchase', label: 'Purchase Billing', icon: ShoppingBag },
        { id: 'sales', label: 'Sales Billing', icon: ShoppingCart },
        { id: 'payments', label: 'Payments', icon: Wallet },
      ]
    },
    {
      title: 'Data',
      items: [
        { id: 'inventory', label: 'Inventory', icon: Package },
        { id: 'parties', label: 'Parties', icon: Contact },
        { id: 'suppliers', label: 'Suppliers', icon: Users },
        { id: 'customers', label: 'Customers', icon: UserCheck },
        { id: 'reports', label: 'Reports', icon: FileBarChart2 },
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings },
      ]
    }
  ];

  const handleNav = (id: string) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* ── Logo / Brand ─────────────────────── */}
      <div className={`p-4 border-b dark:border-slate-800 border-slate-200 ${collapsed ? 'px-3' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => handleNav('dashboard')}>
            <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-2 rounded-xl shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Truck className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            {!collapsed && (
              <div className="animate-fade-in">
                <span className="font-black text-lg tracking-tight bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-200 bg-clip-text text-transparent leading-none block">
                  {initials}
                </span>
                <span className="text-[10px] dark:text-slate-400 text-slate-500 font-bold tracking-wider uppercase block truncate max-w-[140px] leading-tight mt-0.5">{coName}</span>
              </div>
            )}
          </div>
          {/* Collapse toggle (desktop) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg dark:text-slate-500 text-slate-400 dark:hover:text-white hover:text-slate-900 dark:hover:bg-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
          {/* Close (mobile) */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg dark:text-slate-400 text-slate-500 dark:hover:text-white hover:text-slate-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── Navigation Groups ────────────────── */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-5 scrollbar-thin">
        {navGroups.map(group => (
          <div key={group.title}>
            {!collapsed && (
              <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] dark:text-slate-500 text-slate-400 select-none">
                {group.title}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center rounded-xl transition-all duration-150 cursor-pointer group/item relative ${
                      collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 space-x-3'
                    } ${
                      isActive
                        ? 'dark:bg-emerald-500/15 bg-emerald-50 text-emerald-700 dark:text-emerald-400 shadow-sm font-bold'
                        : 'dark:text-slate-300 text-slate-600 dark:hover:bg-slate-800/70 hover:bg-slate-100 dark:hover:text-white hover:text-slate-900'
                    }`}
                  >
                    {/* Active indicator bar */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-emerald-500 rounded-r-full" />
                    )}

                    <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                      isActive ? 'text-emerald-600 dark:text-emerald-400' : 'dark:text-slate-400 text-slate-500 group-hover/item:text-slate-900 dark:group-hover/item:text-white'
                    }`} />

                    {!collapsed && (
                      <>
                        <span className="text-[13px] font-semibold truncate flex-1 text-left">{item.label}</span>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider font-mono bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                            {item.badge}
                          </span>
                        )}
                        {isActive && <ChevronRight className="w-3.5 h-3.5 dark:text-emerald-500/60 text-emerald-400 shrink-0" />}
                      </>
                    )}

                    {/* Collapsed tooltip */}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2.5 py-1.5 rounded-lg dark:bg-slate-800 bg-slate-900 text-white text-xs font-bold whitespace-nowrap opacity-0 pointer-events-none group-hover/item:opacity-100 transition-opacity z-50 shadow-xl">
                        {item.label}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent dark:border-r-slate-800 border-r-slate-900" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom Section ────────────────────── */}
      <div className={`border-t dark:border-slate-800 border-slate-200 p-3 ${collapsed ? 'px-2' : ''}`}>
        <button
          onClick={onOpenShortcuts}
          title="Keyboard shortcuts"
          className={`w-full flex items-center rounded-xl dark:text-slate-400 text-slate-500 dark:hover:bg-slate-800 hover:bg-slate-100 dark:hover:text-white hover:text-slate-900 transition-all cursor-pointer ${
            collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 space-x-3'
          }`}
        >
          <Keyboard className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && (
            <>
              <span className="text-[13px] font-semibold flex-1 text-left">Shortcuts</span>
              <kbd className="text-[9px] font-mono font-bold dark:bg-slate-800 bg-slate-200 dark:text-slate-400 text-slate-500 px-1.5 py-0.5 rounded border dark:border-slate-700 border-slate-300">Alt+K</kbd>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop Sidebar (fixed left) ───────── */}
      <aside className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-50 dark:bg-slate-900 bg-white border-r dark:border-slate-800 border-slate-200/80 transition-all duration-300 no-print shadow-sm ${
        collapsed ? 'w-[68px]' : 'w-[240px]'
      }`}>
        <SidebarContent />
      </aside>

      {/* ── Mobile Top Bar ─────────────────────── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 dark:bg-slate-900/95 bg-white/95 backdrop-blur-xl border-b dark:border-slate-800 border-slate-200 shadow-lg no-print">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center space-x-3">
            <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg dark:text-slate-300 text-slate-600 dark:hover:bg-slate-800 hover:bg-slate-100 cursor-pointer transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-1.5 rounded-lg shadow-md">
                <Truck className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="font-black text-sm bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">{initials}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={onOpenShortcuts} className="p-2 rounded-lg dark:text-slate-400 text-slate-500 cursor-pointer">
              <Keyboard className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile Overlay Drawer ──────────────── */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 z-50 w-[260px] dark:bg-slate-900 bg-white shadow-2xl animate-slide-right">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
};
