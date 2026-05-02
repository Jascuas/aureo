import { useCallback, useRef } from "react";
import { useAnalyze } from "@/features/csv-import/api/use-analyze";
import { useCategorizeTransactions } from "@/features/csv-import/api/use-categorize-transactions";
import {
  CATEGORIZE_BATCH_SIZE,
  mergeAutoResolvedAndAi,
  runCategorizeBatches,
} from "@/features/csv-import/lib/analysis-pipeline";
import {
  prepareTransactionsForAnalysis,
  transformDuplicates,
} from "@/features/csv-import/lib/transaction-mapper";
import {
  useImportUIActions,
  useUILoading,
} from "@/features/csv-import/store/import-ui-state";
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
  EnrichedCategorization,
  ParsedCSVRow,
  PayeeMatchResult,
} from "@/features/csv-import/types/import-types";

interface AnalyzeCallbacks {
  onDuplicatesDetected: (duplicates: DuplicateMatch[]) => void;
  onAnalyzeComplete: (opts: {
    autoResolved: AutoResolvedTransaction[];
    aiTransactions: AITransaction[];
    payeeMatches: PayeeMatchResult[];
  }) => void;
  onCategorizationsReady: (categorizations: EnrichedCategorization[]) => void;
  onError: (error: string) => void;
  onComplete: () => void;
}

interface UseTransactionAnalyzerOptions {
  csvData: { fileName: string; headers: string[]; rows: ParsedCSVRow[] } | null;
  columnMapping: Record<string, number> | null;
  detectionResult: {
    dateFormat: DateFormat;
    amountFormat: AmountFormat;
  } | null;
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

  const loading = useUILoading();
  const { setLoading, setError, setBatchProgress, setAnalyzeComplete } =
    useImportUIActions();

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
    setAnalyzeComplete(false);
    isAnalyzingRef.current = true;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const amountFormat = detectionResult?.amountFormat || DEFAULT_AMOUNT_FORMAT;
    const dateFormat = detectionResult?.dateFormat || DEFAULT_DATE_FORMAT;

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

      const analyzeResult = await analyzeMutation.mutateAsync({
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

      const { duplicates, autoResolved, aiTransactions, payeeMatches } =
        analyzeResult;

      callbacks.onDuplicatesDetected(transformDuplicates(duplicates));
      callbacks.onAnalyzeComplete({
        autoResolved,
        aiTransactions,
        payeeMatches,
      });
      setAnalyzeComplete(true);

      // ── Phase 2: /categorize ──────────────────────────────────────────────
      if (aiTransactions.length === 0) {
        const enriched = mergeAutoResolvedAndAi(
          autoResolved,
          [],
          transactionsForAnalysis,
        );
        callbacks.onCategorizationsReady(enriched);
        callbacks.onComplete();
        return;
      }

      const categorizeBatchCount = Math.ceil(
        aiTransactions.length / CATEGORIZE_BATCH_SIZE,
      );
      setBatchProgress({
        current: 0,
        total: categorizeBatchCount,
        stage: BatchProgressStage.CATEGORIZATION,
      });

      const categorizeResult = await runCategorizeBatches({
        aiTransactions,
        mutate: (args) => categorizeMutation.mutateAsync(args),
        signal: abortController.signal,
        onProgress: (current, total) =>
          setBatchProgress({
            current,
            total,
            stage: BatchProgressStage.CATEGORIZATION,
          }),
      });

      if (!categorizeResult.ok) {
        setError("categorize", categorizeResult.error);
        return;
      }

      const enriched = mergeAutoResolvedAndAi(
        autoResolved,
        categorizeResult.aiCategorizations,
        transactionsForAnalysis,
      );
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
    analyzeMutation,
    categorizeMutation,
    setLoading,
    setError,
    setBatchProgress,
    setAnalyzeComplete,
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
