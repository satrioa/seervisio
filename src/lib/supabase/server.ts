import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

export async function createServerSupabase() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const authCookies = allCookies.filter((c) => c.name.startsWith("sb-"));

  console.log("[createServerSupabase] cookies:", {
    total: allCookies.length,
    authCookieNames: authCookies.map((c) => c.name),
    authCookiePreview: authCookies.map((c) => ({
      name: c.name,
      valuePrefix: c.value.substring(0, 20) + "...",
      valueLength: c.value.length,
    })),
  });

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always set cookies.
            // Middleware should refresh the session instead.
          }
        },
      },
    }
  );
}