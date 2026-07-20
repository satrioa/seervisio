import { describe, it, expect } from "vitest";
import { calculateLicenseExpiry, type LicensePackageBilling } from "@/lib/license/license-duration";

function makePkg(overrides: Partial<LicensePackageBilling>): LicensePackageBilling {
  return {
    billing_duration_enabled: true,
    billing_duration_type: "month",
    billing_duration_value: 1,
    ...overrides,
  };
}

describe("calculateLicenseExpiry", () => {
  it("returns 1 month ahead for monthly package", () => {
    const pkg = makePkg({
      billing_duration_type: "month",
      billing_duration_value: 1,
    });
    const startsAt = new Date("2026-01-15T00:00:00Z");
    const result = calculateLicenseExpiry(pkg, startsAt);
    expect(result).toBe("2026-02-15T00:00:00.000Z");
  });

  it("returns 3 months ahead for quarterly package", () => {
    const pkg = makePkg({
      billing_duration_type: "month",
      billing_duration_value: 3,
    });
    const startsAt = new Date("2026-01-15T00:00:00Z");
    const result = calculateLicenseExpiry(pkg, startsAt);
    expect(result).toBe("2026-04-15T00:00:00.000Z");
  });

  it("returns 1 year ahead for yearly package", () => {
    const pkg = makePkg({
      billing_duration_type: "year",
      billing_duration_value: 1,
    });
    const startsAt = new Date("2026-01-15T00:00:00Z");
    const result = calculateLicenseExpiry(pkg, startsAt);
    expect(result).toBe("2027-01-15T00:00:00.000Z");
  });

  it("returns null for lifetime package (billing disabled)", () => {
    const pkg = makePkg({
      billing_duration_enabled: false,
      billing_duration_type: "month",
      billing_duration_value: 1,
    });
    const startsAt = new Date("2026-01-15T00:00:00Z");
    const result = calculateLicenseExpiry(pkg, startsAt);
    expect(result).toBeNull();
  });

  it("returns null when billing_duration_type is null", () => {
    const pkg = makePkg({
      billing_duration_enabled: true,
      billing_duration_type: null,
      billing_duration_value: 1,
    });
    const startsAt = new Date("2026-01-15T00:00:00Z");
    const result = calculateLicenseExpiry(pkg, startsAt);
    expect(result).toBeNull();
  });

  it("throws for invalid duration type", () => {
    const pkg = makePkg({
      billing_duration_enabled: true,
      billing_duration_type: "day" as LicensePackageBilling["billing_duration_type"],
      billing_duration_value: 1,
    });
    const startsAt = new Date("2026-01-15T00:00:00Z");
    expect(() => calculateLicenseExpiry(pkg, startsAt)).toThrow();
  });
});
