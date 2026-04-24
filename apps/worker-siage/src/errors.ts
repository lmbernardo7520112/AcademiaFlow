/**
 * @module errors
 * Error classification for retry logic.
 */

/** Errors that should trigger a retry (transient failures) */
export class RetryableError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'RetryableError';
  }
}

/** Errors that should NOT be retried (permanent failures) */
export class NonRetryableError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'NonRetryableError';
  }
}

/**
 * Classify an unknown error as retryable or non-retryable.
 * Network/timeout → retryable. Auth/validation → non-retryable.
 */
export function classifyError(error: unknown): RetryableError | NonRetryableError {
  if (error instanceof RetryableError || error instanceof NonRetryableError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const lowerMsg = message.toLowerCase();

  // Non-retryable: auth failures, validation errors, missing data
  if (
    lowerMsg.includes('401') ||
    lowerMsg.includes('403') ||
    lowerMsg.includes('invalid') ||
    lowerMsg.includes('envelope_key') ||
    lowerMsg.includes('decrypt') ||
    lowerMsg.includes('credentials')
  ) {
    return new NonRetryableError(message, error instanceof Error ? error : undefined);
  }

  // Retryable: network issues, timeouts, 5xx
  if (
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('econnrefused') ||
    lowerMsg.includes('network') ||
    lowerMsg.includes('500') ||
    lowerMsg.includes('502') ||
    lowerMsg.includes('503')
  ) {
    return new RetryableError(message, error instanceof Error ? error : undefined);
  }

  // Default: non-retryable (fail safe)
  return new NonRetryableError(message, error instanceof Error ? error : undefined);
}
