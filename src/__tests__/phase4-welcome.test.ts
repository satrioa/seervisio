import { describe, it, expect } from "vitest";
import {
  transition,
  canTransition,
  canAccessArea,
  resolveAreaRoute,
  resolveJourneyRoute,
  type JourneyState,
  type JourneyContext,
} from "@/lib/customer-journey/state-machine";
import {
  getLicenseState,
  isDashboardAllowed,
  canEnterOperational,
  type LicenseRow,
} from "@/lib/customer-journey/license-status";

// Phase 4 focus: once the license is ACTIVE the customer runs the Welcome
// Wizard (LICENSE_ACTIVE -> ONBOARDING) which creates the brand, then
// completes onboarding to reach OPERATIONAL (full dashboard access).

function ctx(overrides: Partial<JourneyContext> = {}): JourneyContext {
  return {
    hasCheckoutSession: false,
    hasActiveLicense: true,
    onboardingComplete: false,
    ...overrides,
  };
}

function future(days: number): string {
  return new Date(Date.now() + days * 86400_000).toISOString();
}

function makeLicense(overrides: Partial<LicenseRow> = {}): LicenseRow {
  return {
    id: "lic-1",
    brand_id: null,
    profile_id: "profile-1",
    package_id: "pkg-pro",
    status: "active",
    started_at: "2026-01-01T00:00:00.000Z",
    expires_at: future(10),
    is_trial: false,
    ...overrides,
  };
}

describe("Phase 4: LICENSE_ACTIVE -> ONBOARDING -> OPERATIONAL", () => {
  it("START_ONBOARDING moves LICENSE_ACTIVE -> ONBOARDING (license guard)", () => {
    expect(
      canTransition("LICENSE_ACTIVE", "START_ONBOARDING", ctx({ hasActiveLicense: false })),
    ).toBe(false);
    const s = transition("LICENSE_ACTIVE", "START_ONBOARDING", ctx());
    expect(s).toBe("ONBOARDING");
  });

  it("COMPLETE_ONBOARDING moves ONBOARDING -> OPERATIONAL", () => {
    const s = transition("ONBOARDING", "COMPLETE_ONBOARDING", ctx({ onboardingComplete: true }));
    expect(s).toBe("OPERATIONAL");
  });

  it("COMPLETE_ONBOARDING is illegal before onboarding flagged complete", () => {
    expect(
      canTransition("ONBOARDING", "COMPLETE_ONBOARDING", ctx({ onboardingComplete: false })),
    ).toBe(false);
  });

  it("welcome area is reachable only from LICENSE_ACTIVE / ONBOARDING", () => {
    expect(canAccessArea("LICENSE_ACTIVE", "welcome")).toBe(true);
    expect(canAccessArea("ONBOARDING", "welcome")).toBe(true);
    expect(canAccessArea("WAITING_VERIFICATION", "welcome")).toBe(false);
    expect(canAccessArea("OPERATIONAL", "welcome")).toBe(false);
    expect(resolveAreaRoute("LICENSE_ACTIVE", "welcome")).toBe("/welcome");
    expect(resolveAreaRoute("ONBOARDING", "welcome")).toBe("/welcome");
  });

  it("operational route resolves to dashboard root", () => {
    expect(resolveJourneyRoute("OPERATIONAL")).toBe("/");
    expect(resolveJourneyRoute("LICENSE_ACTIVE")).toBe("/welcome");
    expect(resolveJourneyRoute("ONBOARDING")).toBe("/welcome");
  });
});

describe("Phase 4: dashboard gated until onboarding complete", () => {
  it("canEnterOperational requires BOTH active license and onboarding complete", () => {
    expect(canEnterOperational(makeLicense(), false)).toBe(false);
    expect(canEnterOperational(makeLicense(), true)).toBe(true);
    expect(canEnterOperational(null, true)).toBe(false);
  });

  it("isDashboardAllowed is true on active license but canEnterOperational stays false until onboarded", () => {
    const lic = makeLicense();
    expect(isDashboardAllowed(lic)).toBe(true);
    // License alone does NOT unlock the operational dashboard.
    expect(canEnterOperational(lic, false)).toBe(false);
    expect(canEnterOperational(lic, true)).toBe(true);
  });

  it("an expired license blocks both dashboard and onboarding completion", () => {
    const expired = makeLicense({ expires_at: new Date(Date.now() - 1000).toISOString() });
    expect(getLicenseState(expired).isActive).toBe(false);
    expect(canEnterOperational(expired, true)).toBe(false);
    expect(
      canTransition("LICENSE_ACTIVE", "START_ONBOARDING", ctx({ hasActiveLicense: false })),
    ).toBe(false);
  });
});
