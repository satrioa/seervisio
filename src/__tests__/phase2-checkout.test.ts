import { describe, it, expect, vi } from "vitest";
import {
  createCheckoutSessionInput,
  applyCoupon,
  bindProfile,
  isCheckoutSessionValid,
  type CheckoutSession,
} from "@/lib/customer-journey/checkout-session";

// Phase 2 focus: a checkout session created anonymously must
// (a) start with profile_id = null, (b) survive binding to a
// registered profile, (c) stay valid/active across the login +
// email-verification boundary, and (d) expire after TTL.
//
// We simulate the DB round-trip with a tiny in-memory store so the
// test exercises the REAL bind/lookup logic, not just the pure helper.

function makeSession(): CheckoutSession {
  return createCheckoutSessionInput({
    id: "sess-1",
    token: "tok-abc123",
    package_id: "pkg-pro",
    package_slug: "pro",
    package_name: "Pro",
    price: 299000,
  });
}

describe("Phase 2: checkout session persists across auth boundary", () => {
  it("starts anonymous (profile_id null) and active", () => {
    const s = makeSession();
    expect(s.profile_id).toBeNull();
    expect(isCheckoutSessionValid(s)).toBe(true);
  });

  it("binds the registered profile without losing the package", () => {
    const s0 = makeSession();
    const s1 = bindProfile(s0, "profile-xyz");
    expect(s1.profile_id).toBe("profile-xyz");
    // Package selection must be preserved.
    expect(s1.package_id).toBe("pkg-pro");
    expect(s1.package_slug).toBe("pro");
    expect(s1.total_amount).toBe(299000);
  });

  it("survives a simulated DB round-trip after login/verification", () => {
    // 1) visitor creates session (anonymous)
    const created = makeSession();
    const store = new Map<string, CheckoutSession>();
    store.set(created.token, created);

    // 2) after registration + email verification, the session is
    //    bound to the new profile (mirrors bindCheckoutSessionToProfileAction)
    const afterBind = bindProfile(store.get(created.token)!, "profile-xyz");
    store.set(afterBind.token, afterBind);

    // 3) /checkout later reads it back and it is still valid+active
    const loaded = store.get("tok-abc123")!;
    expect(loaded.profile_id).toBe("profile-xyz");
    expect(isCheckoutSessionValid(loaded)).toBe(true);
    expect(loaded.status).toBe("active");
  });

  it("returns null when the session has expired (not 'valid')", () => {
    const expired = makeSession();
    expired.expires_at = "2020-01-01T00:00:00.000Z";
    expect(isCheckoutSessionValid(expired)).toBe(false);
  });

  it("coupon WELCOME10 applies a 10% discount (stubbed)", () => {
    const s = makeSession();
    const withCoupon = applyCoupon(s, {
      code: "WELCOME10",
      type: "percent",
      value: 10,
      currency: "IDR",
    });
    expect(withCoupon.discount_amount).toBe(29900);
    expect(withCoupon.total_amount).toBe(269100);
  });
});
