"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { getProfileByAuthUserId, getMembershipForBrand } from "@/repositories/profile.repository";
import { getBrandBySlug } from "@/repositories/brand.repository";
import { getProfileById } from "@/repositories/profile.repository";
import { resolveActiveOperator, setActiveOperatorCookie, clearActiveOperatorCookie } from "@/lib/auth/active-operator";
import { verifyPin, validatePinFormat } from "@/lib/auth/pin-hash";
import { getSessionData, successResult, errorResult, type ActionResult } from "./action-helper";

export interface SwitchableOperator {
  id: string;
  name: string;
  email: string;
  role: string;
  isActiveOperator: boolean;
  pinEnabled: boolean;
}

/**
 * List all profiles that have membership in the current brand and are switchable.
 */
export async function listSwitchableOperatorsAction(
  brandSlug: string,
): Promise<ActionResult<SwitchableOperator[]>> {
  try {
    const session = await getSessionData(brandSlug);
    const supabase = await createServerSupabase();

    // Get all memberships for this brand
    const brand = await getBrandBySlug(supabase as any, brandSlug);
    if (!brand) return errorResult("Brand tidak ditemukan.");

    const { data: memberships } = await (supabase as any)
      .from("user_brand_memberships")
      .select("profile_id, role")
      .eq("brand_id", brand.id)
      .eq("is_active", true);

    if (!memberships || memberships.length === 0) {
      return successResult([]);
    }

    const profileIds = [...new Set<string>(memberships.map((m: any) => m.profile_id))];

    const { data: profiles } = await (supabase as any)
      .from("profiles")
      .select("id, name, email, pin_enabled")
      .in("id", profileIds)
      .eq("is_active", true);

    if (!profiles) return successResult([]);

    const activeOperator = await resolveActiveOperator(supabase as any, brand.id, session.profileId);
    const activeOperatorId = activeOperator?.profileId ?? session.profileId;

    const operators: SwitchableOperator[] = profiles.map((p: any) => {
      const membership = memberships.find((m: any) => m.profile_id === p.id);
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        role: membership?.role ?? "",
        isActiveOperator: p.id === activeOperatorId,
        pinEnabled: p.pin_enabled ?? false,
      };
    });

    return successResult(operators);
  } catch (err: any) {
    console.error("[listSwitchableOperatorsAction]", err);
    return errorResult(err.message ?? "Gagal memuat daftar operator.");
  }
}

export interface VerifyPinInput {
  operatorId: string;
  pin: string;
}

/**
 * Verify operator PIN and switch active operator on success.
 */
export async function verifyOperatorPinAndSwitchAction(
  brandSlug: string,
  input: VerifyPinInput,
): Promise<ActionResult<void>> {
  try {
    console.log("[switch-account:server] verify start", { operatorId: input.operatorId });
    const supabase = await createServerSupabase();

    // Validate authenticated session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log("[switch-account:server] session exists", Boolean(user));
    if (authError || !user) {
      return errorResult("Sesi tidak valid. Silakan login ulang.");
    }

    // Get auth profile
    const authProfile = await getProfileByAuthUserId(supabase as any, user.id);
    if (!authProfile) {
      return errorResult("Profil tidak ditemukan.");
    }

    // Validate brand
    const brand = await getBrandBySlug(supabase as any, brandSlug);
    if (!brand) return errorResult("Brand tidak ditemukan.");

    // Load target operator
    const operator = await getProfileById(supabase as any, input.operatorId);
    console.log("[switch-account:server] operator found", Boolean(operator));
    if (!operator) return errorResult("Staff tidak ditemukan.");
    if (!operator.is_active) return errorResult("Akun staff tidak aktif.");

    // Check pin_enabled from DB directly (type may not include migration fields yet)
    const { data: operatorExt } = await (supabase as any)
      .from("profiles")
      .select("pin_enabled, pin_hash, pin_failed_attempts")
      .eq("id", input.operatorId)
      .single();

    console.log("[switch-account:server] pin enabled", Boolean(operatorExt?.pin_enabled));
    if (!operatorExt || !operatorExt.pin_enabled) return errorResult("PIN belum diaktifkan untuk staff ini.");

    // Verify operator belongs to current brand
    const operatorMembership = await getMembershipForBrand(supabase as any, operator.id, brand.id);
    if (!operatorMembership || !operatorMembership.is_active) {
      return errorResult("Staff tidak memiliki akses ke brand/cabang ini.");
    }

    // Verify PIN
    const formatError = validatePinFormat(input.pin);
    if (formatError) return errorResult(formatError);

    if (!operatorExt.pin_hash) return errorResult("PIN belum diaktifkan untuk staff ini.");

    const pinValid = await verifyPin(input.pin, operatorExt.pin_hash);
    console.log("[switch-account:server] pin valid", pinValid);
    if (!pinValid) {
      // Increment failed attempts
      await (supabase as any)
        .from("profiles")
        .update({
          pin_failed_attempts: (operatorExt.pin_failed_attempts ?? 0) + 1,
        })
        .eq("id", operator.id);

      return errorResult("PIN tidak valid.");
    }

    // Reset failed attempts on success
    await (supabase as any)
      .from("profiles")
      .update({
        pin_failed_attempts: 0,
        pin_locked_until: null,
      })
      .eq("id", operator.id);

    // Set active operator cookie
    await setActiveOperatorCookie(operator.id);

    return successResult(undefined);
  } catch (err: any) {
    console.error("[verifyOperatorPinAndSwitchAction]", err);
    return errorResult(err.message ?? "Gagal mengganti operator.");
  }
}

/**
 * Clear active operator and fallback to authenticated user.
 */
export async function clearActiveOperatorAction(
  brandSlug: string,
): Promise<ActionResult<void>> {
  try {
    await clearActiveOperatorCookie();
    return successResult(undefined);
  } catch (err: any) {
    console.error("[clearActiveOperatorAction]", err);
    return errorResult(err.message ?? "Gagal mereset operator.");
  }
}

/**
 * Full logout: clear active operator + sign out Supabase.
 */
export async function logoutAction(
  brandSlug: string,
): Promise<ActionResult<void>> {
  try {
    await clearActiveOperatorCookie();

    const supabase = await createServerSupabase();
    await supabase.auth.signOut();

    return successResult(undefined);
  } catch (err: any) {
    console.error("[logoutAction]", err);
    return errorResult(err.message ?? "Gagal logout.");
  }
}
