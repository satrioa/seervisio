import { describe, it, expect } from "vitest";
import {
  transition,
  canTransition,
  canAccessArea,
  resolveAreaRoute,
  type JourneyState,
  type JourneyContext,
} from "@/lib/customer-journey/state-machine";
import { getLicenseState, isDashboardAllowed } from "@/lib/customer-journey/license-status";
import { calculateLicenseExpiry } from "@/lib/license/license-duration";
import type { LicensePackage } from "@/types/license";

// Phase 3 focus: once a customer is at EMAIL_VERIFIED and uploads
// a transfer proof, the journey must reach LICENSE_ACTIVE ONLY after
// a platform approval — and a Dashboard must stay gated until then.

function ctx(overrides: Partial<JourneyContext> = {}): JourneyContext {
  return {
    hasCheckoutSession: true,
    hasActiveLicense: false,
    onboardingComplete: false,
    ...overrides,
  };
}

describe("Phase 3: payment -> platform approval -> license active", () => {
  it("upload proof then submit -> WAITING_VERIFICATION", () => {
    let s: JourneyState = "EMAIL_VERIFIED";
    s = transition(s, "UPLOAD_PROOF", ctx());
    expect(s).toBe("PAYMENT_UPLOADED");
    s = transition(s, "SUBMIT_PROOF", ctx());
    expect(s).toBe("WAITING_VERIFICATION");
  });

  it("approval requires an active license (guard)", () => {
    // Without the license flagged active, APPROVE is illegal.
    expect(canTransition("WAITING_VERIFICATION", "APPROVE", ctx({ hasActiveLicense: false }))).toBe(false);
  });

  it("approval flips WAITING_VERIFICATION -> LICENSE_ACTIVE", () => {
    const s = transition("WAITING_VERIFICATION", "APPROVE", ctx({ hasActiveLicense: true }));
    expect(s).toBe("LICENSE_ACTIVE");
  });

  it("rejection sends back to EMAIL_VERIFIED (re-upload)", () => {
    const s = transition("WAITING_VERIFICATION", "REJECT", ctx());
    expect(s).toBe("EMAIL_VERIFIED");
  });

  it("dashboard is NOT accessible while waiting verification", () => {
    expect(canAccessArea("WAITING_VERIFICATION", "dashboard")).toBe(false);
    expect(canAccessArea("PAYMENT_UPLOADED", "dashboard")).toBe(false);
    expect(resolveAreaRoute("WAITING_VERIFICATION", "dashboard")).toBe("/license");
  });

  it("dashboard IS accessible once licensed + onboarded", () => {
    expect(canAccessArea("OPERATIONAL", "dashboard")).toBe(true);
    expect(resolveAreaRoute("OPERATIONAL", "dashboard")).toBe("/dashboard");
  });
});

describe("Phase 3: license gating keeps dashboard locked pre-approval", () => {
  function pkg(overrides: Partial<LicensePackage> = {}): LicensePackage {
    return {
      id: "pkg-pro",
      name: "Pro",
      slug: "pro",
      description: null,
      price: 299000,
      max_branches: 1,
      max_users: 10,
      max_storage_mb: 100,
      max_transactions: 1000,
      is_active: true,
      billing_duration_enabled: true,
      billing_duration_type: "month",
      billing_duration_value: 1,
      package_type: "subscription",
      is_default_trial: false,
      ...overrides,
    };
  }

  it("a waiting-verification payment does NOT grant dashboard access", () => {
    // Simulate the license row state at the moment of approval:
    // before approval there is no active license.
    const beforeApproval = getLicenseState(null);
    expect(beforeApproval.isActive).toBe(false);
    expect(isDashboardAllowed(null)).toBe(false);
  });

  it("issuing the license (APPROVE) makes isDashboardAllowed true", () => {
    const expires = calculateLicenseExpiry(pkg(), new Date());
    const state = getLicenseState({
      id: "lic-1",
      brand_id: null,
      profile_id: "profile-1",
      package_id: "pkg-pro",
      status: "active",
      started_at: new Date().toISOString(),
      expires_at: expires,
      is_trial: false,
    });
    expect(state.isActive).toBe(true);
    expect(isDashboardAllowed(state as any)).toBe(true);
  });
});
