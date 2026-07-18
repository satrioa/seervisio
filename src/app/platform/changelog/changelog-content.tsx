"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  EyeOff,
  Archive,
  Trash2,
  Pencil,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ChangelogVersion, ChangelogStatus, ChangelogFilters } from "@/types/changelog";

const PAGE_SIZE = 15;

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  published: { label: "Published", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  scheduled: { label: "Scheduled", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  archived: { label: "Archived", color: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "version", label: "Version" },
  { value: "release_date", label: "Release Date" },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "bg-gray-500/10 text-gray-500" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

interface SummaryCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
}

function SummaryCard({ label, value, icon: Icon }: SummaryCardProps) {
  return (
    <Card className="flex items-center gap-4 p-4">
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="size-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </Card>
  );
}

export function ChangelogContent() {
  const router = useRouter();
  const [releases, setReleases] = React.useState<ChangelogVersion[]>([]);
  const [counts, setCounts] = React.useState<Record<string, number>>({
    total: 0, draft: 0, published: 0, scheduled: 0, archived: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [sort, setSort] = React.useState<string>("newest");
  const [page, setPage] = React.useState(1);
  const [deleteDialog, setDeleteDialog] = React.useState<{ id: string; title: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const mod = await import("@/server/actions/changelog.actions");
      const filters: ChangelogFilters = {};
      if (search.trim()) filters.search = search;
      if (statusFilter !== "all") filters.status = statusFilter as ChangelogStatus | "all";
      if (sort) filters.sort = sort as ChangelogFilters["sort"];

      const res = await mod.getChangelogsAction(filters);
      if (res.success) {
        setReleases(res.data.releases);
        setCounts(res.data.counts);
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sort]);

  React.useEffect(() => {
    load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sort]);

  const filtered = releases;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handlePublish(id: string) {
    const mod = await import("@/server/actions/changelog.actions");
    await mod.publishChangelogAction(id);
    load();
  }

  async function handleArchive(id: string) {
    const mod = await import("@/server/actions/changelog.actions");
    await mod.archiveChangelogAction(id);
    load();
  }

  async function handleDelete() {
    if (!deleteDialog) return;
    setDeleteLoading(true);
    try {
      const mod = await import("@/server/actions/changelog.actions");
      await mod.deleteChangelogDraftAction(deleteDialog.id);
      setDeleteDialog(null);
      load();
    } finally {
      setDeleteLoading(false);
    }
  }

  const latestVersion = releases.length > 0 ? releases[0].version : "-";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Changelog</h2>
          <p className="text-sm text-muted-foreground">Kelola seluruh pembaruan produk Seervisio.</p>
        </div>
        <Button onClick={() => router.push("/platform/changelog/new")}>
          <Plus className="mr-2 size-4" />
          Buat Release
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Release" value={counts.total} icon={FileText} />
        <SummaryCard label="Published" value={counts.published} icon={Sparkles} />
        <SummaryCard label="Draft" value={counts.draft} icon={Pencil} />
        <SummaryCard label="Latest Version" value={latestVersion} icon={Tag} />
      </div>

      {/* Search + Filter + Sort */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari versi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          {["all", "draft", "published", "scheduled", "archived"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {s === "all" ? "All" : STATUS_CONFIG[s]?.label ?? s}
            </button>
          ))}
        </div>

        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-9 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-3 size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Belum ada release</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Buat release pertama untuk mencatat pembaruan produk.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => router.push("/platform/changelog/new")}
            >
              <Plus className="mr-2 size-4" />
              Buat Release
            </Button>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Version</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[110px]">Release Date</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[80px] text-center">Highlights</TableHead>
                  <TableHead className="w-[100px]">Created By</TableHead>
                  <TableHead className="w-[100px]">Updated At</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((release) => (
                  <TableRow key={release.id} className="group">
                    <TableCell>
                      <span className="font-mono text-xs font-medium">{release.version}</span>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="text-left text-sm font-medium hover:underline"
                        onClick={() => router.push(`/platform/changelog/${release.id}/edit`)}
                      >
                        {release.title}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(release.releaseDate)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={release.status} />
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {release.items.length > 0 ? (
                        <span className="font-medium">{release.items.length}</span>
                      ) : (
                        <span className="text-muted-foreground/40">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(release as any).profiles?.name ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(release.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => router.push(`/platform/changelog/${release.id}/edit`)}
                          >
                            <Pencil className="mr-2 size-4" />
                            Edit
                          </DropdownMenuItem>
                          {release.status === "draft" && (
                            <DropdownMenuItem onClick={() => handlePublish(release.id)}>
                              <Eye className="mr-2 size-4" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          {release.status === "published" && (
                            <DropdownMenuItem onClick={() => handleArchive(release.id)}>
                              <EyeOff className="mr-2 size-4" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          {release.status === "archived" && (
                            <DropdownMenuItem onClick={() => handlePublish(release.id)}>
                              <Eye className="mr-2 size-4" />
                              Republish
                            </DropdownMenuItem>
                          )}
                          {release.status === "draft" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteDialog({ id: release.id, title: release.title })}
                              >
                                <Trash2 className="mr-2 size-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-2.5">
                <span className="text-[10px] text-muted-foreground">
                  {filtered.length} total
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-3.5" />
                  </Button>
                  <span className="min-w-[32px] text-center text-xs font-medium">
                    {page}/{totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteDialog} onOpenChange={(o) => !o && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Draft</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus draft &ldquo;{deleteDialog?.title}&rdquo;? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)} disabled={deleteLoading}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
