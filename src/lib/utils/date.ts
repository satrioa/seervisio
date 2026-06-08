/**
 * Date formatting utilities for Indonesian locale.
 */

export function formatDateID(date: Date | string | null | undefined): string {
  if (!date) return "-";

  const d = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatDateTimeID(date: Date | string | null | undefined): string {
  if (!date) return "-";

  const d = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat("id-ID", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDurationMinutes(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "-";

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) return `${mins} menit`;
  if (mins === 0) return `${hours} jam`;

  return `${hours} jam ${mins} menit`;
}
