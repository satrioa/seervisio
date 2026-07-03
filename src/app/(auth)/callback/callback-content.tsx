"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { handleGoogleCallbackAction } from "@/server/actions/auth.actions";

export function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Memproses autentikasi...");

  useEffect(() => {
    async function handleCallback() {
      const supabase = createClient();

      const code = searchParams.get("code");
      const next = searchParams.get("next") ?? "/";

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setStatus("error");
          setMessage(error.message);
          return;
        }

        // Handle Google OAuth callback — creates profile/brand/branch for new users
        const result = await handleGoogleCallbackAction(code);
        if (!result.success) {
          setStatus("error");
          setMessage("Failed to set up your account.");
          return;
        }

        setStatus("success");
        setMessage("Autentikasi berhasil! Mengarahkan...");

        setTimeout(() => {
          router.push(result.data.redirectTo);
          router.refresh();
        }, 500);
      } else {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setStatus("success");
          setMessage("Sudah masuk. Mengarahkan...");

          setTimeout(() => {
            router.push(next);
            router.refresh();
          }, 500);
        } else {
          setStatus("error");
          setMessage("Tidak ada kode autentikasi.");
        }
      }
    }

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        {status === "processing" && (
          <div className="space-y-4">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">{message}</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-muted-foreground">{message}</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-destructive font-medium">{message}</p>
            <button
              onClick={() => router.push("/login")}
              className="text-sm text-primary hover:underline"
            >
              Kembali ke halaman masuk
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
