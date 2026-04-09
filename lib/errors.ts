/**
 * Custom error classes for the application
 */

export class RateLimitError extends Error {
  constructor(
    message: string,
    public readonly retryAfter?: number, // seconds
    public readonly provider?: string,
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function isAIProviderError(error: unknown): error is AIProviderError {
  return error instanceof AIProviderError;
}
