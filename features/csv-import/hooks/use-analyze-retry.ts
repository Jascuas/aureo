import { useCallback, useRef } from "react";
import { useAnalyze } from "@/features/csv-import/api/use-analyze";
import {
  prepareTransactionsForAnalysis,
  transformDuplicates,
} from "@/features/csv-import/lib/transaction-mapper";
import { useImportUIActions } from "@/features/csv-import/store/import-ui-state";
import {
  BatchProgressStage,
  DEFAULT_AMOUNT_FORMAT,
  DEFAULT_DATE_FORMAT,
} from "@/features/csv-import/const/import-const";
import type {
  AITransaction,
  AmountFormat,
  AutoResolvedTransaction,
  DateFormat,
  DuplicateMatch,
  ParsedCSVRow,
  PayeeMatchResult,
} from "@/features/csv-import/types/import-types";

interface UseAnalyzeRetryOptions {
  csvData: { rows: ParsedCSVRow[] } | null;
  columnMapping: Record<string, number> | null;
  detectionResult: {
    dateFormat: DateFormat;
    amountFormat: AmountFormat;
  } | null;
  onDuplicatesDetected: (duplicates: DuplicateMatch[]) => void;
  onAnalyzeComplete: (opts: {
    autoResolved: AutoResolvedTransaction[];
    aiTransactions: AITransaction[];
    payeeMatches: PayeeMatchResult[];
  }) => void;
}

export function useAnalyzeRetry({
  csvData,
  columnMapping,
  detectionResult,
  onDuplicatesDetected,
  onAnalyzeComplete,
}: UseAnalyzeRetryOptions) {
  const analyzeMutation = useAnalyze();
  const { setLoading, setError, setBatchProgress } = useImportUIActions();

  const retry = useCallback(async () => {
    if (!csvData || !columnMapping) return;

    setError("analyze", null);
    setLoading("analyzing", true);

    const dateFormat = detectionResult?.dateFormat || DEFAULT_DATE_FORMAT;
    const amountFormat = detectionResult?.amountFormat || DEFAULT_AMOUNT_FORMAT;

    const transactions = prepareTransactionsForAnalysis(
      csvData.rows,
      columnMapping,
      dateFormat,
      amountFormat,
    );

    try {
      setBatchProgress({
        current: 0,
        total: 1,
        stage: BatchProgressStage.ANALYZING,
      });

      const result = await analyzeMutation.mutateAsync({ transactions });

      setBatchProgress({
        current: 1,
        total: 1,
        stage: BatchProgressStage.ANALYZING,
      });

      const { duplicates, autoResolved, aiTransactions, payeeMatches } = result;

      const transformedDuplicates = transformDuplicates(duplicates);
      onDuplicatesDetected(transformedDuplicates);
      onAnalyzeComplete({ autoResolved, aiTransactions, payeeMatches });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to analyze transactions";
      setError("analyze", message);
    } finally {
      setLoading("analyzing", false);
      setBatchProgress(null);
    }
  }, [
    csvData,
    columnMapping,
    detectionResult,
    analyzeMutation,
    onDuplicatesDetected,
    onAnalyzeComplete,
    setLoading,
    setError,
    setBatchProgress,
  ]);

  return { retry };
}
