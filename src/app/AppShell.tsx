/**
 * app/AppShell.tsx
 * The main application shell "  layout, keyboard shortcuts, module routing.
 *
 * Performance optimisations applied here:
 *  1. Every ERP module tab is lazy-loaded with React.lazy "  each becomes its
 *     own Rollup chunk and is only downloaded when first visited.
 *  2. A per-tab <Suspense> shows a lightweight skeleton while the chunk loads,
 *     so the shell chrome (navbar, titlebar) stays visible during navigation.
 *  3. usePreload() schedules adjacent-tab chunks during browser idle time so
 *     subsequent tab switches feel instant.
 *  4. Module components are wrapped in React.memo to prevent re-renders when
 *     the active tab changes to a different tab.
 */

import React, { lazy, Suspense, useEffect, memo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useUIStore, useCompanyStore, useSettingsStore, useStartupStore } from "@/store";
import { ROUTES } from "@/config";
import { usePreload } from "@/hooks/usePreload";

import { TitleBar } from "@/components/window/TitleBar";
import { Navbar } from "@/components/Navbar";
import { TopFilterBar } from "@/components/TopFilterBar";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
//        Lazy module imports
// Each import() call becomes a separate Rollup chunk.
// The chunk is only fetched when the user first visits that tab.

const ExecutiveDashboard = lazy(() =>
  import("@/components/ExecutiveDashboard").then((m) => ({
    default: m.ExecutiveDashboard,
  })),
);
const VehicleArrivalModule = lazy(() =>
  import("@/components/VehicleArrivalModule").then((m) => ({
    default: m.VehicleArrivalModule,
  })),
);
const PurchaseBillingModule = lazy(() =>
  import("@/components/PurchaseBillingModule").then((m) => ({
    default: m.PurchaseBillingModule,
  })),
);
const SalesBillingModule = lazy(() =>
  import("@/components/SalesBillingModule").then((m) => ({
    default: m.SalesBillingModule,
  })),
);
const InventoryModule = lazy(() =>
  import("@/components/InventoryModule").then((m) => ({
    default: m.InventoryModule,
  })),
);
const PartiesModule = lazy(() =>
  import("@/components/PartiesModule").then((m) => ({
    default: m.PartiesModule,
  })),
);
const PaymentsModule = lazy(() =>
  import("@/components/PaymentsModule").then((m) => ({
    default: m.PaymentsModule,
  })),
);
const ReportsModule = lazy(() =>
  import("@/components/ReportsModule").then((m) => ({
    default: m.ReportsModule,
  })),
);
const SupplierModule = lazy(() =>
  import("@/components/SupplierModule").then((m) => ({
    default: m.SupplierModule,
  })),
);
const CustomerModule = lazy(() =>
  import("@/components/CustomerModule").then((m) => ({
    default: m.CustomerModule,
  })),
);
const SettingsModule = lazy(() =>
  import("@/components/SettingsModule").then((m) => ({
    default: m.SettingsModule,
  })),
);
const CaretModule = lazy(() =>
  import("@/components/CaretModule").then((m) => ({
    default: m.CaretModule,
  })),
);
const ShortcutsModal = lazy(() =>
  import("@/components/ShortcutsModal").then((m) => ({
    default: m.ShortcutsModal,
  })),
);

//        Tab skeleton (shown while a module chunk is loading)

const TabSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4 pt-2" aria-hidden="true">
    <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/3" />
    <div className="grid grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl"
        />
      ))}
    </div>
    <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl" />
  </div>
);

//        Path     tab maps

const PATH_TO_TAB: Record<string, string> = {
  [ROUTES.dashboard]: "dashboard",
  [ROUTES.arrival]: "arrival",
  [ROUTES.purchase]: "purchase",
  [ROUTES.sales]: "sales",
  [ROUTES.inventory]: "inventory",
  [ROUTES.parties]: "parties",
  [ROUTES.payments]: "payments",
  [ROUTES.reports]: "reports",
  [ROUTES.suppliers]: "suppliers",
  [ROUTES.customers]: "customers",
  [ROUTES.carets]: "carets",
  [ROUTES.settings]: "settings",
};

const TAB_TO_PATH: Record<string, string> = Object.fromEntries(
  Object.entries(PATH_TO_TAB).map(([k, v]) => [v, k]),
);

//        Memoised tab content
// Wrapping in memo means the component only re-renders when its own props
// change, not when a sibling tab's state changes.

interface TabContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabContent = memo<TabContentProps>(({ activeTab, setActiveTab }) => (
  <Suspense fallback={<TabSkeleton />}>
    {activeTab === "dashboard" && (
      <>
        <TopFilterBar />
        <ExecutiveDashboard setActiveTab={setActiveTab} />
      </>
    )}
    {activeTab === "arrival" && <VehicleArrivalModule />}
    {activeTab === "purchase" && <PurchaseBillingModule />}
    {activeTab === "sales" && <SalesBillingModule />}
    {activeTab === "inventory" && <InventoryModule />}
    {activeTab === "parties" && <PartiesModule />}
    {activeTab === "payments" && <PaymentsModule />}
    {activeTab === "reports" && <ReportsModule />}
    {activeTab === "suppliers" && <SupplierModule />}
    {activeTab === "customers" && <CustomerModule />}
    {activeTab === "carets" && <CaretModule />}
    {activeTab === "settings" && <SettingsModule />}
  </Suspense>
));
TabContent.displayName = "TabContent";

//        Shell

export const AppShell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasCompany = useCompanyStore((s) => s.hasCompany);
  const setupCompleted = useSettingsStore((s) => s.settings.setupCompleted);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const { isAppReady } = useStartupStore();
  const { initialized } = useCompanyStore();
  const { isLoaded } = useSettingsStore();

  const {
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    setSidebarCollapsed,
    isShortcutsOpen,
    openShortcuts,
    closeShortcuts,
  } = useUIStore();

  // Failsafe: Ensure setupCompleted is true if we are in the shell and have a company
  useEffect(() => {
    if (hasCompany && !setupCompleted) {
      if (import.meta.env.DEV)
        console.info("[AppShell] Repairing setupCompleted flag...");
      updateSettings({ setupCompleted: true });
    }
  }, [hasCompany, setupCompleted, updateSettings]);

  // Preload adjacent tabs during idle time
  usePreload(activeTab);

  //        Sync URL     store
  useEffect(() => {
    const tab = PATH_TO_TAB[location.pathname];
    if (tab && tab !== activeTab) {
      setActiveTab(tab as Parameters<typeof setActiveTab>[0]);
    }
  }, [location.pathname, activeTab, setActiveTab]);

  if (!isAppReady || !hasCompany || !isLoaded || !initialized) {
    return <TabSkeleton />;
  }

  //        Sync store     URL
  const handleSetActiveTab = (tab: string) => {
    setActiveTab(tab as Parameters<typeof setActiveTab>[0]);
    const path = TAB_TO_PATH[tab];
    if (path && location.pathname !== path) navigate(path);
  };

  //    Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        isShortcutsOpen ? closeShortcuts() : openShortcuts();
      } else if (e.key === "F1") {
        e.preventDefault();
        handleSetActiveTab("arrival");
      } else if (e.key === "F2") {
        e.preventDefault();
        handleSetActiveTab("sales");
      } else if (e.altKey && e.key === "0") {
        e.preventDefault();
        handleSetActiveTab("dashboard");
      } else if (e.altKey && e.key === "1") {
        e.preventDefault();
        handleSetActiveTab("arrival");
      } else if (e.altKey && e.key === "2") {
        e.preventDefault();
        handleSetActiveTab("purchase");
      } else if (e.altKey && e.key === "3") {
        e.preventDefault();
        handleSetActiveTab("sales");
      } else if (e.altKey && e.key === "4") {
        e.preventDefault();
        handleSetActiveTab("inventory");
      } else if (e.altKey && e.key === "5") {
        e.preventDefault();
        handleSetActiveTab("payments");
      } else if (e.altKey && e.key === "6") {
        e.preventDefault();
        handleSetActiveTab("reports");
      } else if (e.altKey && e.key === "7") {
        e.preventDefault();
        handleSetActiveTab("suppliers");
      } else if (e.altKey && e.key === "8") {
        e.preventDefault();
        handleSetActiveTab("customers");
      } else if (e.altKey && e.key === "9") {
        e.preventDefault();
        handleSetActiveTab("settings");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShortcutsOpen]);

  return (
    <div
      className="flex flex-col min-h-screen font-sans transition-colors duration-200 pt-12"
      style={{
        backgroundColor: "var(--page-bg)",
        color: "var(--text-primary)",
      }}
    >
      {/* Custom titlebar   32 px, always visible */}
      <TitleBar pageTitle={activeTab} onOpenShortcuts={openShortcuts} />

      <Navbar
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        onOpenShortcuts={openShortcuts}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "lg:pl-[68px]" : "lg:pl-[240px]"
        }`}
      >
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <ErrorBoundary>
            <TabContent
              activeTab={activeTab}
              setActiveTab={handleSetActiveTab}
            />
          </ErrorBoundary>
        </main>
      </div>

      {isShortcutsOpen && (
        <Suspense fallback={null}>
          <ShortcutsModal isOpen={isShortcutsOpen} onClose={closeShortcuts} />
        </Suspense>
      )}
    </div>
  );
};
