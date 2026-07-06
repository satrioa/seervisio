"use client";

import * as React from "react";
import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  MoreHorizontal,
  Ban,
  Package,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  getSubscriptionsListAction,
  updateSubscriptionStatusAction,
  getPackagesListAction,
  changeSubscriptionPackageAction,
} from "@/server/actions/subscription.actions";
import type { SubscriptionRow, PackageRow } from "@/server/repositories/platform.repository";
import { ChangePackageDialog } from "./change-package-dialog";

const PAGE_SIZE = 20;
const STATUS_OPTIONS = ["all", "active", "expired", "cancelled", "trial"] as const;

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active": return "default";
    case "expired":
    case "cancelled": return "destructive";
    case "trial": return "secondary";
    default: return "outline";
  }
}

export function SubscriptionsContent() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [changePkgSub, setChangePkgSub] = useState<SubscriptionRow | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await getSubscriptionsListAction();
    if (res.success) setSubscriptions(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    let result = subscriptions;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.brandName.toLowerCase().includes(q) ||
          s.plan.toLowerCase().includes(q) ||
          (s.packageName ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((s) => s.status === statusFilter);
    }
    return result;
  }, [subscriptions, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [searchQuery, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Subscriptions
        </h2>
        <p className="text-sm text-muted-foreground">
          Daftar langganan seluruh brand
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari brand, paket..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[130px] text-xs">
              <Filter className="size-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s} className="text-xs capitalize">
                  {s === "all" ? "Semua Status" : s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CreditCard className="mb-3 size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Tidak ada subscription ditemukan</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Brand</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Expire Date</TableHead>
                  <TableHead className="text-center">Max Branches</TableHead>
                  <TableHead className="text-center">Max Users</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <span className="text-xs font-medium text-foreground">{sub.brandName}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {sub.plan}
                        </Badge>
                        {sub.packageName && sub.packageName !== sub.plan && (
                          <span className="text-[10px] text-muted-foreground">
                            ({sub.packageName})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(sub.status)} className="text-[10px] capitalize">
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {new Date(sub.startedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "text-xs",
                        sub.expiresAt
                          ? new Date(sub.expiresAt) < new Date()
                            ? "text-destructive"
                            : "text-muted-foreground"
                          : "text-muted-foreground/50"
                      )}>
                        {sub.expiresAt
                          ? new Date(sub.expiresAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs tabular-nums">{sub.maxBranches}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs tabular-nums">{sub.maxUsers}</span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() => setChangePkgSub(sub)}
                          >
                            <Package className="mr-2 size-4" /> Change Package
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {sub.status === "active" || sub.status === "trial" ? (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={async () => {
                                if (!confirm("Nonaktifkan subscription ini?")) return;
                                await updateSubscriptionStatusAction(sub.id, "cancelled");
                                loadData();
                              }}
                            >
                              <Ban className="mr-2 size-4" /> Inactive
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-emerald-600"
                              onClick={async () => {
                                if (!confirm("Aktifkan kembali subscription ini?")) return;
                                await updateSubscriptionStatusAction(sub.id, "active");
                                loadData();
                              }}
                            >
                              <Ban className="mr-2 size-4" /> Activate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-end gap-2 border-t px-3 py-2.5">
                <span className="text-[10px] text-muted-foreground">
                  {filtered.length} total
                </span>
                <Button variant="outline" size="icon" className="size-8 rounded-lg"
                  onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button size="sm" className="h-8 min-w-8 rounded-lg px-2 text-xs">{page}</Button>
                <Button variant="outline" size="icon" className="size-8 rounded-lg"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {changePkgSub && (
        <ChangePackageDialog
          open
          onOpenChange={(open) => { if (!open) setChangePkgSub(null); }}
          subscription={changePkgSub}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
