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

  // SHORT-CIRCUIT: For mockup routes, bypass middleware entirely.
  // Mockup is a static demo route — no auth, no brand check needed.
  if (request.nextUrl.pathname.startsWith("/mockup")) {
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

  // Refresh + read the user for ALL routes so the server components
  // (including landing layout) can call getSession() without triggering
  // another refresh attempt. When the refresh token is invalid, clear
  // the cookies immediately to prevent repeated failed refresh attempts.
  let user: { id: string } | null = null;
  const needsUser = isPanelRoute || isPlatformRoute || pathname === "/login" || pathname === "/platform/login";

  if (needsUser) {
    try {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      user = u;
    } catch {
      user = null;
    }
  } else {
    // For public routes (including landing), still attempt a passive session
    // refresh so that the landing layout's getSession() won't trigger a
    // failed refresh attempt. If it fails, clear the stale cookies.
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        user = { id: sessionData.session.user.id };
        // Re-set the session so subsequent getUser calls in server actions
        // don't trigger a double refresh. The access token was refreshed.
      }
    } catch {
      // Refresh token invalid — clear stale cookies so the landing layout
      // doesn't keep trying to refresh on every request.
      await supabase.auth.signOut().catch(() => {});
      user = null;
    }
  }

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
  // Load profile + account_type + onboarding state for all protected routes.
  // For panel routes, fetch the brand (by slug) in parallel with the profile.
  const brandSlug = isPanelRoute ? pathname.split("/")[1] : null;
  const [profileResult, brandResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, is_active, account_type, onboarding_completed")
      .eq("auth_user_id", user.id)
      .single() as unknown as Promise<{
      data: { id: string; is_active: boolean; account_type: string; onboarding_completed: boolean } | null;
    }>,
    brandSlug
      ? (supabase
          .from("brands")
          .select("id")
          .eq("slug", brandSlug)
          .single() as unknown as Promise<{ data: { id: number } | null }>)
      : Promise.resolve({ data: null as { id: number } | null }),
  ]);

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
    const brand = brandResult.data;

    if (brand) {
      // OPTIMIZED: membership + license checked in parallel
      const [membershipResult, licResult] = await Promise.all([
        supabase
          .from("user_brand_memberships")
          .select("id")
          .eq("profile_id", profile.id)
          .eq("brand_id", brand.id)
          .eq("is_active", true)
          .single() as unknown as Promise<{ data: { id: string } | null }>,
        (supabase as any)
          .from("licenses")
          .select("id, status, expires_at")
          .or(`profile_id.eq.${profile.id},brand_id.eq.${brand.id}`)
          .in("status", ["active", "trial"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle() as unknown as Promise<{
          data: { id: string; status: string; expires_at: string | null } | null;
        }>,
      ]);

      const membership = membershipResult.data;
      const hasActiveLicense = licResult.data !== null;

      if (!membership) {
        url.pathname = "/login";
        url.searchParams.set("error", "no_brand_access");
        return NextResponse.redirect(url);
      }

      // ── License & onboarding gate ─────────────────────────────
      if (!hasActiveLicense) {
        url.pathname = "/license";
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
    // Match all routes except static files, _next, api, and landing page
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    // Skip the landing page — auth state is handled client-side via getAuthState()
    "/(?!\\(landing\\).*)",
  ],
};
