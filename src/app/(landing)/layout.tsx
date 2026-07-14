import { createServerSupabase } from "@/lib/supabase/server";
import { PublicHeader } from "@/components/landing/public-header";
import { PublicFooter } from "@/components/landing/public-footer";

export interface AuthUserData {
  isAuthenticated: boolean;
  dashboardHref: string;
  accountType: 'customer' | 'platform' | null;
  profile: {
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
  brand: {
    name: string;
    slug: string;
    role: string;
  } | null;
}

async function getAuthState(): Promise<AuthUserData> {
  try {
    const supabase = await createServerSupabase();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
    return {
      isAuthenticated: false,
      dashboardHref: "/login",
      accountType: null,
      profile: null,
      brand: null,
    };
  }

  const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("id, name, email, avatar_url, account_type")
      .eq("auth_user_id", data.user.id)
      .maybeSingle();

    if (!profile) {
      return {
        isAuthenticated: true,
        dashboardHref: "/onboarding",
        accountType: null,
        profile: {
          name: data.user.user_metadata?.name || "",
          email: data.user.email || "",
          avatarUrl: null,
        },
        brand: null,
      };
    }

    const accountType = profile.account_type ?? 'customer';

    // Platform users — point to platform dashboard, skip brand/membership queries
    if (accountType === 'platform') {
      return {
        isAuthenticated: true,
        dashboardHref: "/platform/dashboard",
        accountType: 'platform',
        profile: {
          name: profile.name || "",
          email: profile.email || data.user.email || "",
          avatarUrl: profile.avatar_url || null,
        },
        brand: null,
      };
    }

    const { data: membership } = await (supabase as any)
      .from("user_brand_memberships")
      .select("brand_id, role, brands!user_brand_memberships_brand_id_fkey(name, slug)")
      .eq("profile_id", profile.id)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const slug = membership?.brands?.slug;
    const brandName = membership?.brands?.name;

    return {
      isAuthenticated: true,
      dashboardHref: slug ? `/${slug}/panel/dashboard` : "/onboarding",
      accountType: 'customer',
      profile: {
        name: profile.name || "",
        email: profile.email || data.user.email || "",
        avatarUrl: profile.avatar_url || null,
      },
      brand: membership
        ? { name: brandName || "", slug: slug || "", role: membership.role || "" }
        : null,
    };
  } catch {
    return {
      isAuthenticated: false,
      dashboardHref: "/login",
      accountType: null,
      profile: null,
      brand: null,
    };
  }
}

export default async function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authData = await getAuthState();

  return (
    <div className="theme-landing">
      <PublicHeader auth={authData} />
      <main className="min-h-screen">{children}</main>
      <PublicFooter />
    </div>
  );
}
