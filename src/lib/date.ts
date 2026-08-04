/**
 * Date formatting utilities.
 */

import { format } from "date-fns";
import { id } from "date-fns/locale";

/**
 * Format an activity timestamp into a human-friendly, scannable string.
 *
 * Rules (id-ID):
 *   < 60 sec            → "Baru saja"
 *   < 60 min            → "x menit yang lalu"
 *   < 24 hours          → "x jam yang lalu"
 *   Today               → "Hari ini • HH:mm"
 *   Yesterday           → "Kemarin • HH:mm"
 *   Same year           → "DD MMM • HH:mm"      (e.g. "20 Jul • 15:30")
 *   Older               → "DD MMM yyyy • HH:mm" (e.g. "20 Jul 2026 • 15:30")
 *
 * Falls back to "-" for empty/invalid input. Pure + memo-safe (no Date.now
 * captured at module load).
 */
export function formatActivityTime(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  const now = new Date();
  const diffSec = Math.round((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 0) {
    // Future timestamp (clock skew) — show absolute time.
    return `Hari ini • ${format(d, "HH:mm", { locale: id })}`;
  }
  if (diffSec < 60) return "Baru saja";
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return `${m} menit yang lalu`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return `${h} jam yang lalu`;
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (startOfDay.getTime() === startOfToday.getTime()) {
    return `Hari ini • ${format(d, "HH:mm", { locale: id })}`;
  }
  if (startOfDay.getTime() === startOfYesterday.getTime()) {
    return `Kemarin • ${format(d, "HH:mm", { locale: id })}`;
  }

  const sameYear = d.getFullYear() === now.getFullYear();
  return `${format(d, "dd MMM", { locale: id })} • ${format(d, "HH:mm", { locale: id })}${
    sameYear ? "" : ` ${d.getFullYear()}`
  }`;
}

/**
 * Format a date string or Date to "id-ID" locale.
 * Example: "2026-01-15" → "15 Januari 2026"
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

/**
 * Format date with time.
 * Example: "2026-01-15T10:30:00" → "15 Januari 2026 pukul 10:30"
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Format date for ISO storage (YYYY-MM-DD).
 */
export function formatISODate(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

/**
 * Get the current timestamp for database operations.
 */
export function now(): string {
  return new Date().toISOString();
}
