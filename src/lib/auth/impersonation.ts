import { cookies } from "next/headers";

const IMPERSONATION_COOKIE = "seervis_impersonating_brand";

export async function setImpersonationCookie(brandSlug: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_COOKIE, brandSlug, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });
}

export async function getImpersonationCookie(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(IMPERSONATION_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

export async function clearImpersonationCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATION_COOKIE);
}
