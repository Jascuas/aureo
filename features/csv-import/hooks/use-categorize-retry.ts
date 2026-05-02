import { useCallback, useRef } from "react";
import { useCategorizeTransactions } from "@/features/csv-import/api/use-categorize-transactions";
import {
  CATEGORIZE_BATCH_SIZE,
  mergeAutoResolvedAndAi,
  runCategorizeBatches,
} from "@/features/csv-import/lib/analysis-pipeline";
import { prepareTransactionsForAnalysis } from "@/features/csv-import/lib/transaction-mapper";
import { useImportUIActions } from "@/features/csv-import/store/import-ui-state";
import { useAnalyzedRows } from "@/features/csv-import/store/import-session";
import {
  BatchProgressStage,
  DEFAULT_AMOUNT_FORMAT,
  DEFAULT_DATE_FORMAT,
} from "@/features/csv-import/const/import-const";
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
  const { setLoading, setError, setBatchProgress } = useImportUIActions();
  const analyzedRows = useAnalyzedRows();
  const abortControllerRef = useRef<AbortController | null>(null);

  const retry = useCallback(async () => {
    if (!csvData || !columnMapping) return;

    setError("categorize", null);
    setLoading("categorizing", true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const dateFormat = detectionResult?.dateFormat || DEFAULT_DATE_FORMAT;
    const amountFormat = detectionResult?.amountFormat || DEFAULT_AMOUNT_FORMAT;

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
      const batchCount = Math.ceil(
        toCategorizeBatch.length / CATEGORIZE_BATCH_SIZE,
      );
      setBatchProgress({
        current: 0,
        total: batchCount,
        stage: BatchProgressStage.CATEGORIZATION,
      });

      const result = await runCategorizeBatches({
        aiTransactions: toCategorizeBatch,
        mutate: (args) => categorizeMutation.mutateAsync(args),
        signal: abortController.signal,
        onProgress: (current, total) =>
          setBatchProgress({
            current,
            total,
            stage: BatchProgressStage.CATEGORIZATION,
          }),
      });

      if (!result.ok) {
        setError("categorize", result.error);
        return;
      }

      const enriched = mergeAutoResolvedAndAi(
        analyzedRows.autoResolved,
        result.aiCategorizations,
        transactionsForAnalysis,
      );
      onCategorizationsReady(enriched);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to categorize transactions";
      if (message === "Cancelled") {
        setError("categorize", "Categorization cancelled");
      } else {
        setError("categorize", message);
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
