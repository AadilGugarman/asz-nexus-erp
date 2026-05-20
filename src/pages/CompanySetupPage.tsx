/**
 * pages/CompanySetupPage.tsx
 * Authenticated onboarding page — shown after first login when no company
 * has been configured yet.
 *
 * Wraps the existing SetupWizard component and writes 'apex_setup_done' to
 * localStorage on completion, then redirects to the dashboard.
 */

import React, { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config';
import { useCompanyStore } from '@/store';

const SetupWizard = lazy(() =>
  import('@/components/SetupWizard').then((m) => ({ default: m.SetupWizard })),
);

export const CompanySetupPage: React.FC = () => {
  const navigate = useNavigate();
  const markCompanyCreated = useCompanyStore((s) => s.markCompanyCreated);

  const handleComplete = () => {
    // markCompanyCreated already writes apex_setup_done = '1' to localStorage
    markCompanyCreated(localStorage.getItem('apex_active_company') ?? undefined);
    navigate(ROUTES.dashboard, { replace: true });
  };

  return (
    <Suspense fallback={null}>
      <SetupWizard onComplete={handleComplete} />
    </Suspense>
  );
};
