import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { PublicHeader } from "@/components/landing/public-header";
import { StickyFooter } from "@/components/footer";
import { LandingLoader } from "@/components/landing/landing-loader";
import { GsapSmoothScroll } from "@/components/landing/gsap-smooth-scroll";
import { getLicenseForProfile } from "@/server/repositories/license.repository";

export interface AuthUserData {
  isAuthenticated: boolean;
  dashboardHref: string;
  accountType: "customer" | "platform" | null;
  profile: {
    name: string;
    email: string;
    avatarUrl: string | null;
    onboardingCompleted: boolean;
  } | null;
  brand: {
    name: string;
    slug: string;
    role: string;
  } | null;
  license: {
    exists: boolean;
    isActive: boolean;
    hasPendingPayment: boolean;
  };
}

async function getAuthState(): Promise<AuthUserData> {
  try {
    const supabase = await createServerSupabase();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      return {
        isAuthenticated: false,
        dashboardHref: "/login",
        accountType: null,
        profile: null,
        brand: null,
        license: { exists: false, isActive: false, hasPendingPayment: false },
      };
    }
    const dataUser = sessionData.session.user;

    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("id, name, email, avatar_url, account_type, onboarding_completed")
      .eq("auth_user_id", dataUser.id)
      .maybeSingle();

    if (!profile) {
      return {
        isAuthenticated: true,
        dashboardHref: "/onboarding",
        accountType: null,
        profile: {
          name: dataUser.user_metadata?.name || "",
          email: dataUser.email || "",
          avatarUrl: null,
          onboardingCompleted: false,
        },
        brand: null,
        license: { exists: false, isActive: false, hasPendingPayment: false },
      };
    }

    const accountType = profile.account_type ?? "customer";

    // Platform users — point to platform dashboard, skip brand/license queries
    if (accountType === "platform") {
      return {
        isAuthenticated: true,
        dashboardHref: "/platform/dashboard",
        accountType: "platform",
        profile: {
          name: profile.name || "",
          email: profile.email || dataUser.email || "",
          avatarUrl: profile.avatar_url || null,
          onboardingCompleted: !!profile.onboarding_completed,
        },
        brand: null,
        license: { exists: false, isActive: false, hasPendingPayment: false },
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

    // Fetch license + pending payment
    const license = await getLicenseForProfile(profile.id);
    let licenseExists = !!license;
    let licenseActive = license?.status === "active";

    // Fallback: if no license record but a PAID payment exists (e.g. payment
    // was approved via v2 dashboard before it created licenses), treat as active.
    if (!licenseExists) {
      const adminDb = createServiceRoleSupabaseClient();
      const { data: paidPayment } = await (adminDb as any)
        .from("license_payments")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("status", "paid")
        .limit(1)
        .maybeSingle();
      if (paidPayment) {
        licenseExists = true;
        licenseActive = true;
      }
    }

    let hasPendingPayment = false;
    if (licenseActive) {
      const adminDb = createServiceRoleSupabaseClient();
      const { data: pendingPayment } = await (adminDb as any)
        .from("license_payments")
        .select("id")
        .eq(license ? "license_id" : "profile_id", license?.id ?? profile.id)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();
      hasPendingPayment = !!pendingPayment;
    }

    return {
      isAuthenticated: true,
      dashboardHref: slug ? `/${slug}/panel/dashboard` : "/onboarding",
      accountType: "customer",
      profile: {
        name: profile.name || "",
        email: profile.email || dataUser.email || "",
        avatarUrl: profile.avatar_url || null,
        onboardingCompleted: !!profile.onboarding_completed,
      },
      brand: membership
        ? { name: brandName || "", slug: slug || "", role: membership.role || "" }
        : null,
      license: {
        exists: licenseExists,
        isActive: licenseActive,
        hasPendingPayment,
      },
    };
  } catch {
    return {
      isAuthenticated: false,
      dashboardHref: "/login",
      accountType: null,
      profile: null,
      brand: null,
      license: { exists: false, isActive: false, hasPendingPayment: false },
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
    <div className="theme-landing dark" style={{ colorScheme: "dark" }}>
      <GsapSmoothScroll />
      <LandingLoader>
        <PublicHeader auth={authData} />
        <main className="min-h-screen">{children}</main>
        <StickyFooter />
      </LandingLoader>
    </div>
  );
}
