import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import TrackingClient from "./tracking-client";

export default async function TrackPage({
  params,
}: {
  params: Promise<{ brandSlug: string }>;
}) {
  const { brandSlug } = await params;

  try {
    const supabase = await createServerSupabase();

    const { data: brand, error: brandErr } = await (supabase as any)
      .from("brands")
      .select("id, name")
      .eq("slug", brandSlug)
      .maybeSingle();

    if (brandErr || !brand) {
      console.error("[TrackPage] brand query error:", JSON.stringify(brandErr), "slug:", brandSlug);
      return (
        <div className="flex min-h-screen items-center justify-center p-8">
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-700">Brand tidak ditemukan</p>
            <p className="mt-1 text-sm text-gray-500">Pastikan tautan sudah benar.</p>
          </div>
        </div>
      );
    }

    const adminDb = createServiceRoleSupabaseClient() as any;
    const { data: settings } = await adminDb
      .from("brand_settings")
      .select("theme_primary_color, logo_url")
      .eq("brand_id", brand.id)
      .maybeSingle();

    const primaryColor = (settings?.theme_primary_color as string) ?? "#F59E0B";
    const logoUrl = (settings?.logo_url as string) ?? null;

    return (
      <TrackingClient
        brandSlug={brandSlug}
        brandName={brand.name}
        primaryColor={primaryColor}
        logoUrl={logoUrl}
      />
    );
  } catch (err: any) {
    console.error("[TrackPage] error:", err?.message ?? err);
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">Terjadi kesalahan</p>
          <p className="mt-1 text-sm text-gray-500">{err?.message ?? "Silakan coba lagi."}</p>
        </div>
      </div>
    );
  }
}
