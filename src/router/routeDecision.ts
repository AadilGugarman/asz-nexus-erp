import { ROUTES } from "@/config";

export interface RouteDecisionInput {
  startupReady: boolean;
  isSetupDone: boolean;
  isSetupComplete: boolean;
  isAuthenticated: boolean;
  hasCompany: boolean;
  isLocked?: boolean;
}

export function decidePostStartupRoute(
  input: RouteDecisionInput,
): string | null {
  if (!input.startupReady) return null;

  // 1. Password setup (first run — no password created yet)
  if (!input.isSetupDone) return ROUTES.setup;

  // 2. Login if not authenticated
  if (!input.isAuthenticated) return ROUTES.login;

  // 3. Company Onboarding: authenticated but no company yet
  //    Both "just created password" (isSetupComplete=false) and
  //    "setup complete but company missing" go to the company wizard.
  //    We never send an authenticated user back to /setup from here.
  if (!input.hasCompany) return ROUTES.companySetup;

  // 4. Dashboard — authenticated, has company, not locked
  return ROUTES.dashboard;
}
