"use server";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { successResult, errorResult, type ActionResult } from "./action-helper";
import {
  createCheckoutSessionInput,
  applyCoupon,
  bindProfile,
  isCheckoutSessionValid,
  type CheckoutSession,
  type Coupon,
  type BillingCycle,
} from "@/lib/customer-journey/checkout-session";
import { getProfileByAuthUserId } from "@/repositories/profile.repository";
import { getActiveCouponByCode } from "@/repositories/coupon.repository";

function generateUuid(): string {
  const c = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function generateToken(): string {
  // URL-safe, opaque token. Uses crypto when available.
  const c = (globalThis as any).crypto;
  if (c?.randomUUID) {
    return "cs_" + c.randomUUID().replace(/-/g, "") + Math.random().toString(36).slice(2, 10);
  }
  return "cs_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export interface CheckoutSessionView {
  token: string;
  packageId: string;
  packageSlug: string;
  packageName: string;
  price: number;
  billingCycle: BillingCycle;
  currency: string;
  couponCode: string | null;
  discountAmount: number;
  totalAmount: number;
  status: CheckoutSession["status"];
  hasActiveLicense: boolean;
  profileId: string | null;
}

// Create a checkout session for a package. Works for anonymous
// visitors (profile_id null) and survives login + email verification.
export async function createCheckoutSessionAction(input: {
  packageId: string;
  billingCycle?: BillingCycle;
  couponCode?: string | null;
}): Promise<ActionResult<{ token: string; session: CheckoutSessionView }>> {
  try {
    const adminDb = createServiceRoleSupabaseClient();

    // If the caller is already authenticated, bind the session immediately
    // so the checkout page shows the authenticated state.
    let boundProfileId: string | null = null;
    try {
      const supabase = await createServerSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const profile = await getProfileByAuthUserId(supabase as any, user.id) as any;
        if (profile?.id) boundProfileId = profile.id;
      }
    } catch {
      // Non-critical — anonymous sessions still work.
    }

    // Expire any existing active session for this profile first, since
    // the DB has a partial unique index (one active session per profile).
    if (boundProfileId) {
      await (adminDb as any)
        .from("checkout_sessions")
        .update({ status: "abandoned" })
        .eq("profile_id", boundProfileId)
        .eq("status", "active");
    }

    const { data: pkg, error: pkgError } = await (adminDb as any)
      .from("packages")
      .select("id, slug, name, price, billing_duration_enabled")
      .eq("id", input.packageId)
      .eq("is_active", true)
      .maybeSingle();

    if (pkgError || !pkg) {
      return errorResult("Paket tidak ditemukan.");
    }

    // Lifetime packages (billing_duration_enabled = false) use "lifetime" as billing cycle
    const isLifetime = pkg.billing_duration_enabled === false;
    const defaultBillingCycle = isLifetime ? "lifetime" : "monthly";

    const token = generateToken();
    const sessionId = generateUuid();
    let session = createCheckoutSessionInput({
      id: sessionId,
      token,
      package_id: pkg.id,
      package_slug: pkg.slug,
      package_name: pkg.name,
      price: Number(pkg.price),
      billing_cycle: input.billingCycle ?? defaultBillingCycle,
    });

    if (input.couponCode) {
      const couponRow = await getActiveCouponByCode(input.couponCode);
      if (couponRow) {
        const coupon: Coupon = {
          code: couponRow.code,
          type: couponRow.discountType,
          value: couponRow.discountValue,
          currency: couponRow.currency,
        };
        try {
          session = applyCoupon(session, coupon);
        } catch {
          return errorResult("Kupon tidak valid untuk mata uang ini.");
        }
      }
    }

    const { data: inserted, error: insertError } = await (adminDb as any)
      .from("checkout_sessions")
      .insert({
        id: session.id,
        token: session.token,
        profile_id: boundProfileId,
        package_id: session.package_id,
        package_slug: session.package_slug,
        package_name: session.package_name,
        price: session.price,
        billing_cycle: session.billing_cycle,
        currency: session.currency,
        coupon_code: session.coupon_code,
        discount_amount: session.discount_amount,
        total_amount: session.total_amount,
        status: session.status,
        expires_at: session.expires_at,
      })
      .select()
      .single();

    if (insertError || !inserted) {
      console.error("[checkout] create session error:", insertError);
      return errorResult("Gagal membuat sesi checkout.");
    }

    return successResult({
      token: session.token,
      session: mapSessionView(inserted as any),
    });
  } catch (err: any) {
    console.error("[checkout] createCheckoutSessionAction:", err.message);
    return errorResult("Gagal membuat sesi checkout.");
  }
}

// Fetch a session by token (used by /checkout and after login/verification).
export async function getCheckoutSessionAction(token: string | null | undefined): Promise<
  ActionResult<CheckoutSessionView | null>
> {
  try {
    if (!token) return successResult(null);
    const adminDb = createServiceRoleSupabaseClient();

    const { data, error } = await (adminDb as any)
      .from("checkout_sessions")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (error) return errorResult("Gagal memuat sesi checkout.");
    if (!data) return successResult(null);

    const row = data as any;
    if (!isCheckoutSessionValid(row)) {
      return successResult(null);
    }

    // Best-effort: does this profile already hold an active license?
    let hasActiveLicense = false;
    if (row.profile_id) {
      try {
        const { getActiveLicenseForProfile } = await import("@/server/repositories/license.repository");
        const lic = await getActiveLicenseForProfile(row.profile_id);
        hasActiveLicense = Boolean(lic);
      } catch {
        hasActiveLicense = false;
      }
    }

    return successResult({ ...mapSessionView(row), hasActiveLicense });
  } catch (err: any) {
    console.error("[checkout] getCheckoutSessionAction:", err.message);
    return errorResult("Gagal memuat sesi checkout.");
  }
}

// Bind an (anonymous) session to the now-registered profile so the
// selected package survives the account creation step.
export async function bindCheckoutSessionToProfileAction(
  token: string,
  profileId: string,
): Promise<ActionResult<void>> {
  try {
    const adminDb = createServiceRoleSupabaseClient();
    const { error } = await (adminDb as any)
      .from("checkout_sessions")
      .update({ profile_id: profileId })
      .eq("token", token)
      .eq("status", "active");

    if (error) {
      console.error("[checkout] bind session error:", error);
      return errorResult("Gagal menghubungkan sesi checkout.");
    }
    return successResult(undefined);
  } catch (err: any) {
    console.error("[checkout] bindCheckoutSessionToProfileAction:", err.message);
    return errorResult("Gagal menghubungkan sesi checkout.");
  }
}

// Called by the login form right after a successful client-side sign-in,
// so an anonymous checkout session created before login is bound to
// the now-authenticated user. (The /checkout page also re-binds
// defensively, but this makes the binding immediate.)
export async function afterLoginRebindCheckoutAction(): Promise<ActionResult<void>> {
  return bindActiveCheckoutSessionToUserAction();
}

// Apply or remove a coupon on an existing active session.
// Validates the coupon against the DB before applying.
export async function applyCouponToSessionAction(
  token: string,
  couponCode: string | null,
): Promise<ActionResult<CheckoutSessionView>> {
  try {
    const adminDb = createServiceRoleSupabaseClient() as any;

    const { data: row, error: fetchError } = await adminDb
      .from("checkout_sessions")
      .select("*")
      .eq("token", token)
      .eq("status", "active")
      .maybeSingle();

    if (fetchError || !row) {
      return errorResult("Sesi checkout tidak ditemukan.");
    }

    let session: CheckoutSession = { ...row, status: "active" };

    if (couponCode) {
      const couponRow = await getActiveCouponByCode(couponCode);
      if (!couponRow) {
        return errorResult("Kode kupon tidak valid atau sudah kadaluarsa.");
      }

      // Check min order amount
      if (couponRow.minOrderAmount && session.price < couponRow.minOrderAmount) {
        return errorResult(
          `Minimal pembelian ${couponRow.minOrderAmount} untuk kupon ini.`,
        );
      }

      // Check max uses
      if (couponRow.maxUses && couponRow.usedCount >= couponRow.maxUses) {
        return errorResult("Kuota pemakaian kupon sudah habis.");
      }

      const coupon: Coupon = {
        code: couponRow.code,
        type: couponRow.discountType,
        value: couponRow.discountValue,
        currency: couponRow.currency,
      };

      try {
        session = applyCoupon(session, coupon);
      } catch {
        return errorResult("Kupon tidak valid untuk mata uang ini.");
      }
    } else {
      session = { ...session, coupon_code: null, discount_amount: 0, total_amount: session.price };
    }

    const { data: updated, error: updateError } = await adminDb
      .from("checkout_sessions")
      .update({
        coupon_code: session.coupon_code,
        discount_amount: session.discount_amount,
        total_amount: session.total_amount,
      })
      .eq("token", token)
      .select()
      .single();

    if (updateError || !updated) {
      return errorResult("Gagal menerapkan kupon.");
    }

    return successResult(mapSessionView(updated));
  } catch (err: any) {
    console.error("[checkout] applyCouponToSessionAction:", err.message);
    return errorResult("Gagal menerapkan kupon.");
  }
}

// After a successful login, re-bind any active session belonging to this
// user (covers the case where the session was created pre-login).
export async function bindActiveCheckoutSessionToUserAction(): Promise<ActionResult<void>> {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return successResult(undefined);

    const profile = (await getProfileByAuthUserId(supabase as any, user.id)) as any;
    if (!profile || !profile.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profile.id)) {
      // Profile missing or has an invalid (e.g. "null") id — skip rebind to
      // avoid "invalid input syntax for type uuid".
      return successResult(undefined);
    }

    const adminDb = createServiceRoleSupabaseClient();
    const { error } = await (adminDb as any)
      .from("checkout_sessions")
      .update({ profile_id: profile.id })
      .is("profile_id", null)
      .eq("status", "active")
      .filter("expires_at", "gt", new Date().toISOString())
      .maybeSingle();

    if (error) console.warn("[checkout] rebind session:", error.message);
    return successResult(undefined);
  } catch (err: any) {
    console.error("[checkout] bindActiveCheckoutSessionToUserAction:", err.message);
    return errorResult("Gagal menghubungkan sesi checkout.");
  }
}

function mapSessionView(row: any): CheckoutSessionView {
  return {
    token: row.token,
    packageId: row.package_id,
    packageSlug: row.package_slug,
    packageName: row.package_name,
    price: Number(row.price),
    billingCycle: row.billing_cycle,
    currency: row.currency,
    couponCode: row.coupon_code ?? null,
    discountAmount: Number(row.discount_amount),
    totalAmount: Number(row.total_amount),
    status: row.status,
    hasActiveLicense: false,
    profileId: row.profile_id ?? null,
  };
}
