import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ROLES } from "@/lib/permissions/roles";
import { PlatformLayoutClient } from "./platform-layout-client";

interface PlatformLayoutProps {
  children: React.ReactNode;
}

export default async function PlatformLayout({ children }: PlatformLayoutProps) {
  const authResult = await getCurrentUser();

  if (!authResult.user) {
    redirect("/platform/login");
  }

  const isPlatformOwner = authResult.user.memberships.some(
    (m) => m.role === ROLES.PLATFORM_OWNER
  );

  if (!isPlatformOwner) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Akses ditolak</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hanya Platform Owner yang dapat mengakses panel ini.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PlatformLayoutClient
      userName={authResult.user.name}
      userEmail={authResult.user.email}
    >
      {children}
    </PlatformLayoutClient>
  );
}
