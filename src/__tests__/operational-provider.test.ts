import { describe, it, expect, vi, beforeEach } from "vitest";

/* ── Pure utility tests (no mocks needed) ── */

describe("Shift Utilities", () => {
  describe("formatDuration", () => {
    it("must format 0ms as 00:00:00", async () => {
      const { formatDuration } = await import("@/lib/shift-utils");
      expect(formatDuration(0)).toBe("00:00:00");
    });

    it("must format 1 second as 00:00:01", async () => {
      const { formatDuration } = await import("@/lib/shift-utils");
      expect(formatDuration(1000)).toBe("00:00:01");
    });

    it("must format 1 minute as 00:01:00", async () => {
      const { formatDuration } = await import("@/lib/shift-utils");
      expect(formatDuration(60000)).toBe("00:01:00");
    });

    it("must format 1 hour as 01:00:00", async () => {
      const { formatDuration } = await import("@/lib/shift-utils");
      expect(formatDuration(3600000)).toBe("01:00:00");
    });

    it("must format 2h 43m 15s as 02:43:15", async () => {
      const { formatDuration } = await import("@/lib/shift-utils");
      expect(formatDuration(2 * 3600000 + 43 * 60000 + 15000)).toBe("02:43:15");
    });

    it("must handle negative values as 00:00:00", async () => {
      const { formatDuration } = await import("@/lib/shift-utils");
      expect(formatDuration(-5000)).toBe("00:00:00");
    });
  });

  describe("isStoreOpen", () => {
    it("must return true when shift is OPEN", async () => {
      const { isStoreOpen } = await import("@/lib/shift-utils");
      expect(isStoreOpen({ shiftStatus: "OPEN" } as any)).toBe(true);
    });

    it("must return false when shift is CLOSED", async () => {
      const { isStoreOpen } = await import("@/lib/shift-utils");
      expect(isStoreOpen({ shiftStatus: "CLOSED" } as any)).toBe(false);
    });

    it("must return false when shift is CANCELLED", async () => {
      const { isStoreOpen } = await import("@/lib/shift-utils");
      expect(isStoreOpen({ shiftStatus: "CANCELLED" } as any)).toBe(false);
    });

    it("must return false when shift is null", async () => {
      const { isStoreOpen } = await import("@/lib/shift-utils");
      expect(isStoreOpen(null)).toBe(false);
    });

    it("must return false when shift is undefined", async () => {
      const { isStoreOpen } = await import("@/lib/shift-utils");
      expect(isStoreOpen(undefined)).toBe(false);
    });
  });

  describe("getElapsedSince", () => {
    it("must return duration string from a past ISO date", async () => {
      const { getElapsedSince } = await import("@/lib/shift-utils");
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
      const result = getElapsedSince(fiveMinutesAgo);
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it("must return 00:00:00 for null", async () => {
      const { getElapsedSince } = await import("@/lib/shift-utils");
      expect(getElapsedSince(null)).toBe("00:00:00");
    });

    it("must return 00:00:00 for undefined", async () => {
      const { getElapsedSince } = await import("@/lib/shift-utils");
      expect(getElapsedSince(undefined)).toBe("00:00:00");
    });
  });

  describe("getShiftLabel", () => {
    it("must label morning shift based on hour", async () => {
      const { getShiftLabel } = await import("@/lib/shift-utils");
      const morning = new Date();
      morning.setHours(8, 0, 0, 0);
      expect(getShiftLabel(morning.toISOString())).toBe("Pagi");
    });

    it("must label afternoon shift", async () => {
      const { getShiftLabel } = await import("@/lib/shift-utils");
      const afternoon = new Date();
      afternoon.setHours(14, 0, 0, 0);
      const label = getShiftLabel(afternoon.toISOString());
      expect(["Siang", "Sore"]).toContain(label);
    });

    it("must label evening shift", async () => {
      const { getShiftLabel } = await import("@/lib/shift-utils");
      const evening = new Date();
      evening.setHours(20, 0, 0, 0);
      expect(getShiftLabel(evening.toISOString())).toBe("Malam");
    });

    it("must return label for null", async () => {
      const { getShiftLabel } = await import("@/lib/shift-utils");
      expect(getShiftLabel(null)).toBe("-");
    });
  });
});

/* ── Operational state derivation tests ── */

describe("Operational State Derivation", () => {
  it("must derive storeStatus=OPEN from open shift", async () => {
    const { deriveOperationalState } = await import("@/lib/shift-utils");
    const state = deriveOperationalState({
      shift: { shiftStatus: "OPEN" } as any,
      branchName: "Semarang",
      cashSummary: null,
      serviceQueue: { waiting: 0, delayed: 0 },
    });
    expect(state.storeStatus).toBe("OPEN");
    expect(state.branchName).toBe("Semarang");
  });

  it("must derive storeStatus=CLOSED from null shift", async () => {
    const { deriveOperationalState } = await import("@/lib/shift-utils");
    const state = deriveOperationalState({
      shift: null,
      branchName: "Semarang",
      cashSummary: null,
      serviceQueue: { waiting: 0, delayed: 0 },
    });
    expect(state.storeStatus).toBe("CLOSED");
  });

  it("must include cash summary when provided", async () => {
    const { deriveOperationalState } = await import("@/lib/shift-utils");
    const state = deriveOperationalState({
      shift: { shiftStatus: "OPEN", openingCash: 500000 } as any,
      branchName: "Semarang",
      cashSummary: { currentCash: 750000, expectedCash: 700000, cashDifference: 50000 },
      serviceQueue: { waiting: 3, delayed: 1 },
    });
    expect(state.openingCash).toBe(500000);
    expect(state.currentCash).toBe(750000);
    expect(state.expectedCash).toBe(700000);
    expect(state.cashDifference).toBe(50000);
  });

  it("must include service queue counts", async () => {
    const { deriveOperationalState } = await import("@/lib/shift-utils");
    const state = deriveOperationalState({
      shift: null,
      branchName: "Semarang",
      cashSummary: null,
      serviceQueue: { waiting: 5, delayed: 2 },
    });
    expect(state.serviceWaiting).toBe(5);
    expect(state.serviceDelayed).toBe(2);
  });
});

/* ── Guard behavior tests ── */

describe("Operational Guard", () => {
  it("must block operational actions when store is closed", async () => {
    const { isOperationalAction, isAdministrativeAction } = await import("@/features/store-shift/store-guard");
    expect(isOperationalAction("SERVICE_CREATE")).toBe(true);
    expect(isAdministrativeAction("SERVICE_CREATE")).toBe(false);
  });

  it("must allow administrative actions when store is closed", async () => {
    const { isOperationalAction, isAdministrativeAction } = await import("@/features/store-shift/store-guard");
    expect(isAdministrativeAction("BRAND_PROFILE_EDIT")).toBe(true);
    expect(isOperationalAction("BRAND_PROFILE_EDIT")).toBe(false);
  });

  it("must allow SYSTEM_SETTING_EDIT when store is closed", async () => {
    const { isAdministrativeAction } = await import("@/features/store-shift/store-guard");
    expect(isAdministrativeAction("SYSTEM_SETTING_EDIT")).toBe(true);
  });

  it("must allow REPORT_VIEW when store is closed", async () => {
    const { isAdministrativeAction } = await import("@/features/store-shift/store-guard");
    expect(isAdministrativeAction("REPORT_VIEW")).toBe(true);
  });

  it("must block SHIFT_CLOSE when store is not open (paradoxically, guard shows store must be open to close)", async () => {
    const { isOperationalAction } = await import("@/features/store-shift/store-guard");
    expect(isOperationalAction("SHIFT_CLOSE")).toBe(true);
  });
});

/* ── Provider state shape test (types only, no JSX import in node env) ── */

describe("OperationalProvider State Shape", () => {
  it("must export OperationalState type", async () => {
    const types = await import("@/features/operational/operational-types");
    expect(types.OperationalState).toBeDefined();
  });
});
