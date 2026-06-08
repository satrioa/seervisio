/**
 * Result pattern — a type-safe alternative to exceptions.
 * Every function returns Result<T, E> instead of throwing.
 */

export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E };

export function ok<T, E = never>(data: T): Result<T, E> {
  return { success: true, data };
}

export function err<T = never, E = string>(error: E): Result<T, E> {
  return { success: false, error };
}

/**
 * Unwrap a result — throws if error, returns data if success.
 * Use in server actions after validation to get the data.
 */
export function unwrap<T>(result: Result<T>): T {
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
}

/**
 * Map over the success value of a Result.
 */
export function map<T, U, E = string>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (result.success) {
    return ok(fn(result.data));
  }
  return result;
}

/**
 * Chain results — if success, run next function.
 */
export function andThen<T, U, E = string>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>
): Result<U, E> {
  if (result.success) {
    return fn(result.data);
  }
  return result;
}
