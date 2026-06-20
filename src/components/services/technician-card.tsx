"use client";

import * as React from "react";
import { Crown } from "lucide-react";

/* ── Types ── */
export interface TechnicianCardProps {
  /** Rank position (1-based). Ranks 1–3 show a crown badge. */
  rank: number;
  /** Technician display name */
  name: string;
  /** Branch / store name shown as a pill */
  branchName: string;
  /** Avatar image URL (optional) */
  avatarUrl?: string | null;
  /** Revenue amount for the current period (raw number) */
  revenue: number;
  /** Number of completed services */
  completedCount: number;
  /** Number of active / in-progress services */
  activeCount: number;
  /** Average service duration in hours (null = no data) */
  avgDurationHours: number | null;
  /** Optional click handler for the entire card */
  onClick?: () => void;
}

/* ── Helpers ── */

function formatCurrency(amount: number): string {
  return "Rp " + amount.toLocaleString("id-ID");
}

function formatDuration(hours: number | null): string {
  if (hours === null) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours % 1) * 60);
  if (h === 0) return `${m} Menit`;
  return `${h} Jam ${m} Menit`;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* ── Component ── */

export function TechnicianCard({
  rank,
  name,
  branchName,
  avatarUrl,
  revenue,
  completedCount,
  activeCount,
  avgDurationHours,
  onClick,
}: TechnicianCardProps) {
  const isTopRank = rank <= 3;

  return (
    <div
      onClick={onClick}
      className={`
        group relative flex w-[224px] shrink-0 flex-col items-center
        border border-border/60 bg-card p-2 text-card-foreground
        shadow-[0_2px_16px_rgba(15,23,42,0.06)]
        transition-all duration-300 ease-out
        hover:border-border hover:shadow-[0_8px_30px_rgba(15,23,42,0.10)]
        dark:border-white/10 dark:bg-card dark:shadow-black/20 dark:hover:border-white/15 dark:hover:shadow-black/30
        hover:-translate-y-1
        ${onClick ? "cursor-pointer" : ""}
      `}
      style={{ borderRadius: 64 }}
    >
      {/* ── Photo + Crown Badge ── */}
      <div className="relative mb-3 w-full px-1">
        <div
          className="relative mx-auto w-full overflow-hidden bg-gradient-to-br from-muted to-muted/70 transition-transform duration-300 group-hover:scale-[1.03] dark:from-muted/40 dark:to-muted/20"
          style={{ aspectRatio: '1 / 1', borderRadius: 60 }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-4xl font-bold text-muted-foreground/70">
                {getInitials(name)}
              </span>
            </div>
          )}
        </div>

        {/* Crown badge for top 3 */}
        {isTopRank && (
          <div className="absolute right-2 top-0 flex size-8 items-center justify-center rounded-full bg-amber-400 shadow-md shadow-amber-200/60 transition-transform duration-300 group-hover:scale-110">
            <Crown className="size-4 fill-white text-white" />
          </div>
        )}
      </div>

      {/* ── Rank ── */}
      <span className="text-xs font-bold text-primary">#{rank}</span>

        {/* ── Name ── */}
      <h3 className="mt-0.5 text-center text-base font-bold leading-snug text-foreground line-clamp-1">
        {name}
      </h3>

      {/* ── Branch pill ── */}
      <span className="mt-1.5 inline-flex items-center rounded-full border border-border bg-muted/55 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground dark:bg-muted/25">
        {branchName}
      </span>

      {/* ── Revenue Section ── */}
      <div className="mt-4 flex flex-col items-center">
        <span className="text-xs font-semibold text-muted-foreground">
          Revenue Bulan ini
        </span>
        <span className="mt-0.5 text-lg font-bold tabular-nums text-emerald-500">
          {formatCurrency(revenue)}
        </span>
      </div>

      {/* ── Stat Boxes: Selesai & Aktif ── */}
      <div className="mt-3 grid w-full grid-cols-2 gap-2">
        <div className="flex flex-col items-center rounded-xl border border-border/50 bg-muted/45 py-2.5 transition-colors group-hover:bg-muted/70 dark:bg-muted/20 dark:group-hover:bg-muted/30">
          <span className="text-xl font-bold tabular-nums text-foreground">
            {completedCount}
          </span>
          <span className="text-[11px] text-muted-foreground">Selesai</span>
        </div>
        <div className="flex flex-col items-center rounded-xl border border-border/50 bg-muted/45 py-2.5 transition-colors group-hover:bg-muted/70 dark:bg-muted/20 dark:group-hover:bg-muted/30">
          <span className="text-xl font-bold tabular-nums text-foreground">
            {activeCount}
          </span>
          <span className="text-[11px] text-muted-foreground">Aktif</span>
        </div>
      </div>

      {/* ── Duration Box ── */}
      <div className="mt-2 w-full rounded-xl border border-border/50 bg-muted/45 py-2.5 text-center transition-colors group-hover:bg-muted/70 dark:bg-muted/20 dark:group-hover:bg-muted/30">
        <span className="block text-base font-bold text-foreground">
          {formatDuration(avgDurationHours)}
        </span>
        <span className="text-[11px] text-muted-foreground">Durasi rata-rata</span>
      </div>
    </div>
  );
}
