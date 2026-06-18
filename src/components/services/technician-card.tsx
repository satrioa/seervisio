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
        bg-white p-2
        shadow-[0_2px_16px_rgba(0,0,0,0.06)]
        transition-all duration-300 ease-out
        hover:shadow-[0_8px_30px_rgba(0,0,0,0.10)]
        hover:-translate-y-1
        ${onClick ? "cursor-pointer" : ""}
      `}
      style={{ borderRadius: 64 }}
    >
      {/* ── Photo + Crown Badge ── */}
      <div className="relative mb-3 w-full px-1">
        <div
          className="relative mx-auto w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 transition-transform duration-300 group-hover:scale-[1.03]"
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
              <span className="text-4xl font-bold text-gray-400">
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
      <h3 className="mt-0.5 text-center text-base font-bold leading-snug text-gray-900 line-clamp-1">
        {name}
      </h3>

      {/* ── Branch pill ── */}
      <span className="mt-1.5 inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] font-medium text-gray-500">
        {branchName}
      </span>

      {/* ── Revenue Section ── */}
      <div className="mt-4 flex flex-col items-center">
        <span className="text-xs font-semibold text-gray-700">
          Revenue Bulan ini
        </span>
        <span className="mt-0.5 text-lg font-bold tabular-nums text-emerald-500">
          {formatCurrency(revenue)}
        </span>
      </div>

      {/* ── Stat Boxes: Selesai & Aktif ── */}
      <div className="mt-3 grid w-full grid-cols-2 gap-2">
        <div className="flex flex-col items-center rounded-xl bg-gray-50/80 py-2.5 transition-colors group-hover:bg-gray-100/70">
          <span className="text-xl font-bold tabular-nums text-gray-900">
            {completedCount}
          </span>
          <span className="text-[11px] text-gray-400">Selesai</span>
        </div>
        <div className="flex flex-col items-center rounded-xl bg-gray-50/80 py-2.5 transition-colors group-hover:bg-gray-100/70">
          <span className="text-xl font-bold tabular-nums text-gray-900">
            {activeCount}
          </span>
          <span className="text-[11px] text-gray-400">Aktif</span>
        </div>
      </div>

      {/* ── Duration Box ── */}
      <div className="mt-2 w-full rounded-xl bg-gray-50/80 py-2.5 text-center transition-colors group-hover:bg-gray-100/70">
        <span className="block text-base font-bold text-gray-900">
          {formatDuration(avgDurationHours)}
        </span>
        <span className="text-[11px] text-gray-400">Durasi rata-rata</span>
      </div>
    </div>
  );
}
