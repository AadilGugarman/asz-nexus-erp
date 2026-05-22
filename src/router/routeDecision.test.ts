import { describe, expect, it } from "vitest";
import { ROUTES } from "@/config";
import {
  decidePostStartupRoute,
  type RouteDecisionInput,
} from "./routeDecision";

const routeByPriority = (input: RouteDecisionInput): string | null => {
  if (!input.startupReady) return null;
  if (!input.isSetupDone) return ROUTES.setup;
  if (!input.isSetupComplete) return ROUTES.setup;
  if (!input.isAuthenticated) return ROUTES.login;
  if (!input.hasCompany) return ROUTES.setup;
  if (input.isLocked) return ROUTES.lock;
  return ROUTES.dashboard;
};

describe("routeDecision matrix", () => {
  it("covers key guard precedence cases", () => {
    const cases: Array<{
      name: string;
      input: RouteDecisionInput;
      expected: string | null;
    }> = [
      {
        name: "startup pending blocks routing",
        input: {
          startupReady: false,
          isSetupDone: true,
          isSetupComplete: true,
          isAuthenticated: true,
          hasCompany: true,
          isLocked: true,
        },
        expected: null,
      },
      {
        name: "setup takes precedence over auth/company/lock",
        input: {
          startupReady: true,
          isSetupDone: false,
          isSetupComplete: false,
          isAuthenticated: true,
          hasCompany: true,
          isLocked: true,
        },
        expected: ROUTES.setup,
      },
      {
        name: "unauthenticated goes to login before company/lock checks",
        input: {
          startupReady: true,
          isSetupDone: true,
          isSetupComplete: true,
          isAuthenticated: false,
          hasCompany: true,
          isLocked: true,
        },
        expected: ROUTES.login,
      },
      {
        name: "missing company goes to setup until onboarding is complete",
        input: {
          startupReady: true,
          isSetupDone: true,
          isSetupComplete: false,
          isAuthenticated: true,
          hasCompany: false,
          isLocked: true,
        },
        expected: ROUTES.setup,
      },
      {
        name: "locked authenticated company goes to lock screen",
        input: {
          startupReady: true,
          isSetupDone: true,
          isSetupComplete: true,
          isAuthenticated: true,
          hasCompany: true,
          isLocked: true,
        },
        expected: ROUTES.lock,
      },
      {
        name: "happy path reaches dashboard",
        input: {
          startupReady: true,
          isSetupDone: true,
          isSetupComplete: true,
          isAuthenticated: true,
          hasCompany: true,
          isLocked: false,
        },
        expected: ROUTES.dashboard,
      },
    ];

    for (const tc of cases) {
      expect(decidePostStartupRoute(tc.input), tc.name).toBe(tc.expected);
    }
  });

  it("validates all 32 setup/auth/company/lock combinations", () => {
    const bools = [false, true] as const;

    for (const startupReady of bools) {
      for (const isSetupDone of bools) {
        for (const isAuthenticated of bools) {
          for (const hasCompany of bools) {
            for (const isLocked of bools) {
              const input: RouteDecisionInput = {
                startupReady,
                isSetupDone,
                isSetupComplete: isSetupDone,
                isAuthenticated,
                hasCompany,
                isLocked,
              };

              const expected = routeByPriority(input);
              expect(decidePostStartupRoute(input)).toBe(expected);
            }
          }
        }
      }
    }
  });
});
