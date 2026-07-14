import React, { Suspense } from "react";
import { PlatformLoginForm } from "./platform-login-form";

export default function PlatformLoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <PlatformLoginForm />
    </Suspense>
  );
}
