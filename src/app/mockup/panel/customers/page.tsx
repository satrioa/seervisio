"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  User,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveBranch } from "@/components/layout/active-branch-context";
import { listCustomersAction, type CustomerListItem } from "@/server/actions/customer.actions";
import { can } from "@/lib/permissions/can";
import { PERMISSIONS } from "@/lib/permissions/permissions";

function formatCurrency(amount: number): string {
  return "Rp" + amount.toLocaleString("id-ID");
}

export default function CustomersPage() {
  const params = useParams();
  const brandSlug = params?.brandSlug as string;
  const { userRole, branches } = useActiveBranch();
  const canView = can(userRole as any, PERMISSIONS.CUSTOMER_VIEW);

  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("**ALL_BRANCHES**");
  const [warrantyFilter, setWarrantyFilter] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchCustomers = React.useCallback(async () => {
    if (!brandSlug) return;
    setLoading(true);
    setError(null);
    try {
      const branchParam = branchFilter !== "**ALL_BRANCHES**" ? branchFilter : null;
      const result = await listCustomersAction(brandSlug, branchParam, searchQuery || undefined);
      if (result.success) {
        setCustomers(result.data);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message ?? "Gagal memuat data.");
    }
    setLoading(false);
  }, [brandSlug, branchFilter, searchQuery]);

  React.useEffect(() => {
    void fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = useMemo(() => {
    let list = [...customers];

    // Warranty filter (applied client-side on already-fetched data)
    if (warrantyFilter === "active") {
      list = list.filter((c) => c.activeWarranties > 0);
    } else if (warrantyFilter === "no") {
      list = list.filter((c) => c.activeWarranties === 0);
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "phone":
          cmp = (a.phone ?? "").localeCompare(b.phone ?? "");
          break;
        case "totalSpend":
          cmp = a.totalSpend - b.totalSpend;
          break;
        case "totalServices":
          cmp = a.totalServices - b.totalServices;
          break;
        case "lastServiceAt":
          cmp = (a.lastServiceAt ?? "").localeCompare(b.lastServiceAt ?? "");
          break;
        default:
          cmp = a.name.localeCompare(b.name);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [customers, warrantyFilter, sortField, sortDir]);

  React.useEffect(() => {
    setPage(1);
  }, [searchQuery, branchFilter, warrantyFilter, sortField, sortDir, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + pageSize);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const openDetail = (customer: CustomerListItem) => {
    setSelectedCustomer(customer);
    setDetailOpen(true);
  };

  if (!canView) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <User className="size-10 text-muted-foreground/40" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">Akses Ditolak</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Anda tidak memiliki izin untuk melihat data pelanggan.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Customers
          </h1>
          <p className="text-xs text-muted-foreground">
            Kelola data pelanggan, riwayat servis, dan total spend.
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={fetchCustomers} disabled={loading}>
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari nama, nomor HP, atau email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 text-xs"
          />
        </div>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="h-9 w-[160px] text-xs">
            <Filter className="size-3" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="**ALL_BRANCHES**" className="text-xs">Semua Cabang</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={warrantyFilter} onValueChange={setWarrantyFilter}>
          <SelectTrigger className="h-9 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Semua Status</SelectItem>
            <SelectItem value="active" className="text-xs">Garansi Aktif</SelectItem>
            <SelectItem value="no" className="text-xs">Tanpa Garansi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Gagal memuat data</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Data Table - Desktop */}
      <div className="hidden md:block overflow-x-auto rounded-lg border bg-card">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_120px_100px_80px_120px_80px_40px] gap-2 border-b bg-muted/50 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <button type="button" onClick={() => handleSort("name")} className="flex items-center gap-1 text-left">
            Pelanggan
            {sortField === "name" && (sortDir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
          </button>
          <button type="button" onClick={() => handleSort("phone")} className="flex items-center gap-1 text-left">
            No. HP
            {sortField === "phone" && (sortDir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
          </button>
          <button type="button" onClick={() => handleSort("totalSpend")} className="flex items-center gap-1 text-right">
            Total Spend
            {sortField === "totalSpend" && (sortDir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
          </button>
          <button type="button" onClick={() => handleSort("totalServices")} className="flex items-center gap-1 text-center">
            Servis
            {sortField === "totalServices" && (sortDir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
          </button>
          <button type="button" onClick={() => handleSort("lastServiceAt")} className="flex items-center gap-1 text-left">
            Terakhir
            {sortField === "lastServiceAt" && (sortDir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
          </button>
          <span className="text-center">Garansi</span>
          <span />
        </div>

        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-none" />
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <User className="mx-auto size-8 text-muted-foreground/30" />
              <p className="mt-2 text-xs text-muted-foreground">Tidak ada pelanggan ditemukan</p>
              {searchQuery && (
                <Button variant="link" size="sm" className="h-6 text-[10px]" onClick={() => setSearchQuery("")}>Hapus pencarian</Button>
              )}
            </div>
          </div>
        ) : (
          paginatedCustomers.map((customer) => (
            <button key={customer.id} type="button" onClick={() => openDetail(customer)} className="grid w-full grid-cols-[1fr_120px_100px_80px_120px_80px_40px] gap-2 border-b px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-muted/20">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="size-3.5 text-primary" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-medium text-foreground">{customer.name}</span>
                  {customer.email && <span className="truncate text-[9px] text-muted-foreground">{customer.email}</span>}
                  {customer.branchNames.length > 0 && (
                    <span className="truncate text-[9px] text-muted-foreground/60">
                      {customer.branchNames.join(", ")}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center text-xs text-muted-foreground">{customer.phone ?? "—"}</div>
              <div className="flex items-center justify-end text-xs font-medium tabular-nums text-foreground">{formatCurrency(customer.totalSpend)}</div>
              <div className="flex items-center justify-center"><span className="text-xs tabular-nums text-foreground">{customer.totalServices}</span></div>
              <div className="flex items-center text-[10px] text-muted-foreground">{customer.lastServiceAt ? new Date(customer.lastServiceAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—"}</div>
              <div className="flex items-center justify-center">
                {customer.activeWarranties > 0 ? (
                  <Badge variant="outline" className="border-green-200 bg-green-50 text-[9px] text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">{customer.activeWarranties}</Badge>
                ) : (
                  <span className="text-[10px] text-muted-foreground/50">—</span>
                )}
              </div>
              <div className="flex items-center justify-center"><ChevronDown className="size-3.5 -rotate-90 text-muted-foreground/50" /></div>
            </button>
          ))
        )}

        <div className="flex items-center justify-between gap-2 border-t bg-card px-3 py-2.5">
          <span className="text-[10px] text-muted-foreground">
            {!loading && `${filteredCustomers.length} pelanggan`}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Rows</span>
            <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="h-8 w-[72px] rounded-lg text-xs"><SelectValue /></SelectTrigger>
              <SelectContent align="end">
                {[10, 20, 50].map((size) => (<SelectItem key={size} value={String(size)} className="text-xs">{size}</SelectItem>))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" className="size-8 rounded-lg" onClick={() => setPage((c) => Math.max(1, c - 1))} disabled={safePage === 1}><ChevronLeft className="size-4" /></Button>
            <Button type="button" size="sm" className="h-8 min-w-8 rounded-lg px-2 text-xs">{safePage}</Button>
            <Button type="button" variant="outline" size="icon" className="size-8 rounded-lg" onClick={() => setPage((c) => Math.min(pageCount, c + 1))} disabled={safePage === pageCount}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      </div>

      {/* Mobile Card List */}
      <div className="space-y-2 md:hidden">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <User className="mx-auto size-8 text-muted-foreground/30" />
            <p className="mt-2 text-xs text-muted-foreground">Tidak ada pelanggan ditemukan</p>
            {searchQuery && (
              <Button variant="link" size="sm" className="h-6 text-[10px]" onClick={() => setSearchQuery("")}>Hapus pencarian</Button>
            )}
          </div>
        ) : (
          paginatedCustomers.map((customer) => (
            <button key={customer.id} type="button" onClick={() => openDetail(customer)} className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="size-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{customer.name}</span>
                    {customer.activeWarranties > 0 ? (
                      <Badge variant="outline" className="ml-2 shrink-0 border-green-200 bg-green-50 text-[9px] text-green-700">{customer.activeWarranties}</Badge>
                    ) : null}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{customer.phone ?? "—"}</span>
                    <span>{formatCurrency(customer.totalSpend)}</span>
                    <span>{customer.totalServices} servis</span>
                    <span>{customer.lastServiceAt ? new Date(customer.lastServiceAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "—"}</span>
                  </div>
                  {customer.branchNames.length > 0 && (
                    <div className="mt-0.5 text-[10px] text-muted-foreground/60">
                      {customer.branchNames.join(", ")}
                    </div>
                  )}
                </div>
                <ChevronDown className="size-4 -rotate-90 shrink-0 text-muted-foreground/50" />
              </div>
            </button>
          ))
        )}
        <div className="flex items-center justify-between gap-2 px-1 py-2">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Rows</span>
            <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="h-8 w-[64px] rounded-lg text-xs"><SelectValue /></SelectTrigger>
              <SelectContent align="end">
                {[10, 20, 50].map((size) => (<SelectItem key={size} value={String(size)} className="text-xs">{size}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8 rounded-lg" onClick={() => setPage((c) => Math.max(1, c - 1))} disabled={safePage === 1}><ChevronLeft className="size-4" /></Button>
            <Button size="sm" className="h-8 min-w-8 rounded-lg px-2 text-xs">{safePage}</Button>
            <Button variant="outline" size="icon" className="size-8 rounded-lg" onClick={() => setPage((c) => Math.min(pageCount, c + 1))} disabled={safePage === pageCount}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      )}
    </div>
  );
}

/* ─── Detail Modal ─── */

function CustomerDetailModal({
  customer,
  open,
  onOpenChange,
}: {
  customer: CustomerListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${open ? "" : "pointer-events-none invisible"}`}
    >
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative z-50 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border bg-card p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
              <User className="size-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{customer.name}</h2>
              <p className="text-xs text-muted-foreground">
                {customer.phone}
                {customer.email && ` · ${customer.email}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {customer.address && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <svg className="size-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span>{customer.address}</span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-green-500">
              <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[10px] text-muted-foreground">Total Spend</span>
              <span className="truncate text-sm font-semibold tabular-nums text-foreground">{formatCurrency(customer.totalSpend)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-500">
              <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.58 5.58L3 18.16l5.58-5.58M15.17 11.42l5.58-5.58L18.16 3l-5.58 5.58M9 21h12M9 3h12" />
              </svg>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[10px] text-muted-foreground">Total Servis</span>
              <span className="truncate text-sm font-semibold tabular-nums text-foreground">{customer.totalServices}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500">
              <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[10px] text-muted-foreground">Servis Aktif</span>
              <span className="truncate text-sm font-semibold tabular-nums text-foreground">{customer.activeServices}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-purple-500">
              <svg className="size-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-[10px] text-muted-foreground">Garansi Aktif</span>
              <span className="truncate text-sm font-semibold tabular-nums text-foreground">{customer.activeWarranties}</span>
            </div>
          </div>
        </div>

        {customer.branchNames.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-2 text-xs font-semibold text-foreground">Cabang</h4>
            <div className="flex flex-wrap gap-1.5">
              {customer.branchNames.map((name) => (
                <Badge key={name} variant="secondary" className="text-[10px]">{name}</Badge>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}
