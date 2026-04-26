import { useCallback, useRef } from "react";
import { useAnalyze } from "@/features/csv-import/api/use-analyze";
import {
  prepareTransactionsForAnalysis,
  transformDuplicates,
} from "@/features/csv-import/lib/transaction-mapper";
import { useImportUIState } from "@/features/csv-import/store/import-ui-state";
import type {
  ParsedCSVRow,
  DateFormat,
  AmountFormat,
} from "@/features/csv-import/types/import-types";
import type { AITransaction } from "@/features/csv-import/lib/analyzer";

interface UseAnalyzeRetryOptions {
  csvData: { rows: ParsedCSVRow[] } | null;
  columnMapping: Record<string, number> | null;
  detectionResult: {
    dateFormat: DateFormat;
    amountFormat: AmountFormat;
  } | null;
  onDuplicatesDetected: (duplicates: any[]) => void;
  onAnalyzeComplete: (opts: {
    autoResolved: any[];
    aiTransactions: AITransaction[];
    payeeMatches: any[];
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
  const { setLoading, setError, setBatchProgress } = useImportUIState();

  const retry = useCallback(async () => {
    if (!csvData || !columnMapping) return;

    setError("analyze", null);
    setLoading("analyzing", true);

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
      setBatchProgress({ current: 0, total: 1, stage: "analyzing" });

      const result = await analyzeMutation.mutateAsync({ transactions });

      setBatchProgress({ current: 1, total: 1, stage: "analyzing" });

      if (!("data" in result)) {
        throw new Error("Invalid analyze response");
      }

      const { duplicates, autoResolved, aiTransactions, payeeMatches } =
        result.data;

      const transformedDuplicates = transformDuplicates(duplicates);
      onDuplicatesDetected(transformedDuplicates);
      onAnalyzeComplete({ autoResolved, aiTransactions, payeeMatches });
    } catch (error: any) {
      setError("analyze", error?.message || "Failed to analyze transactions");
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
