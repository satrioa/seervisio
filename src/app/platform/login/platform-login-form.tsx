"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, Eye, EyeOff, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createClient } from "@/lib/supabase/client";
import { updateLastLoginAt } from "@/repositories/profile.repository";
import { motion } from "framer-motion";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Invalid email or password.",
  unknown: "An unexpected error occurred. Please try again.",
};

export function PlatformLoginForm() {
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

      await updateLastLoginAt(supabase, data.user.id);
      window.location.href = redirectTo || "/platform/dashboard";
    } catch {
      setError(ERROR_MESSAGES.unknown);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="rounded-2xl border border-border/50 bg-card p-8 shadow-lg">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <Terminal className="h-6 w-6 text-primary" />
            </div>
            <h1 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
              Platform Access
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Internal staff sign in
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Email/Password form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="platform-email">Email</Label>
              <Input
                id="platform-email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isLoading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="platform-password">Password</Label>
              <div className="relative">
                <Input
                  id="platform-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="h-11 w-full text-sm font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
