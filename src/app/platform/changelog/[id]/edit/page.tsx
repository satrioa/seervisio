import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { ROLES } from "@/lib/permissions/roles";
import { getRelease } from "@/server/repositories/changelog.repository";
import { EditChangelogClient } from "./edit-changelog-client";

export const dynamic = "force-dynamic";

export default async function EditChangelogPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
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

  try {
    const release = await getRelease(id);
    if (!release) {
      return (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-muted-foreground">Release tidak ditemukan.</p>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Edit Release</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Perbarui informasi release {release.version}.
          </p>
        </div>
        <EditChangelogClient release={release} />
      </div>
    );
  } catch (err: any) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-destructive">Gagal memuat data: {err.message}</p>
      </div>
    );
  }
}
