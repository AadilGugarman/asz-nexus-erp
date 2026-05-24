import React, { Suspense, lazy, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCompanyStore, useSettingsStore, useAuthStore } from "@/store";
import { ROUTES } from "@/config";
import { STORAGE_KEYS } from "@/config";
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

      // 2. FAILSAFE: Update local stores and storage BEFORE reloading.
      // Use the actual company name from the settings store if available,
      // otherwise fall back to a generic name — never hardcode "ASZ Nexus ERP".
      const existingSettings = useSettingsStore.getState().settings;
      const existingCompanies = useSettingsStore.getState().companies;
      const companyName = existingSettings.company?.name?.trim() || "Demo Company";
      const companyId = useSettingsStore.getState().activeCompanyId || "co-demo-main";

      localStorage.setItem(STORAGE_KEYS.setupDone, "true");
      localStorage.setItem(STORAGE_KEYS.activeCompany, companyId);
      localStorage.setItem(STORAGE_KEYS.activeFY, "2026-27");

      const settings = {
        ...existingSettings,
        setupCompleted: true,
        company: { ...existingSettings.company, name: companyName },
      };
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));

      // Preserve existing companies list — don't overwrite with a fake one
      if (existingCompanies.length > 0) {
        localStorage.setItem(STORAGE_KEYS.companies, JSON.stringify(existingCompanies));
      } else {
        localStorage.setItem(
          STORAGE_KEYS.companies,
          JSON.stringify([{ id: companyId, company: { name: companyName } }]),
        );
      }

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
