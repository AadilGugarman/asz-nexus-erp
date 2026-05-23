import React, { Suspense, lazy, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanyStore, useSettingsStore, useAuthStore } from "@/store";
import { ROUTES } from "@/config";
import { ipc } from "@/ipc";
import { useToast } from "@/hooks/useToast";

const SetupWizard = lazy(() =>
  import("@/components/SetupWizard").then((m) => ({ default: m.SetupWizard })),
);

export const CompanySetupPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const hasCompany = useCompanyStore((s) => s.hasCompany);
  const setupCompleted = useSettingsStore((s) => s.settings.setupCompleted);
  const markCompanyCreated = useCompanyStore((s) => s.markCompanyCreated);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const initializeAuth = useAuthStore((s) => s.initialize);

  // Failsafe: If we land here but a company already exists,
  // try to repair the setupCompleted flag and redirect to dashboard.
  useEffect(() => {
    if (hasCompany) {
      if (!setupCompleted) {
        if (import.meta.env.DEV)
          console.info(
            "[CompanySetupPage] Failsafe: Company exists but setup incomplete. Repairing...",
          );
        updateSettings({ setupCompleted: true });
      }
      navigate(ROUTES.dashboard, { replace: true });
    }
  }, [hasCompany, setupCompleted, navigate, updateSettings]);

  const handleComplete = async () => {
    markCompanyCreated();
    await updateSettings({ setupCompleted: true });
    navigate(ROUTES.dashboard, { replace: true });
  };

  const handleSeedDemo = async () => {
    const confirmed = window.confirm(
      "This will clear all current progress and seed the database with professional demo data (Medium profile: 6 months of history). Continue?",
    );

    if (!confirmed) return;

    try {
      toast.info("Seeding demo data... this may take a few seconds.");

      // 1. Call the backend seeding engine
      await ipc.db.reseedDemoData("medium");

      // 2. FAILSAFE: Update local stores and storage BEFORE reloading
      // This ensures that even if DB read is slow, the app knows setup is done.
      localStorage.setItem("tfc_erp_setup_done", "true");
      localStorage.setItem("tfc_erp_active_company", "co-demo-main");
      localStorage.setItem("tfc_erp_active_fy", "2026-27");

      // Update Settings Store
      const settings = {
        setupCompleted: true,
        company: { name: "Talha Fruit Co." },
      };
      localStorage.setItem("tfc_erp_settings", JSON.stringify(settings));

      // Update Company Store
      localStorage.setItem(
        "tfc_erp_companies",
        JSON.stringify([{ id: "co-demo-main", company: settings.company }]),
      );

      toast.success("Demo data seeded successfully!");

      // 3. Give SQLite a moment to finish its commit before reloading
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error) {
      console.error("[CompanySetupPage] Seeding failed:", error);
      toast.error("Failed to seed demo data. See console for details.");
    }
  };

  return (
    <Suspense fallback={null}>
      <SetupWizard onComplete={handleComplete} onSeedDemo={handleSeedDemo} />
    </Suspense>
  );
};
