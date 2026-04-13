import { useCallback } from "react";
import { useDetectDuplicates } from "@/features/csv-import/api/use-detect-duplicates";
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

interface UseDuplicateRetryOptions {
  csvData: { rows: ParsedCSVRow[] } | null;
  columnMapping: Record<string, number> | null;
  detectionResult: {
    dateFormat: DateFormat;
    amountFormat: AmountFormat;
  } | null;
  onDuplicatesDetected: (duplicates: any[]) => void;
}

export function useDuplicateRetry({
  csvData,
  columnMapping,
  detectionResult,
  onDuplicatesDetected,
}: UseDuplicateRetryOptions) {
  const detectDuplicatesMutation = useDetectDuplicates();
  const { setLoading, setError, setBatchProgress } = useImportUIState();

  const retry = useCallback(async () => {
    if (!csvData || !columnMapping) return;

    setError("analysis", null);
    setLoading("detectingDuplicates", true);

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
      setBatchProgress({ current: 0, total: 1, stage: "duplicates" });

      const result = await detectDuplicatesMutation.mutateAsync({
        transactions: transactions.map((t) => ({
          date: t.date,
          amount: t.amount,
          payee: t.payee,
        })),
      });

      setBatchProgress({ current: 1, total: 1, stage: "duplicates" });

      if (!("data" in result)) {
        throw new Error("Invalid duplicate detection response");
      }

      const transformedDuplicates = transformDuplicates(result.data.duplicates);
      onDuplicatesDetected(transformedDuplicates);
    } catch (error: any) {
      if (error.message === "Cancelled") {
        setError("analysis", "Duplicate detection cancelled");
      } else {
        setError("analysis", error?.message || "Failed to detect duplicates");
      }
    } finally {
      setLoading("detectingDuplicates", false);
      setBatchProgress(null);
    }
  }, [
    csvData,
    columnMapping,
    detectionResult,
    detectDuplicatesMutation,
    onDuplicatesDetected,
    setLoading,
    setError,
    setBatchProgress,
  ]);

  return { retry };
}
