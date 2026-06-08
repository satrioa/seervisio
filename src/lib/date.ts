/**
 * Date formatting utilities.
 */

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
