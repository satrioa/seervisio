import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";

/**
 * Supabase Auth middleware for Next.js.
 *
 * What this does:
 * 1. Refreshes the Supabase session on every request (cookie-based)
 * 2. Protects /[brandSlug]/panel/* routes — redirects to /login if not authenticated
 * 3. Protects /[brandSlug]/panel/* routes — redirects to /login if profile not linked
 * 4. Redirects authenticated users away from /login
 * 5. Short-circuits early for /callback routes (protects PKCE code verifier cookie)
 *
 * Matcher in config: applies to everything except static files, _next, and API
 */
export async function middleware(request: NextRequest) {
  // SHORT-CIRCUIT: For OAuth callback, bypass ALL Supabase client creation.
  // The middleware's setAll() creates a new NextResponse on auth token refresh,
  // which destroys the PKCE code verifier cookie context.
  if (request.nextUrl.pathname.startsWith("/callback")) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[],
          headers: Record<string, string>,
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          );
        },
      },
    }
  );

  // Refresh session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[middleware] getUser result:", {
    pathname: request.nextUrl.pathname,
    hasUser: Boolean(user),
    userId: user?.id,
  });

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Public routes that don't need auth
  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/checkout" ||
    pathname === "/license" ||
    pathname === "/welcome" ||
    pathname === "/platform/login" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/";

  // Check route types
  const isPanelRoute = /^\/[^/]+\/panel(\/.*)?$/.test(pathname);
  const isPlatformRoute = pathname.startsWith("/platform");

  // For public routes — redirect authenticated users away from public pages
  if (isPublicRoute) {
    if (user) {
      if (pathname === "/login") {
        // Authenticated customer users go to landing page; platform users stay on platform pages
        url.pathname = "/";
        return NextResponse.redirect(url);
      }
      if (pathname === "/platform/login" && user) {
        // Already authenticated platform user visiting login → redirect to platform dashboard
        url.pathname = "/platform/dashboard";
        return NextResponse.redirect(url);
      }
    }
    return supabaseResponse;
  }

  // ====================== UNAUTHENTICATED USERS ======================
  if (!user) {
    // Platform route (including platform/login is already handled above as public)
    if (isPlatformRoute) {
      url.pathname = "/platform/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    // Panel route
    if (isPanelRoute) {
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  // ====================== AUTHENTICATED USERS ======================
  // Load profile + account_type + onboarding state for all protected routes
  const profileResult = await (
    supabase
      .from("profiles")
      .select("id, is_active, account_type, onboarding_completed")
      .eq("auth_user_id", user.id)
      .single() as unknown as Promise<{
      data: { id: string; is_active: boolean; account_type: string; onboarding_completed: boolean } | null;
    }>
  );

  const profile = profileResult.data;

  // If profile not found or inactive, redirect to login with error
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    url.pathname = "/login";
    url.searchParams.set("error", "account_disabled");
    return NextResponse.redirect(url);
  }

  const accountType = profile.account_type ?? 'customer';

  // Platform routes: require account_type === 'platform'
  if (isPlatformRoute) {
    if (accountType !== 'platform') {
      // Customer trying to access platform area — redirect to landing page
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Panel routes: require account_type === 'customer'
  if (isPanelRoute) {
    if (accountType !== 'customer') {
      // Platform user trying to access customer panel — redirect to platform dashboard
      url.pathname = "/platform/dashboard";
      return NextResponse.redirect(url);
    }

    // Verify user has access to this brand
    const brandSlug = pathname.split("/")[1];
    const brandResult = await (
      supabase
        .from("brands")
        .select("id")
        .eq("slug", brandSlug)
        .single() as unknown as Promise<{ data: { id: number } | null }>
    );

    const brand = brandResult.data;

    if (brand) {
      const membershipResult = await (
        supabase
          .from("user_brand_memberships")
          .select("id")
          .eq("profile_id", profile.id)
          .eq("brand_id", brand.id)
          .eq("is_active", true)
          .single() as unknown as Promise<{ data: { id: string } | null }>
      );

      const membership = membershipResult.data;

      if (!membership) {
        url.pathname = "/login";
        url.searchParams.set("error", "no_brand_access");
        return NextResponse.redirect(url);
      }

      // ── License & onboarding gate ─────────────────────────────
      // Customers must have an active license before they can reach
      // the panel. The standalone /license page handles all pre-panel
      // states (no license, pending payment, etc.).
      const licResult = await (
        (supabase as any)
          .from("licenses")
          .select("id, status, expires_at")
          .or(`profile_id.eq.${profile.id},brand_id.eq.${brand.id}`)
          .in("status", ["active", "trial"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle() as unknown as Promise<{
          data: { id: string; status: string; expires_at: string | null } | null;
        }>
      );

      const hasActiveLicense = licResult.data !== null;

      if (!hasActiveLicense) {
        url.pathname = "/license";
        return NextResponse.redirect(url);
      }

      if (!profile.onboarding_completed) {
        url.pathname = "/welcome";
        return NextResponse.redirect(url);
      }

      // ── All checks pass → allow panel access ──────────────────
    } else {
      // Brand slug may have changed — redirect to user's first brand
      const membershipResult = await (
        supabase
          .from("user_brand_memberships")
          .select("brand_id")
          .eq("profile_id", profile.id)
          .not("brand_id", "is", null)
          .limit(1)
          .single() as unknown as Promise<{ data: { brand_id: number } | null }>
      );

      if (membershipResult.data?.brand_id) {
        const brandByIdResult = await (
          supabase
            .from("brands")
            .select("slug")
            .eq("id", membershipResult.data.brand_id)
            .single() as unknown as Promise<{ data: { slug: string } | null }>
        );

        if (brandByIdResult.data?.slug) {
          const newPath = pathname.replace(/^\/[^/]+/, `/${brandByIdResult.data.slug}`);
          url.pathname = newPath;
          return NextResponse.redirect(url);
        }
      }

      url.pathname = "/login";
      url.searchParams.set("error", "no_brand_access");
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Match all routes except static files, _next, and api
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
