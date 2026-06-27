"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { getSessionData, successResult, errorResult, type ActionResult } from "./action-helper";

export type AccountProfileData = {
  profileId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

export type UserPreferencesData = {
  language: string;
  theme: string;
  timezone: string;
  sidebarCollapsed: boolean;
  dateFormat: string;
};

async function getProfileData(brandSlug: string) {
  const session = await getSessionData(brandSlug);
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const adminDb = createServiceRoleSupabaseClient() as any;
  const { data: profile } = await adminDb
    .from("profiles")
    .select("name, email, avatar_url")
    .eq("id", session.profileId)
    .single();

  return {
    session,
    user,
    supabase,
    adminDb,
    profile: profile ?? { name: "", email: user?.email ?? "", avatar_url: null },
  };
}

export async function getAccountProfileAction(
  brandSlug: string,
): Promise<ActionResult<AccountProfileData>> {
  try {
    const { session, profile } = await getProfileData(brandSlug);

    return successResult({
      profileId: session.profileId,
      name: profile.name,
      email: profile.email,
      avatarUrl: profile.avatar_url,
    });
  } catch (err: any) {
    console.error("[getAccountProfileAction]", err);
    return errorResult(err.message ?? "Gagal memuat profil.");
  }
}

export async function updateAccountProfileAction(
  brandSlug: string,
  data: { name: string; email: string },
): Promise<ActionResult<void>> {
  try {
    const { session, adminDb } = await getProfileData(brandSlug);

    if (!data.name || data.name.trim().length === 0) {
      return errorResult("Nama tidak boleh kosong.");
    }

    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return errorResult("Format email tidak valid.");
    }

    const { error } = await adminDb
      .from("profiles")
      .update({ name: data.name.trim(), email: data.email.trim() })
      .eq("id", session.profileId);

    if (error) throw new Error(`Gagal memperbarui profil: ${error.message}`);

    return successResult(undefined);
  } catch (err: any) {
    console.error("[updateAccountProfileAction]", err);
    return errorResult(err.message ?? "Gagal memperbarui profil.");
  }
}

export async function updatePasswordAction(
  brandSlug: string,
  data: { currentPassword: string; newPassword: string },
): Promise<ActionResult<void>> {
  try {
    if (data.newPassword.length < 8) {
      return errorResult("Password baru minimal 8 karakter.");
    }

    const { user, supabase } = await getProfileData(brandSlug);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: data.currentPassword,
    });

    if (signInError) {
      return errorResult("Password saat ini salah.");
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: data.newPassword,
    });

    if (updateError) throw new Error(`Gagal mengubah password: ${updateError.message}`);

    return successResult(undefined);
  } catch (err: any) {
    console.error("[updatePasswordAction]", err);
    return errorResult(err.message ?? "Gagal mengubah password.");
  }
}

export async function getSecurityInfoAction(
  brandSlug: string,
): Promise<ActionResult<{ lastLoginAt: string | null; activeSession: boolean }>> {
  try {
    const { supabase } = await getProfileData(brandSlug);

    const { data } = await supabase.auth.getSession();

    return successResult({
      lastLoginAt: data.session?.user?.last_sign_in_at ?? null,
      activeSession: !!data.session,
    });
  } catch (err: any) {
    console.error("[getSecurityInfoAction]", err);
    return errorResult(err.message ?? "Gagal memuat informasi keamanan.");
  }
}

export async function logoutAllDevicesAction(
  brandSlug: string,
): Promise<ActionResult<void>> {
  try {
    const { adminDb } = await getProfileData(brandSlug);

    const { error } = await adminDb.auth.admin.signOut();

    if (error) throw new Error(`Gagal logout semua perangkat: ${error.message}`);

    return successResult(undefined);
  } catch (err: any) {
    console.error("[logoutAllDevicesAction]", err);
    return errorResult(err.message ?? "Gagal logout semua perangkat.");
  }
}

export async function getUserPreferencesAction(
  brandSlug: string,
): Promise<ActionResult<UserPreferencesData>> {
  try {
    const { session, adminDb } = await getProfileData(brandSlug);

    const { data, error } = await adminDb
      .from("user_preferences")
      .select("*")
      .eq("user_id", session.profileId)
      .maybeSingle();

    if (error) throw new Error(`Gagal memuat preferensi: ${error.message}`);

    if (!data) {
      return successResult({
        language: "id",
        theme: "system",
        timezone: "Asia/Jakarta",
        sidebarCollapsed: false,
        dateFormat: "DD/MM/YYYY",
      });
    }

    return successResult({
      language: data.language,
      theme: data.theme,
      timezone: data.timezone,
      sidebarCollapsed: data.sidebar_collapsed,
      dateFormat: data.date_format,
    });
  } catch (err: any) {
    console.error("[getUserPreferencesAction]", err);
    return errorResult(err.message ?? "Gagal memuat preferensi.");
  }
}

export async function updateUserPreferencesAction(
  brandSlug: string,
  data: UserPreferencesData,
): Promise<ActionResult<void>> {
  try {
    const { session, adminDb } = await getProfileData(brandSlug);

    const { data: existing } = await adminDb
      .from("user_preferences")
      .select("id")
      .eq("user_id", session.profileId)
      .maybeSingle();

    if (existing) {
      const { error } = await adminDb
        .from("user_preferences")
        .update({
          language: data.language,
          theme: data.theme,
          timezone: data.timezone,
          sidebar_collapsed: data.sidebarCollapsed,
          date_format: data.dateFormat,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) throw new Error(`Gagal menyimpan preferensi: ${error.message}`);
    } else {
      const { error } = await adminDb
        .from("user_preferences")
        .insert({
          user_id: session.profileId,
          language: data.language,
          theme: data.theme,
          timezone: data.timezone,
          sidebar_collapsed: data.sidebarCollapsed,
          date_format: data.dateFormat,
        });

      if (error) throw new Error(`Gagal membuat preferensi: ${error.message}`);
    }

    return successResult(undefined);
  } catch (err: any) {
    console.error("[updateUserPreferencesAction]", err);
    return errorResult(err.message ?? "Gagal menyimpan preferensi.");
  }
}
