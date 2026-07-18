import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ROLES } from "@/lib/permissions/roles";
import { ChangelogForm } from "../_components/changelog-form";

export const dynamic = "force-dynamic";

export default async function NewChangelogPage() {
  const auth = await getCurrentUser();
  if (!auth.user) redirect("/platform/login");

  const isPlatformOwner = auth.user.memberships.some(
    (m) => m.role === ROLES.PLATFORM_OWNER,
  );
  if (!isPlatformOwner) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">Akses ditolak. Hanya Platform Owner.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Buat Release Baru</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Catat pembaruan produk terbaru untuk pengguna Seervisio.
        </p>
      </div>
      <ChangelogForm />
    </div>
  );
}
