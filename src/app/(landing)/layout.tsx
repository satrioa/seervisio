import { createServerSupabase } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/landing/public-header";
import { PublicFooter } from "@/components/landing/public-footer";

async function getAuthState() {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { isAuthenticated: false, dashboardHref: "/login" };

    const { data: memberships } = await (supabase as any)
      .from("user_brand_memberships")
      .select("brand_id, brands!user_brand_memberships_brand_id_fkey(slug)")
      .eq("profile_id", data.user.id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const slug = memberships?.brands?.slug;
    return {
      isAuthenticated: true,
      dashboardHref: slug ? `/${slug}/panel` : "/login",
    };
  } catch {
    return { isAuthenticated: false, dashboardHref: "/login" };
  }
}

export default async function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, dashboardHref } = await getAuthState();

  return (
    <>
      <PublicHeader isAuthenticated={isAuthenticated} dashboardHref={dashboardHref} />
      <main className="min-h-screen">{children}</main>
      <PublicFooter />
    </>
  );
}
