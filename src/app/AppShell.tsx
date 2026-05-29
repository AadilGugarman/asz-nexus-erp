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

import React, { lazy, Suspense, useEffect, useRef, memo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useUIStore, useCompanyStore, useSettingsStore, useStartupStore } from "@/store";
import { ROUTES } from "@/config";
import { usePreload } from "@/hooks/usePreload";

import { TitleBar } from "@/components/window/TitleBar";
import { Navbar } from "@/components/Navbar";
import { TopFilterBar } from "@/components/TopFilterBar";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { AlertTriangle, RefreshCcw } from "lucide-react";

//        Per-module error fallback — less disruptive than full-screen crash
const ModuleErrorFallback: React.FC<{ moduleName?: string }> = ({ moduleName }) => (
  <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
    <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center">
      <AlertTriangle className="w-7 h-7 text-rose-500" />
    </div>
    <div>
      <p className="text-base font-bold dark:text-white text-slate-900">
        {moduleName ? `${moduleName} failed to load` : "Module error"}
      </p>
      <p className="text-sm dark:text-slate-400 text-slate-500 mt-1">
        An unexpected error occurred. Your data is safe.
      </p>
    </div>
    <button
      onClick={() => window.location.reload()}
      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all"
    >
      <RefreshCcw className="w-4 h-4" />
      Reload App
    </button>
  </div>
);

// Each import() call becomes a separate Rollup chunk.
// The chunk is only fetched when the user first visits that tab.

const ExecutiveDashboard = lazy(() =>
  import("@/components/ExecutiveDashboard").then((m) => ({
    default: m.ExecutiveDashboard,
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
const PartiesModule = lazy(() =>
  import("@/components/PartiesModule").then((m) => ({
    default: m.PartiesModule,
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
  [ROUTES.purchase]: "purchase",
  [ROUTES.sales]: "sales",
  [ROUTES.inventory]: "inventory",
  [ROUTES.parties]: "parties",
  [ROUTES.payments]: "payments",
  [ROUTES.reports]: "reports",
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
    <div className="flex-1 flex flex-col min-h-0">
      {activeTab === "dashboard" && (
        <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Dashboard" />}>
          <TopFilterBar />
          <ExecutiveDashboard setActiveTab={setActiveTab} />
        </ErrorBoundary>
      )}
      {activeTab === "purchase" && (
        <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Purchase Billing" />}>
          <PurchaseBillingModule />
        </ErrorBoundary>
      )}
      {activeTab === "sales" && (
        <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Sales Billing" />}>
          <SalesBillingModule />
        </ErrorBoundary>
      )}
      {activeTab === "inventory" && (
        <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Inventory" />}>
          <InventoryModule />
        </ErrorBoundary>
      )}
      {activeTab === "parties" && (
        <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Parties" />}>
          <PartiesModule />
        </ErrorBoundary>
      )}
      {activeTab === "payments" && (
        <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Payments" />}>
          <PaymentsModule />
        </ErrorBoundary>
      )}
      {activeTab === "reports" && (
        <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Reports" />}>
          <ReportsModule />
        </ErrorBoundary>
      )}
      {activeTab === "carets" && (
        <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Caret Management" />}>
          <CaretModule />
        </ErrorBoundary>
      )}
      {activeTab === "settings" && (
        <ErrorBoundary fallback={<ModuleErrorFallback moduleName="Settings" />}>
          <SettingsModule />
        </ErrorBoundary>
      )}
    </div>
  </Suspense>
));
TabContent.displayName = "TabContent";

//        Shell

export const AppShell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasCompany     = useCompanyStore((s) => s.hasCompany);
  const setupCompleted = useSettingsStore((s) => s.settings.setupCompleted);
  const isAppReady     = useStartupStore((s) => s.isAppReady);
  const initialized    = useCompanyStore((s) => s.initialized);
  const isLoaded       = useSettingsStore((s) => s.isLoaded);

  const {
    activeTab,
    setActiveTab,
    sidebarCollapsed,
    setSidebarCollapsed,
    isShortcutsOpen,
    openShortcuts,
    closeShortcuts,
    isCalculatorOpen,
    toggleCalculator,
  } = useUIStore();

  // Failsafe: Ensure setupCompleted is true if we are in the shell and have a company.
  // Use a ref so this only fires once — calling updateSettings on every render
  // causes an infinite loop because updateSettings is a new reference each render.
  const repairedRef = useRef(false);
  useEffect(() => {
    if (hasCompany && !setupCompleted && !repairedRef.current) {
      repairedRef.current = true;
      if (import.meta.env.DEV)
        console.info("[AppShell] Repairing setupCompleted flag...");
      void useSettingsStore.getState().updateSettings({ setupCompleted: true });
    }
  }, [hasCompany, setupCompleted]);

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
    // These flags should all be true before uiReady=true in normal startup.
    // After company wizard completes, they are set synchronously before
    // navigation fires. Show a minimal skeleton to avoid a blank screen
    // in any edge case where stores haven't propagated yet.
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div
          className="h-3.5 w-3.5 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "#00aeef", borderTopColor: "transparent" }}
        />
      </div>
    );
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
      } else if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        toggleCalculator();
      } else if (e.key === "F1") {
        e.preventDefault();
        handleSetActiveTab("purchase");
      } else if (e.key === "F2") {
        e.preventDefault();
        handleSetActiveTab("sales");
      } else if (e.altKey && e.key === "0") {
        e.preventDefault();
        handleSetActiveTab("dashboard");
      } else if (e.altKey && e.key === "1") {
        e.preventDefault();
        handleSetActiveTab("purchase");
      } else if (e.altKey && e.key === "2") {
        e.preventDefault();
        handleSetActiveTab("sales");
      } else if (e.altKey && e.key === "3") {
        e.preventDefault();
        handleSetActiveTab("carets");
      } else if (e.altKey && e.key === "4") {
        e.preventDefault();
        handleSetActiveTab("payments");
      } else if (e.altKey && e.key === "5") {
        e.preventDefault();
        handleSetActiveTab("parties");
      } else if (e.altKey && e.key === "6") {
        e.preventDefault();
        handleSetActiveTab("inventory");
      } else if (e.altKey && e.key === "7") {
        e.preventDefault();
        handleSetActiveTab("reports");
      } else if (e.altKey && e.key === "8") {
        e.preventDefault();
        handleSetActiveTab("settings");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShortcutsOpen, isCalculatorOpen]);

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
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? "lg:pl-[68px]" : "lg:pl-[240px]"
        }`}
      >
        <main
          className={`flex-1 flex flex-col w-full transition-all duration-300 ${
            sidebarCollapsed
              ? "px-3 sm:px-4 py-3 sm:py-4"
              : "px-4 sm:px-6 lg:px-8 py-4 lg:py-6"
          }`}
        >
          <TabContent
            activeTab={activeTab}
            setActiveTab={handleSetActiveTab}
          />
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
