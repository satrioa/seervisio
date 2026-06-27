"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateLastLoginAt } from "@/repositories/profile.repository";
import { resolveLoginRedirectAction } from "@/server/actions/resolve-brand.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  account_disabled:
    "Akun Anda telah dinonaktifkan. Silakan hubungi administrator.",
  no_brand_access: "Anda tidak memiliki akses ke brand tersebut.",
  invalid_credentials: "Email atau password salah.",
  unknown: "Terjadi kesalahan. Silakan coba lagi.",
};

async function resolveRedirectTarget(redirectTo?: string | null): Promise<string> {
  if (redirectTo && redirectTo !== "/login" && redirectTo.startsWith("/")) {
    return redirectTo;
  }

  return resolveLoginRedirectAction();
}

export function LoginForm() {
  const searchParams = useSearchParams();

  const redirectTo = searchParams.get("redirect");
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const prefillEmail = searchParams.get("email");
    if (prefillEmail) {
      setEmail(decodeURIComponent(prefillEmail));
    }
  }, [searchParams]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam ? ERROR_MESSAGES[errorParam] ?? ERROR_MESSAGES.unknown : null
  );

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        const { data, error: authError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (authError) {
          console.error("Login error:", authError);
          setError(ERROR_MESSAGES.invalid_credentials);
          setIsLoading(false);
          return;
        }

        if (!data.session || !data.user) {
          console.error("Login returned without session/user:", data);
          setError(ERROR_MESSAGES.unknown);
          setIsLoading(false);
          return;
        }

        console.log("Login successful:", {
          id: data.user.id,
          email: data.user.email,
          hasSession: Boolean(data.session),
        });

        // Record last_login_at (non-blocking)
        updateLastLoginAt(supabase, data.user.id);

        // Resolve redirect target using current brand slug from DB
        const target = await resolveRedirectTarget(redirectTo);

        // Full reload supaya Server Components membaca session/cookie terbaru.
        window.location.href = target;
      } catch (err) {
        console.error("Unexpected login error:", err);
        setError(ERROR_MESSAGES.unknown);
        setIsLoading(false);
      }
    },
    [email, password, redirectTo]
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <Link href="/" className="mx-auto mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">
                S
              </span>
            </div>
          </Link>

          <CardTitle className="text-xl">Masuk ke Seervis</CardTitle>

          <CardDescription>
            Masukkan email dan password akun Anda
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Memproses..." : "Masuk"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}