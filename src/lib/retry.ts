/**
 * Retry an async function with exponential backoff.
 * 
 * @param fn - The async function to retry
 * @param options - Configuration: maxRetries, baseDelay (ms), shouldRetry predicate
 * @returns The result of fn()
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    onRetry?: (error: unknown, attempt: number) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, shouldRetry, onRetry } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt === maxRetries) break;

      // Check if we should retry
      if (shouldRetry && !shouldRetry(err, attempt)) break;

      // Callback
      onRetry?.(err, attempt);

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Default retry predicate: retry on network errors and 5xx server errors.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes('fetch')) return true;
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('network') || msg.includes('timeout') || msg.includes('500') || msg.includes('502') || msg.includes('503')) {
      return true;
    }
  }
  return false;
}
