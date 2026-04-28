import { useCallback, useRef, useEffect } from "react";
import { useAnalyze } from "@/features/csv-import/api/use-analyze";
import { useCategorizeTransactions } from "@/features/csv-import/api/use-categorize-transactions";
import {
  processBatchesWithConcurrency,
  partitionBatchResults,
} from "@/features/csv-import/lib/batch-processor";
import { prepareTransactionsForAnalysis } from "@/features/csv-import/lib/transaction-mapper";
import { enrichCategorizations } from "@/features/csv-import/lib/transaction-enricher";
import { isRateLimitError } from "@/lib/errors";
import { useImportUIState } from "@/features/csv-import/store/import-ui-state";
import { transformDuplicates } from "@/features/csv-import/lib/transaction-mapper";
import {
  BatchProgressStage,
  DEFAULT_AMOUNT_FORMAT,
} from "@/features/csv-import/const/import-const";
import type { AITransaction } from "@/features/csv-import/lib/analyzer";
import type { EnrichedCategorization } from "@/features/csv-import/types/import-types";

interface AnalyzeCallbacks {
  onDuplicatesDetected: (duplicates: any[]) => void;
  onAnalyzeComplete: (opts: {
    autoResolved: any[];
    aiTransactions: AITransaction[];
    payeeMatches: any[];
  }) => void;
  onCategorizationsReady: (categorizations: EnrichedCategorization[]) => void;
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
  const analyzeMutation = useAnalyze();
  const categorizeMutation = useCategorizeTransactions();

  const analyzeMutateRef = useRef(analyzeMutation.mutateAsync);
  const categorizeMutateRef = useRef(categorizeMutation.mutateAsync);
  useEffect(() => {
    analyzeMutateRef.current = analyzeMutation.mutateAsync;
  });
  useEffect(() => {
    categorizeMutateRef.current = categorizeMutation.mutateAsync;
  });

  const { loading, setLoading, setError, setBatchProgress } =
    useImportUIState();

  const analyze = useCallback(async () => {
    if (isAnalyzingRef.current) return;
    if (!csvData || !columnMapping) {
      callbacks.onError("Missing CSV data or column mapping");
      return;
    }

    setError("analyze", null);
    setError("categorize", null);
    setLoading("analyzing", true);
    setLoading("categorizing", true);
    isAnalyzingRef.current = true;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const amountFormat = detectionResult?.amountFormat || DEFAULT_AMOUNT_FORMAT;
    const dateFormat = (detectionResult?.dateFormat as any) || "DD/MM/YY";

    const transactionsForAnalysis = prepareTransactionsForAnalysis(
      csvData.rows,
      columnMapping,
      dateFormat,
      amountFormat,
    );

    try {
      // ── Phase 1: /analyze ─────────────────────────────────────────────────
      setBatchProgress({
        current: 0,
        total: 1,
        stage: BatchProgressStage.ANALYZING,
      });

      const analyzeResult = await analyzeMutateRef.current({
        transactions: transactionsForAnalysis,
      });

      setBatchProgress({
        current: 1,
        total: 1,
        stage: BatchProgressStage.ANALYZING,
      });
      setLoading("analyzing", false);

      if (abortController.signal.aborted) {
        callbacks.onError("Analysis cancelled by user");
        return;
      }

      if (!("data" in analyzeResult)) {
        throw new Error("Invalid analyze response");
      }

      const { duplicates, autoResolved, aiTransactions, payeeMatches } =
        analyzeResult.data;

      const transformedDuplicates = transformDuplicates(duplicates);
      callbacks.onDuplicatesDetected(transformedDuplicates);
      callbacks.onAnalyzeComplete({
        autoResolved,
        aiTransactions,
        payeeMatches,
      });

      // ── Phase 2: /categorize (only AI transactions) ───────────────────────
      if (aiTransactions.length === 0) {
        // All auto-resolved — build enriched from autoResolved + original data
        const enriched = enrichCategorizations(
          autoResolved.map((r: any) => ({
            csvRowIndex: r.csvRowIndex,
            categoryId: r.categoryId,
            transactionTypeId: r.transactionTypeId,
            confidence: r.confidence,
            normalizedPayee: r.normalizedPayee,
          })),
          transactionsForAnalysis,
        );
        callbacks.onCategorizationsReady(enriched);
        callbacks.onComplete();
        return;
      }

      const categorizeBatchCount = Math.ceil(aiTransactions.length / 30);
      setBatchProgress({
        current: 0,
        total: categorizeBatchCount,
        stage: BatchProgressStage.CATEGORIZATION,
      });

      const categorizeResults = await processBatchesWithConcurrency(
        aiTransactions,
        30,
        (batch) => categorizeMutateRef.current({ transactions: batch }),
        {
          maxConcurrent: 3,
          retries: 2,
          onProgress: (current, total) =>
            setBatchProgress({
              current,
              total,
              stage: BatchProgressStage.CATEGORIZATION,
            }),
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
            "categorize",
            `⚠️ API Rate Limit Exceeded: ${rateLimitError.error.message}\n\n` +
              `Processing stopped. Please wait ${rateLimitError.error.retryAfter || 60} seconds before retrying.`,
          );
        } else {
          setError(
            "categorize",
            `${failedCategorizations.length} categorization batch(es) failed. Cannot proceed with incomplete data.`,
          );
        }
        return;
      }

      const aiCategorizations = successfulCategorizations.flatMap((r) => {
        if (!("data" in r.data)) return [];
        return r.data.data.results;
      });

      // Merge autoResolved + AI results, enrich, sort
      const allRaw = [
        ...autoResolved.map((r: any) => ({
          csvRowIndex: r.csvRowIndex,
          categoryId: r.categoryId,
          transactionTypeId: r.transactionTypeId,
          confidence: r.confidence,
          normalizedPayee: r.normalizedPayee,
        })),
        ...aiCategorizations,
      ];

      const enriched = enrichCategorizations(allRaw, transactionsForAnalysis);
      callbacks.onCategorizationsReady(enriched);
      callbacks.onComplete();
    } catch (error: any) {
      if (error.message === "Cancelled") {
        callbacks.onError("Analysis cancelled by user");
      } else {
        callbacks.onError(error?.message || "Failed to analyze transactions");
      }
    } finally {
      isAnalyzingRef.current = false;
      setLoading("analyzing", false);
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
    setError("analyze", "Analysis cancelled by user");
    setBatchProgress(null);
    setLoading("analyzing", false);
    setLoading("categorizing", false);
  }, [setError, setBatchProgress, setLoading]);

  return {
    analyze,
    cancel,
    isAnalyzing: loading.analyzing || loading.categorizing,
  };
}
