import { useCallback, useRef } from "react";

import { useAnalyze } from "@/features/csv-import/api/use-analyze";
import {
  BatchProgressStage,
  DEFAULT_AMOUNT_FORMAT,
  DEFAULT_DATE_FORMAT,
} from "@/features/csv-import/const/import-const";
import { enrichCategorizations } from "@/features/csv-import/lib/transaction-enricher";
import {
  prepareTransactionsForAnalysis,
  transformDuplicates,
} from "@/features/csv-import/lib/transaction-mapper";
import {
  useImportUIActions,
  useUILoading,
} from "@/features/csv-import/store/import-ui-state";
import type {
  AmountFormat,
  DateFormat,
  DuplicateMatch,
  EnrichedCategorization,
  ParsedCSVRow,
  PayeeMatchResult,
} from "@/features/csv-import/types/import-types";

type AnalysisCallbacks = {
  onAnalysisComplete: (result: {
    categorizations: EnrichedCategorization[];
    duplicates: DuplicateMatch[];
    payeeMatches: PayeeMatchResult[];
  }) => void;
  onComplete: () => void;
  onError: (error: string) => void;
};

type UseTransactionAnalyzerOptions = {
  callbacks: AnalysisCallbacks;
  columnMapping: Record<string, number> | null;
  csvData: { fileName: string; headers: string[]; rows: ParsedCSVRow[] } | null;
  detectionResult: {
    amountFormat: AmountFormat;
    dateFormat: DateFormat;
  } | null;
};

type UseTransactionAnalyzerReturn = {
  analyze: () => Promise<void>;
  cancel: () => void;
  isAnalyzing: boolean;
};

export function useTransactionAnalyzer({
  callbacks,
  columnMapping,
  csvData,
  detectionResult,
}: UseTransactionAnalyzerOptions): UseTransactionAnalyzerReturn {
  const abortControllerRef = useRef<AbortController | null>(null);
  const isAnalyzingRef = useRef(false);
  const analyzeMutation = useAnalyze();
  const loading = useUILoading();
  const { setAnalyzeComplete, setBatchProgress, setError, setLoading } =
    useImportUIActions();

  const analyze = useCallback(async () => {
    if (isAnalyzingRef.current) return;
    if (!csvData || !columnMapping) {
      callbacks.onError("Faltan los datos del CSV o el mapeo de columnas.");
      return;
    }

    setError("analyze", null);
    setLoading("analyzing", true);
    setAnalyzeComplete(false);
    isAnalyzingRef.current = true;
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const amountFormat = detectionResult?.amountFormat ?? DEFAULT_AMOUNT_FORMAT;
    const dateFormat = detectionResult?.dateFormat ?? DEFAULT_DATE_FORMAT;
    const transactionsForAnalysis = prepareTransactionsForAnalysis(
      csvData.rows,
      columnMapping,
      dateFormat,
      amountFormat,
    );

    try {
      if (transactionsForAnalysis.length === 0) {
        callbacks.onAnalysisComplete({
          categorizations: [],
          duplicates: [],
          payeeMatches: [],
        });
        setAnalyzeComplete(true);
        callbacks.onComplete();
        return;
      }

      setBatchProgress({
        current: 0,
        stage: BatchProgressStage.ANALYZING,
        total: 1,
      });
      const result = await analyzeMutation.mutateAsync({
        transactions: transactionsForAnalysis,
      });

      if (abortController.signal.aborted) {
        callbacks.onError("El análisis fue cancelado por el usuario.");
        return;
      }

      callbacks.onAnalysisComplete({
        categorizations: enrichCategorizations(
          result.categorizations,
          transactionsForAnalysis,
        ),
        duplicates: transformDuplicates(result.duplicates),
        payeeMatches: result.payeeMatches,
      });
      setBatchProgress({
        current: 1,
        stage: BatchProgressStage.ANALYZING,
        total: 1,
      });
      setAnalyzeComplete(true);
      callbacks.onComplete();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se han podido analizar las transacciones.";
      callbacks.onError(
        message === "Cancelled"
          ? "El análisis fue cancelado por el usuario."
          : message,
      );
    } finally {
      abortControllerRef.current = null;
      isAnalyzingRef.current = false;
      setBatchProgress(null);
      setLoading("analyzing", false);
    }
  }, [
    analyzeMutation,
    callbacks,
    columnMapping,
    csvData,
    detectionResult,
    setAnalyzeComplete,
    setBatchProgress,
    setError,
    setLoading,
  ]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setBatchProgress(null);
    setError("analyze", "El análisis fue cancelado por el usuario.");
    setLoading("analyzing", false);
  }, [setBatchProgress, setError, setLoading]);

  return { analyze, cancel, isAnalyzing: loading.analyzing };
}
