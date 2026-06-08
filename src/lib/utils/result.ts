/**
 * Typed Result helper for consistent function return patterns.
 * Every server action and domain service returns Result<T>.
 */

export type Result<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

export function fail(message: string, code?: string): Result<never> {
  return { success: false, error: message, code };
}
