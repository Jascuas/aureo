import { useCallback, useRef } from "react";
import { useCategorizeTransactions } from "@/features/csv-import/api/use-categorize-transactions";
import {
  processBatchesWithConcurrency,
  partitionBatchResults,
} from "@/features/csv-import/lib/batch-processor";
import { prepareTransactionsForAnalysis } from "@/features/csv-import/lib/transaction-mapper";
import { enrichCategorizations } from "@/features/csv-import/lib/transaction-enricher";
import { isRateLimitError } from "@/lib/errors";
import { useImportUIState } from "@/features/csv-import/store/import-ui-state";
import type {
  ParsedCSVRow,
  DateFormat,
  AmountFormat,
} from "@/features/csv-import/types/import-types";

interface UseCategorizeRetryOptions {
  csvData: { rows: ParsedCSVRow[] } | null;
  columnMapping: Record<string, number> | null;
  detectionResult: {
    dateFormat: DateFormat;
    amountFormat: AmountFormat;
  } | null;
  onCategorizationsReady: (categorizations: any[]) => void;
}

export function useCategorizeRetry({
  csvData,
  columnMapping,
  detectionResult,
  onCategorizationsReady,
}: UseCategorizeRetryOptions) {
  const categorizeMutation = useCategorizeTransactions();
  const { setLoading, setError, setBatchProgress } = useImportUIState();
  const abortControllerRef = useRef<AbortController | null>(null);

  const retry = useCallback(async () => {
    if (!csvData || !columnMapping) return;

    setError("analysis", null);
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

    const transactions = prepareTransactionsForAnalysis(
      csvData.rows,
      columnMapping,
      dateFormat,
      amountFormat,
    );

    try {
      const batchCount = Math.ceil(transactions.length / 30);
      setBatchProgress({
        current: 0,
        total: batchCount,
        stage: "categorization",
      });

      const results = await processBatchesWithConcurrency(
        transactions,
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
            "analysis",
            `⚠️ API Rate Limit Exceeded: ${rateLimitError.error.message}\n\n` +
              `Please wait ${rateLimitError.error.retryAfter || 60} seconds before retrying.`,
          );
          return;
        }

        setError(
          "analysis",
          `${failed.length} categorization batch(es) failed. Cannot proceed with incomplete data.`,
        );
        return;
      }

      const allCategorizations = successful.flatMap((r) => {
        if (!("data" in r.data)) return [];
        return r.data.data.results;
      });

      const enriched = enrichCategorizations(allCategorizations, transactions);
      onCategorizationsReady(enriched);
    } catch (error: any) {
      if (error.message === "Cancelled") {
        setError("analysis", "Categorization cancelled");
      } else {
        setError(
          "analysis",
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
    onCategorizationsReady,
    setLoading,
    setError,
    setBatchProgress,
  ]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setError("analysis", "Categorization cancelled");
    setBatchProgress(null);
    setLoading("categorizing", false);
  }, [setError, setBatchProgress, setLoading]);

  return { retry, cancel };
}
