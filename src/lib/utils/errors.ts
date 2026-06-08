/**
 * Application error classes.
 * Used throughout the application for typed error handling.
 */

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string = "INTERNAL_ERROR", statusCode: number = 500) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class AuthError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, "AUTH_REQUIRED", 401);
    this.name = "AuthError";
  }
}

export class PermissionError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, "FORBIDDEN", 403);
    this.name = "PermissionError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
    this.name = "ValidationError";
  }
}
