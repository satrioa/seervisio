// src/lib/customer-journey/checkout-session.ts
//
// Pure logic for the pre-brand Checkout Session. The session captures the
// package selected on the pricing page and must SURVIVE login + email
// verification (it is the mechanism that prevents "losing the package"
// when the user registers/logs in mid-checkout).
//
// Currency defaults to the brand/platform default; a coupon (if valid)
// reduces the total. Persistence itself is done by the caller (DB / cookie);
// these helpers only compute and validate.

export type BillingCycle = "monthly" | "yearly";

export interface Coupon {
  code: string;
  type: "percent" | "fixed";
  value: number; // percent (0-100) or fixed minor-unit amount
  currency: string;
}

export interface CheckoutSession {
  id: string;
  token: string;
  profile_id: string | null; // null until registered
  package_id: string;
  package_slug: string;
  package_name: string;
  price: number; // package list price in minor units
  billing_cycle: BillingCycle;
  currency: string;
  coupon_code: string | null;
  discount_amount: number; // computed discount in minor units
  total_amount: number; // price - discount
  status: "active" | "expired" | "converted" | "abandoned";
  created_at: string;
  expires_at: string; // sessions are short-lived
}

export const CHECKOUT_SESSION_TTL_MS = 1000 * 60 * 60 * 24; // 24h

export interface CreateCheckoutInput {
  id: string;
  token: string;
  package_id: string;
  package_slug: string;
  package_name: string;
  price: number;
  billing_cycle?: BillingCycle;
  currency?: string;
  created_at?: string;
}

export function createCheckoutSessionInput(
  input: CreateCheckoutInput,
): CheckoutSession {
  const created_at = input.created_at ?? new Date().toISOString();
  const expires_at = new Date(
    new Date(created_at).getTime() + CHECKOUT_SESSION_TTL_MS,
  ).toISOString();

  return {
    id: input.id,
    token: input.token,
    profile_id: null,
    package_id: input.package_id,
    package_slug: input.package_slug,
    package_name: input.package_name,
    price: input.price,
    billing_cycle: input.billing_cycle ?? "monthly",
    currency: input.currency ?? "IDR",
    coupon_code: null,
    discount_amount: 0,
    total_amount: input.price,
    status: "active",
    created_at,
    expires_at,
  };
}

export function isCheckoutSessionExpired(session: Pick<CheckoutSession, "expires_at">): boolean {
  return new Date(session.expires_at).getTime() <= Date.now();
}

export function isCheckoutSessionValid(session: Pick<CheckoutSession, "status" | "expires_at">): boolean {
  return session.status === "active" && !isCheckoutSessionExpired(session);
}

// Attach a coupon to a session, returning a NEW session object with the
// recalculated discount + total. The coupon must be in the same currency.
export function applyCoupon(
  session: CheckoutSession,
  coupon: Coupon | null,
): CheckoutSession {
  if (!coupon) {
    return { ...session, coupon_code: null, discount_amount: 0, total_amount: session.price };
  }
  if (coupon.currency !== session.currency) {
    throw new Error("Coupon currency does not match checkout currency");
  }

  let discount = 0;
  if (coupon.type === "percent") {
    const pct = Math.min(Math.max(coupon.value, 0), 100);
    discount = Math.round(session.price * (pct / 100));
  } else {
    discount = Math.min(coupon.value, session.price);
  }

  return {
    ...session,
    coupon_code: coupon.code,
    discount_amount: discount,
    total_amount: session.price - discount,
  };
}

// Link a registered account to the session (called after registration /
// email verification so the session stays bound to the user).
export function bindProfile(
  session: CheckoutSession,
  profileId: string,
): CheckoutSession {
  return { ...session, profile_id: profileId };
}
