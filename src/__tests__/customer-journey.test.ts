import { describe, it, expect } from "vitest";
import {
  type JourneyState,
  type JourneyEvent,
  type JourneyContext,
  canTransition,
  transition,
  resolveJourneyRoute,
  canAccessArea,
  resolveAreaRoute,
  JOURNEY_START,
} from "@/lib/customer-journey/state-machine";

function ctx(overrides: Partial<JourneyContext> = {}): JourneyContext {
  return {
    hasCheckoutSession: true,
    hasActiveLicense: false,
    onboardingComplete: false,
    ...overrides,
  };
}

describe("customer-journey state machine", () => {
  it("starts at VISITOR", () => {
    expect(JOURNEY_START).toBe("VISITOR");
  });

  describe("valid transitions", () => {
    const cases: Array<[JourneyState, JourneyEvent, JourneyState, Partial<JourneyContext>]> = [
      ["VISITOR", "START_CHECKOUT", "CHECKOUT", { hasCheckoutSession: true }],
      ["VISITOR", "REGISTER", "REGISTERED", {}],
      ["VISITOR", "VERIFY_EMAIL", "EMAIL_VERIFIED", {}],
      ["CHECKOUT", "REGISTER", "REGISTERED", {}],
      ["REGISTERED", "VERIFY_EMAIL", "EMAIL_UNVERIFIED", {}],
      ["EMAIL_UNVERIFIED", "VERIFY_EMAIL", "EMAIL_VERIFIED", {}],
      ["EMAIL_VERIFIED", "UPLOAD_PROOF", "PAYMENT_UPLOADED", {}],
      ["PAYMENT_UPLOADED", "SUBMIT_PROOF", "WAITING_VERIFICATION", {}],
      ["WAITING_VERIFICATION", "REJECT", "EMAIL_VERIFIED", {}],
      ["WAITING_VERIFICATION", "APPROVE", "LICENSE_ACTIVE", { hasActiveLicense: true }],
      ["LICENSE_ACTIVE", "START_ONBOARDING", "ONBOARDING", { hasActiveLicense: true }],
      ["ONBOARDING", "COMPLETE_ONBOARDING", "OPERATIONAL", { hasActiveLicense: true, onboardingComplete: true }],
    ];

    it.each(cases)("allows %s --%s--> %s", (from, event, to, c) => {
      expect(canTransition(from, event, ctx(c))).toBe(true);
      expect(transition(from, event, ctx(c))).toBe(to);
    });
  });

  describe("invalid transitions", () => {
    const illegal: Array<[JourneyState, JourneyEvent]> = [
      ["VISITOR", "UPLOAD_PROOF"],
      ["REGISTERED", "START_ONBOARDING"],
      ["CHECKOUT", "APPROVE"],
      ["EMAIL_VERIFIED", "SUBMIT_PROOF"],
      ["OPERATIONAL", "REGISTER"],
      ["LICENSE_ACTIVE", "COMPLETE_ONBOARDING"],
      ["WAITING_VERIFICATION", "UPLOAD_PROOF"],
    ];

    it.each(illegal)("rejects %s --%s-->", (from, event) => {
      expect(canTransition(from, event, ctx())).toBe(false);
      expect(() => transition(from, event, ctx())).toThrow();
    });
  });

  describe("guards", () => {
    it("blocks APPROVE without an active license", () => {
      expect(
        canTransition("WAITING_VERIFICATION", "APPROVE", ctx({ hasActiveLicense: false })),
      ).toBe(false);
    });

    it("blocks START_ONBOARDING without an active license", () => {
      expect(
        canTransition("LICENSE_ACTIVE", "START_ONBOARDING", ctx({ hasActiveLicense: false })),
      ).toBe(false);
    });

    it("blocks COMPLETE_ONBOARDING when onboarding not complete", () => {
      expect(
        canTransition("ONBOARDING", "COMPLETE_ONBOARDING", ctx({ onboardingComplete: false })),
      ).toBe(false);
    });

    it("allows COMPLETE_ONBOARDING when onboarding complete + licensed", () => {
      expect(
        canTransition(
          "ONBOARDING",
          "COMPLETE_ONBOARDING",
          ctx({ hasActiveLicense: true, onboardingComplete: true }),
        ),
      ).toBe(true);
    });
  });

  describe("route resolution", () => {
    it("maps each state to its single-purpose home route", () => {
      expect(resolveJourneyRoute("VISITOR")).toBe("/");
      expect(resolveJourneyRoute("CHECKOUT")).toBe("/checkout");
      expect(resolveJourneyRoute("REGISTERED")).toBe("/checkout");
      expect(resolveJourneyRoute("EMAIL_UNVERIFIED")).toBe("/checkout");
      expect(resolveJourneyRoute("EMAIL_VERIFIED")).toBe("/checkout");
      expect(resolveJourneyRoute("PAYMENT_UPLOADED")).toBe("/license");
      expect(resolveJourneyRoute("WAITING_VERIFICATION")).toBe("/license");
      expect(resolveJourneyRoute("LICENSE_ACTIVE")).toBe("/welcome");
      expect(resolveJourneyRoute("ONBOARDING")).toBe("/welcome");
      expect(resolveJourneyRoute("OPERATIONAL")).toBe("/");
    });

    it("allows the correct area per state", () => {
      expect(canAccessArea("VISITOR", "landing")).toBe(true);
      expect(canAccessArea("CHECKOUT", "checkout")).toBe(true);
      expect(canAccessArea("EMAIL_VERIFIED", "checkout")).toBe(true);
      expect(canAccessArea("WAITING_VERIFICATION", "license")).toBe(true);
      expect(canAccessArea("ONBOARDING", "welcome")).toBe(true);
      expect(canAccessArea("OPERATIONAL", "dashboard")).toBe(true);
    });

    it("denies dashboard before license active / onboarding complete", () => {
      expect(canAccessArea("WAITING_VERIFICATION", "dashboard")).toBe(false);
      expect(canAccessArea("LICENSE_ACTIVE", "dashboard")).toBe(false);
      expect(canAccessArea("CHECKOUT", "dashboard")).toBe(false);
    });

    it("redirects to the state's home route when area not allowed", () => {
      expect(resolveAreaRoute("CHECKOUT", "dashboard")).toBe("/checkout");
      expect(resolveAreaRoute("EMAIL_VERIFIED", "license")).toBe("/checkout");
      expect(resolveAreaRoute("OPERATIONAL", "dashboard")).toBe("/dashboard");
      expect(resolveAreaRoute("WAITING_VERIFICATION", "welcome")).toBe("/license");
    });
  });
});
