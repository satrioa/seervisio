import { describe, it, expect } from "vitest";
import {
  createCheckoutSessionInput,
  applyCoupon,
  bindProfile,
  isCheckoutSessionExpired,
  isCheckoutSessionValid,
  CHECKOUT_SESSION_TTL_MS,
  type CheckoutSession,
  type Coupon,
} from "@/lib/customer-journey/checkout-session";

function baseSession(overrides: Partial<CheckoutSession> = {}): CheckoutSession {
  return {
    id: "sess-1",
    token: "tok-abc",
    profile_id: null,
    package_id: "pkg-pro",
    package_slug: "pro",
    package_name: "Pro",
    price: 299000,
    billing_cycle: "monthly",
    currency: "IDR",
    coupon_code: null,
    discount_amount: 0,
    total_amount: 299000,
    status: "active",
    created_at: "2026-01-15T00:00:00.000Z",
    expires_at: "2026-01-16T00:00:00.000Z",
    ...overrides,
  };
}

describe("checkout session", () => {
  describe("createCheckoutSessionInput", () => {
    it("creates an active session persisting package + price", () => {
      const s = createCheckoutSessionInput({
        id: "sess-1",
        token: "tok-abc",
        package_id: "pkg-pro",
        package_slug: "pro",
        package_name: "Pro",
        price: 299000,
      });
      expect(s.status).toBe("active");
      expect(s.profile_id).toBeNull();
      expect(s.price).toBe(299000);
      expect(s.total_amount).toBe(299000);
      expect(s.billing_cycle).toBe("monthly");
      expect(s.currency).toBe("IDR");
    });

    it("sets expires_at to TTL after created_at", () => {
      const created = "2026-01-15T12:00:00.000Z";
      const s = createCheckoutSessionInput({
        id: "x",
        token: "t",
        package_id: "p",
        package_slug: "s",
        package_name: "n",
        price: 100,
        created_at: created,
      });
      const expected = new Date(
        new Date(created).getTime() + CHECKOUT_SESSION_TTL_MS,
      ).toISOString();
      expect(s.expires_at).toBe(expected);
    });

    it("honours explicit billing cycle and currency", () => {
      const s = createCheckoutSessionInput({
        id: "x",
        token: "t",
        package_id: "p",
        package_slug: "s",
        package_name: "n",
        price: 100,
        billing_cycle: "yearly",
        currency: "USD",
      });
      expect(s.billing_cycle).toBe("yearly");
      expect(s.currency).toBe("USD");
    });
  });

  describe("applyCoupon", () => {
    it("clears coupon when null", () => {
      const s = applyCoupon(baseSession({ coupon_code: "OLD", discount_amount: 100, total_amount: 298900 }), null);
      expect(s.coupon_code).toBeNull();
      expect(s.discount_amount).toBe(0);
      expect(s.total_amount).toBe(299000);
    });

    it("applies a percent discount", () => {
      const coupon: Coupon = { code: "HALF", type: "percent", value: 50, currency: "IDR" };
      const s = applyCoupon(baseSession(), coupon);
      expect(s.discount_amount).toBe(149500);
      expect(s.total_amount).toBe(149500);
    });

    it("clamps percent to 100", () => {
      const coupon: Coupon = { code: "ALL", type: "percent", value: 200, currency: "IDR" };
      const s = applyCoupon(baseSession(), coupon);
      expect(s.discount_amount).toBe(299000);
      expect(s.total_amount).toBe(0);
    });

    it("applies a fixed discount and never below zero", () => {
      const coupon: Coupon = { code: "TENK", type: "fixed", value: 10000, currency: "IDR" };
      const s = applyCoupon(baseSession(), coupon);
      expect(s.discount_amount).toBe(10000);
      expect(s.total_amount).toBe(289000);
    });

    it("throws when coupon currency mismatches", () => {
      const coupon: Coupon = { code: "USD", type: "fixed", value: 10, currency: "USD" };
      expect(() => applyCoupon(baseSession(), coupon)).toThrow();
    });
  });

  describe("bindProfile", () => {
    it("links the registered profile to the session", () => {
      const s = bindProfile(baseSession(), "profile-xyz");
      expect(s.profile_id).toBe("profile-xyz");
    });
  });

  describe("validity", () => {
    it("expired when expires_at in the past", () => {
      expect(isCheckoutSessionExpired(baseSession({ expires_at: "2020-01-01T00:00:00.000Z" }))).toBe(true);
    });

    it("active+unexpired session is valid", () => {
      const future = new Date(Date.now() + 3600_000).toISOString();
      expect(isCheckoutSessionValid(baseSession({ expires_at: future }))).toBe(true);
    });

    it("non-active status is invalid even if unexpired", () => {
      const future = new Date(Date.now() + 3600_000).toISOString();
      expect(isCheckoutSessionValid(baseSession({ status: "converted", expires_at: future }))).toBe(false);
    });

    it("expired session is invalid", () => {
      expect(isCheckoutSessionValid(baseSession({ expires_at: "2020-01-01T00:00:00.000Z" }))).toBe(false);
    });
  });
});
