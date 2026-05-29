import { describe, expect, it } from "vitest";
import { ROUTES } from "@/config";
import {
  decidePostStartupRoute,
  type RouteDecisionInput,
} from "./routeDecision";

const routeByPriority = (input: RouteDecisionInput): string | null => {
  if (!input.startupReady) return null;
  if (!input.isSetupDone) return ROUTES.setup;
  if (!input.isAuthenticated) return ROUTES.login;
  if (!input.hasCompany) return ROUTES.companySetup;
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
        },
        expected: null,
      },
      {
        name: "setup takes precedence over auth/company when no password yet",
        input: {
          startupReady: true,
          isSetupDone: false,
          isSetupComplete: false,
          isAuthenticated: true,
          hasCompany: true,
        },
        expected: ROUTES.setup,
      },
      {
        name: "unauthenticated goes to login before company checks",
        input: {
          startupReady: true,
          isSetupDone: true,
          isSetupComplete: true,
          isAuthenticated: false,
          hasCompany: true,
        },
        expected: ROUTES.login,
      },
      {
        name: "authenticated with company goes to dashboard even if setupCompleted is false",
        input: {
          startupReady: true,
          isSetupDone: true,
          isSetupComplete: false,
          isAuthenticated: true,
          hasCompany: true,
        },
        expected: ROUTES.dashboard,
      },
      {
        name: "authenticated, no company (just created password) goes to company setup",
        input: {
          startupReady: true,
          isSetupDone: true,
          isSetupComplete: false,
          isAuthenticated: true,
          hasCompany: false,
        },
        expected: ROUTES.companySetup,
      },
      {
        name: "authenticated, no company (setup complete) goes to company setup",
        input: {
          startupReady: true,
          isSetupDone: true,
          isSetupComplete: true,
          isAuthenticated: true,
          hasCompany: false,
        },
        expected: ROUTES.companySetup,
      },
      {
        name: "happy path reaches dashboard",
        input: {
          startupReady: true,
          isSetupDone: true,
          isSetupComplete: true,
          isAuthenticated: true,
          hasCompany: true,
        },
        expected: ROUTES.dashboard,
      },
    ];

    for (const tc of cases) {
      expect(decidePostStartupRoute(tc.input), tc.name).toBe(tc.expected);
    }
  });

  it("validates all 16 setup/auth/company combinations", () => {
    const bools = [false, true] as const;

    for (const startupReady of bools) {
      for (const isSetupDone of bools) {
        for (const isAuthenticated of bools) {
          for (const hasCompany of bools) {
            const input: RouteDecisionInput = {
              startupReady,
              isSetupDone,
              isSetupComplete: isSetupDone,
              isAuthenticated,
              hasCompany,
            };

            const expected = routeByPriority(input);
            expect(decidePostStartupRoute(input)).toBe(expected);
          }
        }
      }
    }
  });
});
