import { useCallback, useRef, useEffect } from "react";
import { useDetectDuplicates } from "@/features/csv-import/api/use-detect-duplicates";
import { useCategorizeTransactions } from "@/features/csv-import/api/use-categorize-transactions";
import {
  processBatchesWithConcurrency,
  partitionBatchResults,
} from "@/features/csv-import/lib/batch-processor";
import {
  prepareTransactionsForAnalysis,
  transformDuplicates,
} from "@/features/csv-import/lib/transaction-mapper";
import { enrichCategorizations } from "@/features/csv-import/lib/transaction-enricher";
import { isRateLimitError } from "@/lib/errors";
import { useImportUIState } from "@/features/csv-import/store/import-ui-state";

interface AnalyzeCallbacks {
  onDuplicatesDetected: (duplicates: any[]) => void;
  onCategorizationsReady: (categorizations: any[]) => void;
  onError: (error: string) => void;
  onComplete: () => void;
}

interface UseTransactionAnalyzerOptions {
  csvData: { fileName: string; headers: string[]; rows: any[] } | null;
  columnMapping: Record<string, number> | null;
  detectionResult: { dateFormat: string; amountFormat: any } | null;
  callbacks: AnalyzeCallbacks;
}

interface UseTransactionAnalyzerReturn {
  analyze: () => Promise<void>;
  cancel: () => void;
  isAnalyzing: boolean;
}

export function useTransactionAnalyzer({
  csvData,
  columnMapping,
  detectionResult,
  callbacks,
}: UseTransactionAnalyzerOptions): UseTransactionAnalyzerReturn {
  const abortControllerRef = useRef<AbortController | null>(null);
  const isAnalyzingRef = useRef(false);
  const detectDuplicatesMutation = useDetectDuplicates();
  const categorizeMutation = useCategorizeTransactions();

  // Keep stable refs to the mutation functions so they don't need to be in
  // the useCallback dependency array — React Query recreates mutation objects
  // on every render, which would otherwise cause analyze() to be a new
  // function reference each render and re-trigger the analysis effect.
  const detectDuplicatesMutateRef = useRef(
    detectDuplicatesMutation.mutateAsync,
  );
  const categorizeMutateRef = useRef(categorizeMutation.mutateAsync);
  useEffect(() => {
    detectDuplicatesMutateRef.current = detectDuplicatesMutation.mutateAsync;
  });
  useEffect(() => {
    categorizeMutateRef.current = categorizeMutation.mutateAsync;
  });

  const { loading, setLoading, setError, setBatchProgress } =
    useImportUIState();

  const analyze = useCallback(async () => {
    // Guard: prevent concurrent duplicate calls
    if (isAnalyzingRef.current) return;
    if (!csvData || !columnMapping) {
      callbacks.onError("Missing CSV data or column mapping");
      return;
    }

    setError("analysis", null);
    setLoading("detectingDuplicates", true);
    setLoading("categorizing", true);
    isAnalyzingRef.current = true;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const mapping = columnMapping;
    const amountFormat = detectionResult?.amountFormat || {
      decimalSeparator: "," as const,
      thousandsSeparator: "." as const,
      isNegativeExpense: true,
    };
    const dateFormat = (detectionResult?.dateFormat as any) || "DD/MM/YY";

    const transactionsForAnalysis = prepareTransactionsForAnalysis(
      csvData.rows,
      mapping,
      dateFormat,
      amountFormat,
    );

    try {
      setBatchProgress({ current: 0, total: 1, stage: "duplicates" });

      const duplicateResult = await detectDuplicatesMutateRef.current({
        transactions: transactionsForAnalysis.map((t) => ({
          date: t.date,
          amount: t.amount,
          payee: t.payee,
        })),
      });

      setBatchProgress({ current: 1, total: 1, stage: "duplicates" });
      setLoading("detectingDuplicates", false);

      if (abortController.signal.aborted) {
        callbacks.onError("Analysis cancelled by user");
        return;
      }

      const allDuplicates =
        "data" in duplicateResult ? duplicateResult.data.duplicates : [];

      const transformedDuplicates = transformDuplicates(allDuplicates);

      callbacks.onDuplicatesDetected(transformedDuplicates);

      const categorizeBatchCount = Math.ceil(
        transactionsForAnalysis.length / 30,
      );
      setBatchProgress({
        current: 0,
        total: categorizeBatchCount,
        stage: "categorization",
      });

      const categorizeResults = await processBatchesWithConcurrency(
        transactionsForAnalysis,
        30,
        (batch) => categorizeMutateRef.current({ transactions: batch }),
        {
          maxConcurrent: 3,
          retries: 2,
          onProgress: (current, total) =>
            setBatchProgress({ current, total, stage: "categorization" }),
          signal: abortController.signal,
        },
      );

      const {
        successful: successfulCategorizations,
        failed: failedCategorizations,
      } = partitionBatchResults(categorizeResults);

      if (failedCategorizations.length > 0) {
        const rateLimitError = failedCategorizations.find((f) =>
          isRateLimitError(f.error),
        );

        if (rateLimitError && isRateLimitError(rateLimitError.error)) {
          setError(
            "analysis",
            `⚠️ API Rate Limit Exceeded: ${rateLimitError.error.message}\n\n` +
              `Processing stopped to avoid further errors. ` +
              `Please wait ${rateLimitError.error.retryAfter || 60} seconds before retrying.`,
          );
        } else {
          setError(
            "analysis",
            `${failedCategorizations.length} categorization batch(es) failed. Cannot proceed with incomplete data.`,
          );
        }
        return;
      }

      const allCategorizations = successfulCategorizations.flatMap((r) => {
        if (!("data" in r.data)) return [];
        return r.data.data.results;
      });

      const enrichedCategorizations = enrichCategorizations(
        allCategorizations,
        transactionsForAnalysis,
      );

      callbacks.onCategorizationsReady(enrichedCategorizations);
      callbacks.onComplete();
    } catch (error: any) {
      if (error.message === "Cancelled") {
        callbacks.onError("Analysis cancelled by user");
      } else {
        callbacks.onError(error?.message || "Failed to analyze transactions");
      }
    } finally {
      isAnalyzingRef.current = false;
      setLoading("categorizing", false);
      setBatchProgress(null);
      abortControllerRef.current = null;
    }
  }, [
    csvData,
    columnMapping,
    detectionResult,
    callbacks,
    setLoading,
    setError,
    setBatchProgress,
  ]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setError("analysis", "Analysis cancelled by user");
    setBatchProgress(null);
    setLoading("detectingDuplicates", false);
    setLoading("categorizing", false);
  }, [setError, setBatchProgress, setLoading]);

  return {
    analyze,
    cancel,
    isAnalyzing: loading.detectingDuplicates || loading.categorizing,
  };
}
