"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type CustomerMock,
  MOCK_CUSTOMERS,
  formatCurrency,
  hasActiveWarranty,
} from "@/components/customers/customer-data";
import { CustomerDetailModal } from "@/components/customers/customer-detail-modal";

/* ─── Page ─── */

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [warrantyFilter, setWarrantyFilter] = useState<string>("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [sortField, setSortField] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filtered + sorted customers
  const filteredCustomers = useMemo(() => {
    let list = [...MOCK_CUSTOMERS];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(searchQuery),
      );
    }

    // Branch filter (simulated via brandId for mock)
    if (branchFilter !== "all") {
      list = list.filter((c) => c.brandId === Number(branchFilter));
    }

    // Warranty filter
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
          cmp = a.phone.localeCompare(b.phone);
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
  }, [searchQuery, branchFilter, warrantyFilter, sortField, sortDir]);

  React.useEffect(() => {
    setPage(1);
  }, [searchQuery, branchFilter, warrantyFilter, sortField, sortDir, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedCustomers = filteredCustomers.slice(
    startIndex,
    startIndex + pageSize,
  );

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const openDetail = (id: string) => {
    setSelectedCustomerId(id);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Customers
        </h1>
        <p className="text-xs text-muted-foreground">
          Kelola data pelanggan, riwayat servis, total spend, dan garansi.
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari nama atau nomor HP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-8 text-xs"
          />
        </div>
        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="h-9 w-[130px] text-xs">
            <Filter className="size-3" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Semua Cabang</SelectItem>
            <SelectItem value="1" className="text-xs">Semarang Pusat</SelectItem>
            <SelectItem value="2" className="text-xs">Sragen</SelectItem>
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

        {filteredCustomers.length === 0 ? (
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
            <button key={customer.id} type="button" onClick={() => openDetail(customer.id)} className="grid w-full grid-cols-[1fr_120px_100px_80px_120px_80px_40px] gap-2 border-b px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-muted/20">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="size-3.5 text-primary" />
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-medium text-foreground">{customer.name}</span>
                  {customer.email && <span className="truncate text-[9px] text-muted-foreground">{customer.email}</span>}
                </div>
              </div>
              <div className="flex items-center text-xs text-muted-foreground">{customer.phone}</div>
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

        <div className="flex items-center justify-end gap-2 border-t bg-card px-3 py-2.5">
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

      {/* Mobile Card List */}
      <div className="space-y-2 md:hidden">
        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <User className="mx-auto size-8 text-muted-foreground/30" />
            <p className="mt-2 text-xs text-muted-foreground">Tidak ada pelanggan ditemukan</p>
            {searchQuery && (
              <Button variant="link" size="sm" className="h-6 text-[10px]" onClick={() => setSearchQuery("")}>Hapus pencarian</Button>
            )}
          </div>
        ) : (
          paginatedCustomers.map((customer) => (
            <button key={customer.id} type="button" onClick={() => openDetail(customer.id)} className="w-full rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/20">
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
                    <span>{customer.phone}</span>
                    <span>{formatCurrency(customer.totalSpend)}</span>
                    <span>{customer.totalServices} servis</span>
                    <span>{customer.lastServiceAt ? new Date(customer.lastServiceAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "—"}</span>
                  </div>
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
      <CustomerDetailModal
        customerId={selectedCustomerId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
