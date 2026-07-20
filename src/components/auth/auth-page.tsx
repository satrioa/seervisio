"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, Eye, EyeOff, AtSignIcon, ChevronLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { updateLastLoginAt } from "@/repositories/profile.repository";
import { AppIcon } from "@/components/brand/app-icon";
import { FloatingPaths } from "@/components/floating-paths";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Invalid email or password.",
  unknown: "An unexpected error occurred. Please try again.",
};

export function AuthPage() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const errorParam = searchParams.get("error");

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(
    errorParam ? ERROR_MESSAGES[errorParam] ?? ERROR_MESSAGES.unknown : null,
  );

  React.useEffect(() => {
    const prefillEmail = searchParams.get("email");
    if (prefillEmail) {
      setEmail(decodeURIComponent(prefillEmail));
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(ERROR_MESSAGES.invalid_credentials);
        setIsLoading(false);
        return;
      }

      if (!data.session || !data.user) {
        setError(ERROR_MESSAGES.unknown);
        setIsLoading(false);
        return;
      }

      updateLastLoginAt(supabase, data.user.id);

      try {
        const { afterLoginRebindCheckoutAction } = await import(
          "@/server/actions/checkout.actions"
        );
        await afterLoginRebindCheckoutAction();
      } catch {
        /* non-fatal */
      }

      window.location.href = redirectTo || "/";
    } catch {
      setError(ERROR_MESSAGES.unknown);
      setIsLoading(false);
    }
  };

  return (
    <main className="relative md:h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
      {/* Left Brand Panel */}
      <div className="relative hidden h-full flex-col border-r bg-secondary p-10 lg:flex dark:bg-secondary/20">
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background" />
        <Link href="/" className="relative z-10 mr-auto">
          <AppIcon size={32} className="rounded-lg shadow-sm" />
        </Link>

        <div className="relative z-10 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-xl">
              &ldquo;Sebagai pemilik toko servis, Seervisio bener-bener ngebantu
              saya ngatur antrian dan laporan jadi lebih rapi. Pelanggan juga
              suka karena bisa pantau status servis langsung dari HP.&rdquo;
            </p>
            <footer className="font-mono font-semibold text-sm">
              ~ Rudi Hartono, Owner RudiTech
            </footer>
          </blockquote>
        </div>

        <div className="absolute inset-0">
          <FloatingPaths position={1} />
          <FloatingPaths position={-1} />
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="relative flex min-h-screen flex-col justify-center px-8">
        <div
          aria-hidden
          className="absolute inset-0 isolate -z-10 opacity-60 contain-strict"
        >
          <div className="absolute top-0 right-0 h-320 w-140 -translate-y-87.5 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)]" />
          <div className="absolute top-0 right-0 h-320 w-60 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="absolute top-0 right-0 h-320 w-60 -translate-y-87.5 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)]" />
        </div>

        <Button asChild className="absolute top-7 left-5" variant="ghost">
          <Link href="/">
            <ChevronLeftIcon data-icon="inline-start" />
            Beranda
          </Link>
        </Button>

        <div className="mx-auto w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <AppIcon size={40} className="rounded-xl shadow-sm lg:hidden" />
            <div>
              <h1 className="font-bold text-2xl tracking-wide">
                Masuk atau Daftar
              </h1>
              <p className="text-base text-muted-foreground">
                Kelola toko servis kamu dengan Seervisio
              </p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <InputGroup>
                <InputGroupInput
                  id="email"
                  type="email"
                  placeholder="nama@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
                <InputGroupAddon align="inline-start">
                  <AtSignIcon />
                </InputGroupAddon>
              </InputGroup>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Kata Sandi</Label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  Lupa kata sandi?
                </button>
              </div>
              <div className="relative">
                <InputGroup>
                  <InputGroupInput
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan kata sandi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                </InputGroup>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Masuk"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Belum punya akun?{" "}
            <Link
              href="/signup"
              className="font-medium text-foreground hover:text-primary transition-colors"
            >
              Daftar Sekarang
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
