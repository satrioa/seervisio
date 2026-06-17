"use client";

import AccountsPageClient from "@/app/[brandSlug]/panel/accounts/accounts-page-client";
import { hasPermission } from "@/lib/permissions/require-permission";
import { useUserSession } from "@/hooks/useUserSession"; // assume this hook exists

export default function AccountsPage() {
  const { role } = useUserSession();
  const canManage = hasPermission(role, "user.manage");

  if (!canManage) {
    return (
      <div className="flex h-full items-center justify-center">
        <h1 className="text-xl font-medium text-muted-foreground">Forbidden</h1>
      </div>
    );
  }

  return <AccountsPageClient />;
}
