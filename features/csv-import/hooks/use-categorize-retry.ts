import { useCallback, useRef } from "react";
import { useCategorizeTransactions } from "@/features/csv-import/api/use-categorize-transactions";
import {
  processBatchesWithConcurrency,
  partitionBatchResults,
} from "@/features/csv-import/lib/batch-processor";
import { enrichCategorizations } from "@/features/csv-import/lib/transaction-enricher";
import { prepareTransactionsForAnalysis } from "@/features/csv-import/lib/transaction-mapper";
import { isRateLimitError } from "@/lib/errors";
import { useImportUIState } from "@/features/csv-import/store/import-ui-state";
import { useImportSession } from "@/features/csv-import/hooks/use-import-session";
import type {
  ParsedCSVRow,
  DateFormat,
  AmountFormat,
} from "@/features/csv-import/types/import-types";
import type { EnrichedCategorization } from "@/features/csv-import/types/import-types";

interface UseCategorizeRetryOptions {
  csvData: { rows: ParsedCSVRow[] } | null;
  columnMapping: Record<string, number> | null;
  detectionResult: {
    dateFormat: DateFormat;
    amountFormat: AmountFormat;
  } | null;
  onCategorizationsReady: (categorizations: EnrichedCategorization[]) => void;
}

export function useCategorizeRetry({
  csvData,
  columnMapping,
  detectionResult,
  onCategorizationsReady,
}: UseCategorizeRetryOptions) {
  const categorizeMutation = useCategorizeTransactions();
  const { setLoading, setError, setBatchProgress } = useImportUIState();
  const { analyzedRows } = useImportSession();
  const abortControllerRef = useRef<AbortController | null>(null);

  const retry = useCallback(async () => {
    if (!csvData || !columnMapping) return;

    setError("categorize", null);
    setLoading("categorizing", true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const dateFormat =
      detectionResult?.dateFormat || ("DD/MM/YY" as DateFormat);
    const amountFormat = detectionResult?.amountFormat || {
      decimalSeparator: "," as const,
      thousandsSeparator: "." as const,
      isNegativeExpense: true,
    };

    // Use stored aiTransactions if available, otherwise fall back to all transactions
    const aiTransactions = analyzedRows.aiTransactions;
    const transactionsForAnalysis = prepareTransactionsForAnalysis(
      csvData.rows,
      columnMapping,
      dateFormat,
      amountFormat,
    );

    const toCategorizeBatch =
      aiTransactions.length > 0 ? aiTransactions : transactionsForAnalysis;

    try {
      const batchCount = Math.ceil(toCategorizeBatch.length / 30);
      setBatchProgress({
        current: 0,
        total: batchCount,
        stage: "categorization",
      });

      const results = await processBatchesWithConcurrency(
        toCategorizeBatch,
        30,
        (batch) => categorizeMutation.mutateAsync({ transactions: batch }),
        {
          maxConcurrent: 3,
          retries: 2,
          onProgress: (current, total) =>
            setBatchProgress({ current, total, stage: "categorization" }),
          signal: abortController.signal,
        },
      );

      const { successful, failed } = partitionBatchResults(results);

      if (failed.length > 0) {
        const rateLimitError = failed.find((f) => isRateLimitError(f.error));
        if (rateLimitError && isRateLimitError(rateLimitError.error)) {
          setError(
            "categorize",
            `⚠️ API Rate Limit Exceeded: ${rateLimitError.error.message}\n\nPlease wait ${rateLimitError.error.retryAfter || 60} seconds before retrying.`,
          );
          return;
        }

        setError(
          "categorize",
          `${failed.length} categorization batch(es) failed. Cannot proceed with incomplete data.`,
        );
        return;
      }

      const aiCategorizations = successful.flatMap((r) => {
        if (!("data" in r.data)) return [];
        return r.data.data.results;
      });

      // Merge with autoResolved
      const autoResolved = analyzedRows.autoResolved;
      const allRaw = [
        ...autoResolved.map((r) => ({
          csvRowIndex: r.csvRowIndex,
          categoryId: r.categoryId,
          transactionTypeId: r.transactionTypeId,
          confidence: r.confidence,
          normalizedPayee: r.normalizedPayee,
        })),
        ...aiCategorizations,
      ];

      const enriched = enrichCategorizations(allRaw, transactionsForAnalysis);
      onCategorizationsReady(enriched);
    } catch (error: any) {
      if (error.message === "Cancelled") {
        setError("categorize", "Categorization cancelled");
      } else {
        setError(
          "categorize",
          error?.message || "Failed to categorize transactions",
        );
      }
    } finally {
      setLoading("categorizing", false);
      setBatchProgress(null);
      abortControllerRef.current = null;
    }
  }, [
    csvData,
    columnMapping,
    detectionResult,
    categorizeMutation,
    analyzedRows,
    onCategorizationsReady,
    setLoading,
    setError,
    setBatchProgress,
  ]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setError("categorize", "Categorization cancelled");
    setBatchProgress(null);
    setLoading("categorizing", false);
  }, [setError, setBatchProgress, setLoading]);

  return { retry, cancel };
}
