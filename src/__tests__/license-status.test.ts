import { describe, it, expect } from "vitest";
import {
  getLicenseState,
  isDashboardAllowed,
  canEnterOperational,
  type LicenseRow,
} from "@/lib/customer-journey/license-status";

function makeLicense(overrides: Partial<LicenseRow> = {}): LicenseRow {
  return {
    id: "lic-1",
    brand_id: null,
    profile_id: "profile-1",
    package_id: "pkg-pro",
    status: "active",
    started_at: "2026-01-01T00:00:00.000Z",
    expires_at: "2026-02-01T00:00:00.000Z",
    is_trial: false,
    ...overrides,
  };
}

function future(days: number): string {
  return new Date(Date.now() + days * 86400_000).toISOString();
}
function past(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

describe("license status", () => {
  describe("getLicenseState", () => {
    it("reports none when no license row", () => {
      const s = getLicenseState(null);
      expect(s.exists).toBe(false);
      expect(s.isActive).toBe(false);
      expect(s.status).toBe("none");
      expect(s.daysRemaining).toBeNull();
    });

    it("treats active within expiry as active", () => {
      const s = getLicenseState(makeLicense({ expires_at: future(10) }));
      expect(s.isActive).toBe(true);
      expect(s.isExpired).toBe(false);
      expect(s.daysRemaining).toBeGreaterThan(0);
    });

    it("treats trial within expiry as active", () => {
      const s = getLicenseState(
        makeLicense({ status: "trial", is_trial: true, expires_at: future(5) }),
      );
      expect(s.isActive).toBe(true);
    });

    it("treats active past expiry as expired (not active)", () => {
      const s = getLicenseState(makeLicense({ status: "active", expires_at: past(2) }));
      expect(s.isActive).toBe(false);
      expect(s.isExpired).toBe(true);
    });

    it("treats cancelled as not active", () => {
      const s = getLicenseState(makeLicense({ status: "cancelled", expires_at: future(10) }));
      expect(s.isActive).toBe(false);
    });

    it("lifetime license (no expiry) is active with null days", () => {
      const s = getLicenseState(makeLicense({ expires_at: null }));
      expect(s.isActive).toBe(true);
      expect(s.daysRemaining).toBeNull();
    });
  });

  describe("isDashboardAllowed", () => {
    it("denies without a license", () => {
      expect(isDashboardAllowed(null)).toBe(false);
    });
    it("denies with an expired license", () => {
      expect(isDashboardAllowed(makeLicense({ status: "active", expires_at: past(1) }))).toBe(false);
    });
    it("allows with an active, unexpired license", () => {
      expect(isDashboardAllowed(makeLicense({ expires_at: future(10) }))).toBe(true);
    });
  });

  describe("canEnterOperational", () => {
    it("requires BOTH active license and onboarding complete", () => {
      expect(
        canEnterOperational(makeLicense({ expires_at: future(10) }), false),
      ).toBe(false);
    });
    it("allows when licensed and onboarding complete", () => {
      expect(
        canEnterOperational(makeLicense({ expires_at: future(10) }), true),
      ).toBe(true);
    });
    it("denies when license missing even if onboarding complete", () => {
      expect(canEnterOperational(null, true)).toBe(false);
    });
  });
});
