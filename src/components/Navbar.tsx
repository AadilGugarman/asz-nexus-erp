import React, { useState, useMemo } from "react";
import { useAppTranslation } from "@/hooks";
import { useSettingsStore } from "@/store/settings.store";
import { useAuthStore } from "@/store/auth.store";
import { useAppearanceStore } from "@/store/appearance.store";
import {
  Truck, ShoppingCart, ShoppingBag, Package, Settings,
  Keyboard, BarChart3, Wallet, FileBarChart2, Contact,
  PanelLeftClose, PanelLeft, ChevronRight, Menu, X,
  LogOut, Box,
} from "lucide-react";

// ── ERP Logo Icon (sidebar header) ───────────────────────────────────────────
// Same mark as TitleBar — rising bars + trend line.
const ErpLogoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect x="1"   y="10"  width="3" height="5"    rx="0.75" fill="white" opacity="0.95" />
    <rect x="6.5" y="7"   width="3" height="8"    rx="0.75" fill="white" opacity="0.95" />
    <rect x="12"  y="3.5" width="3" height="11.5" rx="0.75" fill="white" opacity="0.95" />
    <polyline
      points="2.5,10 8,7 13.5,3.5"
      stroke="white" strokeWidth="1.4"
      strokeLinecap="round" strokeLinejoin="round"
      opacity="0.9"
    />
    <circle cx="13.5" cy="3.5" r="1.2" fill="white" opacity="0.95" />
  </svg>
);

// ── Design tokens ────────────────────────────────────────────────────────────
function buildSidebarTokens(isDark: boolean) {
  return {
    // ── Backgrounds ───────────────────────────────
    sidebarBg:        isDark ? '#131e30'                    : '#ffffff',
    headerBorder:     isDark ? 'rgba(30,48,72,0.9)'         : 'rgba(15,23,42,0.08)',
    footerBorder:     isDark ? 'rgba(30,48,72,0.9)'         : 'rgba(15,23,42,0.08)',

    // ── Group labels ──────────────────────────────
    groupLabel:       isDark ? '#6a8aaa'                    : '#94a3b8',

    // ── Inactive nav items ────────────────────────
    inactiveText:     isDark ? '#94b4d4'                    : '#64748b',
    inactiveIcon:     isDark ? '#6a8aaa'                    : '#94a3b8',
    hoverBg:          isDark ? 'rgba(59,130,246,0.08)'      : 'rgba(15,23,42,0.04)',
    hoverText:        isDark ? '#e8f0fe'                    : '#334155',
    hoverIcon:        isDark ? '#94b4d4'                    : '#475569',

    // ── Active nav items ──────────────────────────
    activeBg:         isDark ? 'rgba(37,99,235,0.15)'       : '#eff6ff',
    activeBorder:     '#2563eb',
    activeText:       isDark ? '#60a5fa'                    : '#1d4ed8',
    activeIcon:       isDark ? '#60a5fa'                    : '#2563eb',

    // ── Logo gradient ─────────────────────────────
    logoBg:           'linear-gradient(135deg,#00C896,#00AEEF)',

    // ── Company name / subtitle ───────────────────
    companyName:      isDark ? '#e8f0fe'                    : '#0f172a',
    companySubtitle:  isDark ? '#94b4d4'                    : '#64748b',

    // ── Collapse toggle ───────────────────────────
    toggleText:       isDark ? '#6a8aaa'                    : '#94a3b8',
    toggleHoverBg:    isDark ? 'rgba(59,130,246,0.08)'      : 'rgba(15,23,42,0.05)',
    toggleHoverText:  isDark ? '#e8f0fe'                    : '#334155',

    // ── Tooltip (collapsed mode) ──────────────────
    tooltipBg:        isDark ? '#0f1a2a'                    : '#1e293b',
    tooltipText:      '#f1f5f9',

    // ── Footer actions ────────────────────────────
    shortcutText:     isDark ? '#94b4d4'                    : '#64748b',
    shortcutHoverBg:  isDark ? 'rgba(59,130,246,0.08)'      : 'rgba(15,23,42,0.04)',
    shortcutHoverText:isDark ? '#e8f0fe'                    : '#334155',
    kbdBg:            isDark ? '#0f1a2a'                    : '#f1f5f9',
    kbdText:          isDark ? '#6a8aaa'                    : '#94a3b8',
    kbdBorder:        isDark ? 'rgba(30,48,72,0.9)'         : 'rgba(15,23,42,0.10)',

    // ── Logout ────────────────────────────────────
    logoutText:       '#dc2626',
    logoutHoverBg:    'rgba(220,38,38,0.06)',

    // ── Mobile ────────────────────────────────────
    mobileBg:         isDark ? '#131e30'                    : '#ffffff',
    mobileOverlay:    isDark ? 'rgba(0,5,15,0.65)'          : 'rgba(15,23,42,0.40)',
    mobileHeaderBg:   isDark ? 'rgba(19,30,48,0.95)'        : 'rgba(255,255,255,0.92)',

    // ── Active badge ──────────────────────────────
    activeBadgeBg:    isDark ? 'rgba(37,99,235,0.20)'       : '#dbeafe',
    activeBadgeBorder:isDark ? 'rgba(37,99,235,0.30)'       : 'rgba(37,99,235,0.20)',
    inactiveBadgeBg:  isDark ? 'rgba(30,48,72,0.6)'         : 'rgba(15,23,42,0.05)',
    inactiveBadgeBorder:isDark? 'rgba(42,64,96,0.6)'        : 'rgba(15,23,42,0.08)',
    inactiveBadgeText:isDark ? '#6a8aaa'                    : '#64748b',

    // ── Sidebar shadow ────────────────────────────
    sidebarShadow:    isDark
      ? '1px 0 0 rgba(30,48,72,0.9), 4px 0 16px rgba(0,0,0,0.4)'
      : '1px 0 0 rgba(15,23,42,0.08), 4px 0 16px rgba(15,23,42,0.04)',
  } as const;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const getCompanyInitials = (name: string) => {
  const skip = ["and", "&", "of", "the"];
  return name
    .split(/\s+/)
    .filter((w) => w && !skip.includes(w.toLowerCase()))
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
};

// ── Types ────────────────────────────────────────────────────────────────────
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
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  badge?: string;
}

// ── Component ────────────────────────────────────────────────────────────────
export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenShortcuts,
  collapsed,
  setCollapsed,
}) => {
  const { t } = useAppTranslation("navbar");
  const companySettings = useSettingsStore((s) => s.settings.company);
  const coName    = companySettings?.name    || 'ASZ Nexus ERP';
  const coTagline = companySettings?.tagline || 'Smart Billing & Trading Management System';
  const logoUrl   = companySettings?.logo    || '';
  const initials  = getCompanyInitials(coName);
  const logout    = useAuthStore((s) => s.logout);
  const resolvedTheme = useAppearanceStore((s) => s.resolvedTheme);
  const S = useMemo(() => buildSidebarTokens(resolvedTheme === 'dark'), [resolvedTheme]);

  const [mobileOpen, setMobileOpen] = useState(false);

  const navGroups: { title: string; items: NavItem[] }[] = [
    {
      title: t("groups.overview"),
      items: [
        { id: "dashboard", label: t("items.dashboard"), icon: BarChart3 },
      ],
    },
    {
      title: t("groups.transactions"),
      items: [
        { id: "purchase", label: t("items.purchase"), icon: ShoppingBag },
        { id: "sales",    label: t("items.sales"),    icon: ShoppingCart },
        { id: "carets",    label: "Caret Tracking",    icon: Box },
        { id: "payments", label: t("items.payments"), icon: Wallet },
      ],
    },
    {
      title: t("groups.data"),
      items: [
        { id: "parties",   label: t("items.parties"),   icon: Contact },
        { id: "inventory", label: t("items.inventory"), icon: Package },
        { id: "reports",   label: t("items.reports"),   icon: FileBarChart2 },
      ],
    },
    {
      title: t("groups.system"),
      items: [
        { id: "settings", label: t("items.settings"), icon: Settings },
      ],
    },
  ];

  const handleNav = (id: string) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  // ── Sidebar inner content ─────────────────────────────────────────────────
  const SidebarContent: React.FC = () => (
    <div className="flex flex-col h-full">

      {/* ── Nav groups ── */}
      <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-4 scrollbar-thin">
        {/* Mobile close button */}
        <div className="lg:hidden flex justify-end mb-1">
          <button
            onClick={() => setMobileOpen(false)}
            style={{ color: S.toggleText }}
            className="p-1.5 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {navGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <div
                style={{ color: S.groupLabel }}
                className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] select-none"
              >
                {group.title}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon    = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <NavButton
                    key={item.id}
                    item={item}
                    isActive={isActive}
                    collapsed={collapsed}
                    Icon={Icon}
                    onNav={handleNav}
                    S={S}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <div
        style={{ borderTop: `1px solid ${S.footerBorder}` }}
        className={`p-2.5 space-y-0.5 ${collapsed ? "px-2" : ""}`}
      >
        {/* Collapse toggle — desktop */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{ color: S.toggleText }}
          className={`hidden lg:flex w-full items-center rounded-xl transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
            collapsed ? "justify-center p-2.5" : "px-3 py-2.5 space-x-3"
          }`}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = S.toggleHoverBg;
            (e.currentTarget as HTMLButtonElement).style.color = S.toggleHoverText;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = S.toggleText;
          }}
          title={collapsed ? t("tooltips.expandSidebar") : t("tooltips.collapseSidebar")}
        >
          {collapsed ? <PanelLeft className="w-[18px] h-[18px] shrink-0" /> : <PanelLeftClose className="w-[18px] h-[18px] shrink-0" />}
          {!collapsed && <span className="text-[13px] font-semibold flex-1 text-left">{t("tooltips.collapseSidebar")}</span>}
        </button>
        {/* Logout */}
        <button
          onClick={() => logout()}
          style={{ color: S.logoutText }}
          className={`w-full flex items-center rounded-xl transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 ${
            collapsed ? "justify-center p-2.5" : "px-3 py-2.5 space-x-3"
          }`}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = S.logoutHoverBg;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
          }}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && (
            <span className="text-[13px] font-semibold flex-1 text-left">
              {t("actions.logout")}
            </span>
          )}
        </button>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        style={{ background: S.sidebarBg, borderRight: `1px solid ${S.headerBorder}` }}
        className={`hidden lg:flex flex-col fixed left-0 top-12 bottom-0 z-40 transition-all duration-300 no-print ${
          collapsed ? "w-[68px]" : "w-[240px]"
        }`}
        // inline shadow so it also responds to theme
        ref={el => { if (el) el.style.boxShadow = S.sidebarShadow; }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <header
        style={{
          background: S.mobileHeaderBg,
          borderBottom: `1px solid ${S.headerBorder}`,
        }}
        className="lg:hidden fixed top-12 left-0 right-0 z-40 backdrop-blur-xl shadow-sm no-print"
      >
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileOpen(true)}
              style={{ color: S.inactiveText }}
              className="p-2 rounded-lg cursor-pointer transition-colors"
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = S.hoverBg;
                (e.currentTarget as HTMLButtonElement).style.color = S.hoverText;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = S.inactiveText;
              }}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <div
                style={{ background: S.logoBg }}
                className="p-1.5 rounded-lg shadow-md"
              >
                <ErpLogoIcon className="w-4 h-4" />
              </div>
              <span style={{ color: S.companyName }} className="font-semibold text-sm">
                {initials}
              </span>
            </div>
          </div>
          <button
            onClick={onOpenShortcuts}
            style={{ color: S.inactiveText }}
            className="p-2 rounded-lg cursor-pointer transition-colors"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            style={{ background: S.mobileOverlay }}
            className="lg:hidden fixed inset-0 z-50 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            style={{ background: S.mobileBg }}
            className="lg:hidden fixed left-0 top-12 bottom-0 z-50 w-[260px] shadow-2xl animate-slide-right"
          >
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
};

// ── NavButton ─────────────────────────────────────────────────────────────────
interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  Icon: NavItem["icon"];
  onNav: (id: string) => void;
  S: ReturnType<typeof buildSidebarTokens>;
}

const NavButton: React.FC<NavButtonProps> = ({ item, isActive, collapsed, Icon, onNav, S }) => {
  const [hovered, setHovered] = useState(false);

  const bg = isActive
    ? S.activeBg
    : hovered
    ? S.hoverBg
    : "transparent";

  const textColor = isActive
    ? S.activeText
    : hovered
    ? S.hoverText
    : S.inactiveText;

  const iconColor = isActive
    ? S.activeIcon
    : hovered
    ? S.hoverIcon
    : S.inactiveIcon;

  return (
    <button
      onClick={() => onNav(item.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={collapsed ? item.label : undefined}
      style={{
        background: bg,
        color: textColor,
        borderLeft: isActive && !collapsed
          ? `2px solid ${S.activeBorder}`
          : "2px solid transparent",
        outline: "none",
      }}
      className={`w-full flex items-center rounded-xl transition-all duration-150 cursor-pointer relative focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 focus-visible:ring-offset-white ${
        collapsed ? "justify-center p-2.5" : "px-3 py-2.5 space-x-3"
      }`}
    >
      {/* Icon */}
      <Icon
        className="w-[18px] h-[18px] shrink-0 transition-colors"
        style={{ color: iconColor }}
      />

      {/* Label + badge + chevron */}
      {!collapsed && (
        <>
          <span className="text-[13px] font-semibold truncate flex-1 text-left">
            {item.label}
          </span>

          {item.badge && (
            <span
              style={
                isActive
                  ? {
                      background: S.activeBadgeBg,
                      color: S.activeText,
                      border: `1px solid ${S.activeBadgeBorder}`,
                    }
                  : {
                      background: S.inactiveBadgeBg,
                      color: S.inactiveBadgeText,
                      border: `1px solid ${S.inactiveBadgeBorder}`,
                    }
              }
              className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider font-mono shrink-0"
            >
              {item.badge}
            </span>
          )}

          {isActive && (
            <ChevronRight
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: S.activeText, opacity: 0.7 }}
            />
          )}
        </>
      )}

      {/* Collapsed tooltip */}
      {collapsed && (
        <div
          style={{
            background: S.tooltipBg,
            color: S.tooltipText,
            border: `1px solid ${S.headerBorder}`,
          }}
          className={`absolute left-full ml-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap pointer-events-none transition-all duration-150 z-50 shadow-xl ${
            hovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-1"
          }`}
        >
          {item.label}
          {/* Arrow */}
          <span
            style={{
              borderRight: `5px solid ${S.tooltipBg}`,
              borderTop: "5px solid transparent",
              borderBottom: "5px solid transparent",
            }}
            className="absolute right-full top-1/2 -translate-y-1/2"
          />
        </div>
      )}
    </button>
  );
};

