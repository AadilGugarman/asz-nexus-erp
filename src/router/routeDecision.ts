import { ROUTES } from "@/config";

export interface RouteDecisionInput {
  startupReady: boolean;
  isSetupDone: boolean;
  isSetupComplete: boolean;
  isAuthenticated: boolean;
  hasCompany: boolean;
  isLocked: boolean;
}

export function decidePostStartupRoute(
  input: RouteDecisionInput,
): string | null {
  if (!input.startupReady) return null;

  // 1. Password setup (first run)
  if (!input.isSetupDone) return ROUTES.setup;

  // 2. Login if not authenticated
  if (!input.isAuthenticated) return ROUTES.login;

  // 3. Lock Screen
  if (input.isLocked) return ROUTES.lock;

  // 4. Company Onboarding
  // We prioritize actual database existence over flags.
  if (!input.hasCompany) return ROUTES.companySetup;

  // 5. Dashboard (Default)
  return ROUTES.dashboard;
}
