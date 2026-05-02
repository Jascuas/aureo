import {
  partitionBatchResults,
  processBatchesWithConcurrency,
} from "@/features/csv-import/lib/batch-processor";
import { enrichCategorizations } from "@/features/csv-import/lib/transaction-enricher";
import type {
  AICategorization,
  AITransaction,
  AutoResolvedTransaction,
  EnrichedCategorization,
  TransactionForAnalysis,
} from "@/features/csv-import/types/import-types";
import { isRateLimitError } from "@/lib/errors";

export const CATEGORIZE_BATCH_SIZE = 30;
export const CATEGORIZE_MAX_CONCURRENT = 3;
export const CATEGORIZE_RETRIES = 2;

type CategorizeMutate = (args: {
  transactions: AITransaction[];
}) => Promise<{ results: AICategorization[] }>;

interface RunCategorizeBatchesArgs {
  aiTransactions: AITransaction[];
  mutate: CategorizeMutate;
  signal: AbortSignal;
  onProgress: (current: number, total: number) => void;
}

type RunCategorizeBatchesResult =
  | { ok: true; aiCategorizations: AICategorization[] }
  | { ok: false; error: string };

export async function runCategorizeBatches({
  aiTransactions,
  mutate,
  signal,
  onProgress,
}: RunCategorizeBatchesArgs): Promise<RunCategorizeBatchesResult> {
  const results = await processBatchesWithConcurrency(
    aiTransactions,
    CATEGORIZE_BATCH_SIZE,
    (batch) => mutate({ transactions: batch }),
    {
      maxConcurrent: CATEGORIZE_MAX_CONCURRENT,
      retries: CATEGORIZE_RETRIES,
      onProgress,
      signal,
    },
  );

  const { successful, failed } = partitionBatchResults(results);

  if (failed.length > 0) {
    return { ok: false, error: formatBatchFailure(failed) };
  }

  const aiCategorizations: AICategorization[] = successful.flatMap(
    (r) => r.data.results,
  );

  return { ok: true, aiCategorizations };
}

export function formatBatchFailure(failed: Array<{ error: unknown }>): string {
  const rateLimitFailure = failed.find((f) => isRateLimitError(f.error));
  if (rateLimitFailure && isRateLimitError(rateLimitFailure.error)) {
    const retryAfter = rateLimitFailure.error.retryAfter || 60;
    return (
      `⚠️ API Rate Limit Exceeded: ${rateLimitFailure.error.message}\n\n` +
      `Processing stopped. Please wait ${retryAfter} seconds before retrying.`
    );
  }
  return `${failed.length} categorization batch(es) failed. Cannot proceed with incomplete data.`;
}

export function mergeAutoResolvedAndAi(
  autoResolved: AutoResolvedTransaction[],
  aiCategorizations: AICategorization[],
  preparedTransactions: TransactionForAnalysis[],
): EnrichedCategorization[] {
  const allRaw: AICategorization[] = [
    ...autoResolved.map((r) => ({
      csvRowIndex: r.csvRowIndex,
      categoryId: r.categoryId as string | null,
      transactionTypeId: r.transactionTypeId,
      confidence: r.confidence,
      normalizedPayee: r.normalizedPayee,
    })),
    ...aiCategorizations,
  ];

  return enrichCategorizations(allRaw, preparedTransactions);
}
