"use client";

import * as React from "react";
import { Loader2, Users, AlertTriangle } from "lucide-react";

import { useActiveBranch } from "@/components/layout/active-branch-context";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

import { can } from "@/lib/permissions/can";
import { PERMISSIONS } from "@/lib/permissions/permissions";
import { ROLE_LABELS } from "@/lib/permissions/roles";

import { listAccountsAction, type AccountRow } from "@/server/actions/account.actions";

function RoleBadge({ role }: { role: string }) {
  const label = ROLE_LABELS[role as keyof typeof ROLE_LABELS] || role;
  const colors: Record<string, string> = {
    PLATFORM_OWNER: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    MASTER_ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    FRONTLINER: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    TECHNICIAN: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${colors[role] || "bg-muted text-muted-foreground"}`}>
      {label}
    </span>
  );
}

export function AccountsPageClient({ brandSlug }: { brandSlug: string }) {
  const { userRole, branches } = useActiveBranch();
  const canManage = can(userRole as any, PERMISSIONS.USER_MANAGE);

  const [accounts, setAccounts] = React.useState<AccountRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchAccounts = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listAccountsAction(brandSlug);
    if (result.success) {
      setAccounts(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [brandSlug]);

  React.useEffect(() => { void fetchAccounts(); }, [fetchAccounts]);

  if (!canManage) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <Users className="size-10 text-muted-foreground/40" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Access Denied</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to manage accounts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const branchMap = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const b of branches) m.set(b.id, b.name);
    return m;
  }, [branches]);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader
        title="Accounts"
        breadcrumbs={[{ label: "Beranda", href: `/${brandSlug}/panel/dashboard` }, { label: "Accounts" }]}
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Gagal memuat data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ── Table ── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Users className="size-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Belum ada akun.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* ── Desktop header ── */}
              <div className="hidden min-w-[600px] grid-cols-[2fr_2fr_1fr_1fr_100px] gap-2 border-b bg-muted/50 px-4 py-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground md:grid">
                <span>Nama</span>
                <span>Email</span>
                <span>Role</span>
                <span>Cabang</span>
                <span>Status</span>
              </div>

              {accounts.map((account) => {
                const branchNames = account.branchIds.map((id) => branchMap.get(id)).filter(Boolean) as string[];
                const branchLabel = branchNames.length > 0
                  ? branchNames.slice(0, 2).join(", ") + (branchNames.length > 2 ? ` +${branchNames.length - 2}` : "")
                  : "—";

                return (
                  <div
                    key={account.id}
                    className="grid min-w-[600px] grid-cols-[2fr_2fr_1fr_1fr_100px] gap-2 border-b px-4 py-3 text-xs transition-colors last:border-0 hover:bg-muted/20 md:items-center"
                  >
                    {/* Mobile: full-width card-like layout */}
                    <div className="col-span-full flex flex-col gap-1.5 md:hidden">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">{account.name}</p>
                          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{account.email}</p>
                        </div>
                        {account.isActive ? (
                          <Badge variant="outline" className="shrink-0 rounded-full px-2 text-[10px] text-emerald-600">Aktif</Badge>
                        ) : (
                          <Badge variant="secondary" className="shrink-0 rounded-full px-2 text-[10px]">Nonaktif</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <RoleBadge role={account.role} />
                        <span className="text-[10px] text-muted-foreground">{branchLabel}</span>
                      </div>
                    </div>

                    {/* Desktop cells */}
                    <div className="hidden min-w-0 md:block">
                      <p className="truncate font-medium text-foreground">{account.name}</p>
                    </div>
                    <div className="hidden min-w-0 md:block">
                      <p className="truncate text-muted-foreground">{account.email}</p>
                    </div>
                    <div className="hidden md:block">
                      <RoleBadge role={account.role} />
                    </div>
                    <div className="hidden truncate text-muted-foreground md:block">
                      {branchLabel}
                    </div>
                    <div className="hidden md:block">
                      {account.isActive ? (
                        <Badge variant="outline" className="rounded-full px-2 text-[10px] text-emerald-600">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary" className="rounded-full px-2 text-[10px]">Nonaktif</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refresh */}
      {!loading && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={fetchAccounts}>
            <Loader2 className={`size-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      )}
    </div>
  );
}
