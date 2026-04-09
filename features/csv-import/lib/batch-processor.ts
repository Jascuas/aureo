/**
 * Batch processor with controlled concurrency and retry logic
 *
 * Processes large arrays in batches with:
 * - Controlled concurrency (max N batches in parallel)
 * - Automatic retries with exponential backoff
 * - Progress callbacks
 * - Cancellation support
 * - Partial success handling (failed batches don't stop processing)
 * - Rate limit detection (stops immediately on 429 errors)
 */

import { isRateLimitError } from "@/lib/errors";

export type BatchResult<T> =
  | { success: true; data: T; batchIndex: number }
  | { success: false; error: Error; batchIndex: number };

export type BatchProgressCallback = (current: number, total: number) => void;

export type BatchProcessorOptions = {
  /** Maximum number of batches to process concurrently (default: 3) */
  maxConcurrent?: number;
  /** Number of retry attempts for failed batches (default: 2) */
  retries?: number;
  /** Callback invoked after each batch chunk completes */
  onProgress?: BatchProgressCallback;
  /** AbortSignal to cancel processing */
  signal?: AbortSignal;
};

/**
 * Process items in batches with controlled concurrency
 *
 * @param items - Array of items to process
 * @param batchSize - Number of items per batch
 * @param processFn - Function to process a batch (returns API response)
 * @param options - Configuration options
 * @returns Array of results (success + failed batches)
 *
 * @example
 * ```typescript
 * const results = await processBatchesWithConcurrency(
 *   transactions,
 *   50,
 *   (batch) => api.categorize({ transactions: batch }),
 *   {
 *     maxConcurrent: 3,
 *     retries: 2,
 *     onProgress: (current, total) => console.log(`${current}/${total}`),
 *     signal: abortController.signal
 *   }
 * );
 *
 * const successful = results.filter(r => r.success);
 * const failed = results.filter(r => !r.success);
 * ```
 */
export async function processBatchesWithConcurrency<TInput, TOutput>(
  items: TInput[],
  batchSize: number,
  processFn: (batch: TInput[]) => Promise<TOutput>,
  options: BatchProcessorOptions = {},
): Promise<BatchResult<TOutput>[]> {
  const { maxConcurrent = 3, retries = 2, onProgress, signal } = options;

  if (items.length === 0) {
    return [];
  }

  // Create batch processing functions with retry logic
  const batchFunctions: Array<() => Promise<BatchResult<TOutput>>> = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batchIndex = Math.floor(i / batchSize);
    const batch = items.slice(i, i + batchSize);

    batchFunctions.push(async () => {
      // Check for cancellation before processing
      if (signal?.aborted) {
        return {
          success: false,
          error: new Error("Cancelled"),
          batchIndex,
        };
      }

      // Retry logic with exponential backoff
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const data = await processFn(batch);
          return { success: true, data, batchIndex };
        } catch (error) {
          // CRITICAL: Stop immediately on rate limit errors (don't retry)
          if (isRateLimitError(error)) {
            return {
              success: false,
              error: error as Error,
              batchIndex,
            };
          }

          const isLastAttempt = attempt === retries;

          if (isLastAttempt) {
            return {
              success: false,
              error: error as Error,
              batchIndex,
            };
          }

          // Exponential backoff: 1s, 2s, 4s, etc.
          const delayMs = 1000 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      // Unreachable (for TypeScript)
      throw new Error("Unreachable: retry loop should always return");
    });
  }

  // Process batches with controlled concurrency
  const results: BatchResult<TOutput>[] = [];
  let completed = 0;

  for (let i = 0; i < batchFunctions.length; i += maxConcurrent) {
    // Process chunk of batches in parallel
    const chunk = batchFunctions.slice(i, i + maxConcurrent);
    const chunkResults = await Promise.all(chunk.map((fn) => fn()));

    results.push(...chunkResults);
    completed += chunk.length;

    // CRITICAL: Stop immediately if any batch hit rate limit
    const hasRateLimitError = chunkResults.some(
      (r) => !r.success && isRateLimitError(r.error),
    );
    if (hasRateLimitError) {
      // Return results collected so far + mark remaining batches as failed
      const remainingBatches = batchFunctions.length - completed;
      for (let j = 0; j < remainingBatches; j++) {
        results.push({
          success: false,
          error: new Error("Stopped due to rate limit on previous batch"),
          batchIndex: completed + j,
        });
      }
      break; // Stop processing
    }

    // Notify progress
    onProgress?.(completed, batchFunctions.length);
  }

  return results;
}

/**
 * Helper to separate successful and failed results
 */
export function partitionBatchResults<T>(results: BatchResult<T>[]): {
  successful: Array<{ data: T; batchIndex: number }>;
  failed: Array<{ error: Error; batchIndex: number }>;
} {
  const successful = results
    .filter((r): r is BatchResult<T> & { success: true } => r.success)
    .map((r) => ({ data: r.data, batchIndex: r.batchIndex }));

  const failed = results
    .filter((r): r is BatchResult<T> & { success: false } => !r.success)
    .map((r) => ({ error: r.error, batchIndex: r.batchIndex }));

  return { successful, failed };
}
