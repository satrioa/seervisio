"use client";

import * as React from "react";
import { useEffect, useState, useCallback } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Terminal,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  getSystemLogsAction,
} from "@/server/actions/platform-monitoring.actions";

const PAGE_SIZE = 25;

const ACTION_LABELS: Record<string, string> = {
  PLATFORM_LOGIN: "Platform Login",
  PLATFORM_IMPERSONATE: "Impersonation",
  PLATFORM_OWNER_CREATED: "Owner Created",
  FACTORY_RESET: "Factory Reset",
  EXPORT_FULL_BACKUP: "Full Backup Export",
  BRAND_CREATED: "Brand Created",
  SUBSCRIPTION_CHANGED: "Subscription Changed",
  SUBSCRIPTION_UPDATED: "Subscription Updated",
  SETTING_UPDATED: "Setting Updated",
  BRAND_PROFILE_UPDATED: "Brand Profile Updated",
};

function actionSeverity(action: string): "default" | "secondary" | "destructive" | "outline" {
  const critical = ["FACTORY_RESET", "PLATFORM_OWNER_CREATED"];
  const warning = ["PLATFORM_IMPERSONATE", "SUBSCRIPTION_CHANGED", "SUBSCRIPTION_UPDATED"];
  if (critical.includes(action)) return "destructive";
  if (warning.includes(action)) return "secondary";
  return "default";
}

export function SystemLogsContent() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await getSystemLogsAction(
      page,
      PAGE_SIZE,
      searchQuery || undefined,
    );
    if (res.success) {
      setLogs(res.data.logs);
      setTotal(res.data.total);
    }
    setLoading(false);
  }, [page, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          System Logs
        </h2>
        <p className="text-sm text-muted-foreground">
          Log aktivitas tingkat platform dan sistem
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="relative min-w-0 flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari action, deskripsi, actor..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="h-9 pl-8 text-xs"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
        {loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Terminal className="mb-3 size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">No system logs found</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              {searchQuery
                ? "Try a different search term"
                : "System logs will appear here when platform-level actions are performed"}
            </p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge
                        variant={actionSeverity(log.action)}
                        className="text-[10px] capitalize"
                      >
                        {ACTION_LABELS[log.action] ?? log.action.replace(/_/g, " ").toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {log.description || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-foreground">
                          {log.actorName || "-"}
                        </p>
                        {log.actorRole && (
                          <p className="truncate text-[10px] text-muted-foreground">
                            {log.actorRole}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-3 py-2.5">
                <span className="text-[10px] text-muted-foreground">
                  {total} total
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 rounded-lg"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 min-w-8 rounded-lg px-2 text-xs"
                  >
                    {page}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 rounded-lg"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
