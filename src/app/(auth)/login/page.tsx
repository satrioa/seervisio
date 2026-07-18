import React, { Suspense } from "react";
import { AuthPage } from "@/components/auth/auth-page";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <AuthPage />
    </Suspense>
  );
}
