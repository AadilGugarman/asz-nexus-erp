import React, { useState } from 'react';
import { useAppTranslation } from '@/hooks';

// Utility to generate company initials (max 3, skip common words)
const getCompanyInitials = (name: string) => {
  const skip = ["and", "&", "of", "the"];
  return name
    .split(/\s+/)
    .filter(w => w && !skip.includes(w.toLowerCase()))
    .map(w => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
};
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
  const { t } = useAppTranslation('navbar');
  const { settings } = useApp();
  const coName = settings.company.name;
  const initials = getCompanyInitials(coName);

  const [mobileOpen, setMobileOpen] = useState(false);

  const navGroups: { title: string; items: NavItem[] }[] = [
    {
      title: t('groups.overview'),
      items: [
        { id: 'dashboard', label: t('items.dashboard'), icon: BarChart3 },
      ]
    },
    {
      title: t('groups.transactions'),
      items: [
        { id: 'arrival', label: t('items.arrival'), icon: Truck, badge: 'IN' },
        { id: 'purchase', label: t('items.purchase'), icon: ShoppingBag },
        { id: 'sales', label: t('items.sales'), icon: ShoppingCart },
        { id: 'payments', label: t('items.payments'), icon: Wallet },
      ]
    },
    {
      title: t('groups.data'),
      items: [
        { id: 'inventory', label: t('items.inventory'), icon: Package },
        { id: 'parties', label: t('items.parties'), icon: Contact },
        { id: 'suppliers', label: t('items.suppliers'), icon: Users },
        { id: 'customers', label: t('items.customers'), icon: UserCheck },
        { id: 'reports', label: t('items.reports'), icon: FileBarChart2 },
      ]
    },
    {
      title: t('groups.system'),
      items: [
        { id: 'settings', label: t('items.settings'), icon: Settings },
      ]
    }
  ];

  const handleNav = (id: string) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className={`p-4 border-b dark:border-slate-700 border-[#e2e8f0] ${collapsed ? 'px-3' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => handleNav('dashboard')}>
            <div className="bg-[linear-gradient(135deg,#00C896,#00AEEF)] p-2 rounded-xl shadow-[0_10px_24px_rgba(0,174,239,0.22)] group-hover:scale-[1.02] transition-transform shrink-0">
              <Truck className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            {!collapsed && (
              <div className="animate-fade-in min-w-0">
                <span className="font-semibold text-[17px] tracking-tight dark:text-slate-100 text-[#0f172a] leading-none block">
                  {initials}
                </span>
                <span className="text-[10px] dark:text-slate-400 text-[#64748b] font-semibold tracking-[0.12em] uppercase block truncate max-w-[140px] leading-tight mt-0.5">{coName}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg dark:text-slate-400 text-[#94a3b8] dark:hover:text-slate-100 hover:text-[#0f172a] dark:hover:bg-slate-700 hover:bg-[#f1f5f9] transition-colors cursor-pointer"
            title={collapsed ? t('tooltips.expandSidebar') : t('tooltips.collapseSidebar')}
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg dark:text-slate-400 text-[#64748b] dark:hover:text-slate-100 hover:text-[#0f172a] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-5 scrollbar-thin">
        {navGroups.map(group => (
          <div key={group.title}>
            {!collapsed && (
              <div className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] dark:text-slate-500 text-[#94a3b8] select-none">
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
                        ? 'bg-[rgba(0,200,150,0.12)] dark:bg-[rgba(0,200,150,0.16)] dark:text-slate-100 text-[#0f172a] shadow-sm font-semibold'
                        : 'dark:text-slate-400 text-[#475569] dark:hover:bg-slate-700 hover:bg-[#f8fafc] dark:hover:text-slate-100 hover:text-[#0f172a]'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#00c896] rounded-r-full" />
                    )}

                    <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                      isActive ? 'text-[#00aeef]' : 'dark:text-slate-500 text-[#94a3b8] dark:group-hover/item:text-slate-300 group-hover/item:text-[#475569]'
                    }`} />

                    {!collapsed && (
                      <>
                        <span className="text-[13px] font-semibold truncate flex-1 text-left">{item.label}</span>
                        {item.badge && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono bg-[rgba(0,200,150,0.12)] text-[#0f766e] dark:text-emerald-300 border border-[rgba(0,200,150,0.24)] shrink-0">
                            {item.badge}
                          </span>
                        )}
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#00aeef] shrink-0" />}
                      </>
                    )}

                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2.5 py-1.5 rounded-lg dark:bg-slate-700 bg-[#0f172a] text-white text-xs font-semibold whitespace-nowrap opacity-0 pointer-events-none group-hover/item:opacity-100 transition-opacity z-50 shadow-xl">
                        {item.label}
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent dark:border-r-slate-700 border-r-[#0f172a]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className={`border-t dark:border-slate-700 border-[#e2e8f0] p-3 ${collapsed ? 'px-2' : ''}`}>
        <button
          onClick={onOpenShortcuts}
          title={t('tooltips.keyboardShortcuts')}
          className={`w-full flex items-center rounded-xl dark:text-slate-400 text-[#64748b] dark:hover:bg-slate-700 hover:bg-[#f8fafc] dark:hover:text-slate-100 hover:text-[#0f172a] transition-all cursor-pointer ${
            collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5 space-x-3'
          }`}
        >
          <Keyboard className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && (
            <>
              <span className="text-[13px] font-semibold flex-1 text-left">{t('actions.shortcuts')}</span>
              <kbd className="text-[9px] font-mono font-bold dark:bg-slate-700 bg-[#f1f5f9] dark:text-slate-400 text-[#64748b] px-1.5 py-0.5 rounded dark:border-slate-600 border border-[#e2e8f0]">Alt+K</kbd>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-50 dark:bg-slate-900 bg-white dark:border-slate-700 border-r border-[#e2e8f0] transition-all duration-300 no-print shadow-[0_8px_24px_rgba(15,23,42,0.05)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.3)] ${
        collapsed ? 'w-[68px]' : 'w-[240px]'
      }`}>
        <SidebarContent />
      </aside>

      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 dark:bg-slate-900/95 bg-white/95 backdrop-blur-xl dark:border-slate-700 border-b border-[#e2e8f0] shadow-sm no-print">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center space-x-3">
            <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg dark:text-slate-400 text-[#475569] dark:hover:bg-slate-700 hover:bg-[#f8fafc] cursor-pointer transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <div className="bg-[linear-gradient(135deg,#00C896,#00AEEF)] p-1.5 rounded-lg shadow-md">
                <Truck className="w-4 h-4 text-white stroke-[2.5]" />
              </div>
              <span className="font-semibold text-sm dark:text-slate-100 text-[#0f172a]">{initials}</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={onOpenShortcuts} className="p-2 rounded-lg dark:text-slate-400 text-[#64748b] cursor-pointer">
              <Keyboard className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

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
