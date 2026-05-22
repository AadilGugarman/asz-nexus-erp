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
  if (!input.isSetupDone) return ROUTES.setup;
  if (!input.isSetupComplete) return ROUTES.setup;
  if (!input.isAuthenticated) return ROUTES.login;
  if (!input.hasCompany) return ROUTES.setup;
  if (input.isLocked) return ROUTES.lock;
  return ROUTES.dashboard;
}
