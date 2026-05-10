import { useCallback, useMemo } from "react";

import { ImportStep } from "@/features/csv-import/const/import-const";
import { useAnalyzeRetry } from "@/features/csv-import/hooks/use-analyze-retry";
import { useCategorizeRetry } from "@/features/csv-import/hooks/use-categorize-retry";
import { useTransactionAnalyzer } from "@/features/csv-import/hooks/use-transaction-analyzer";
import { useTransactionImport } from "@/features/csv-import/hooks/use-transaction-import";
import { validateColumnMapping } from "@/features/csv-import/lib/validators";
import {
  useDuplicateResolutionActions,
  useDuplicateResolutions,
} from "@/features/csv-import/store/duplicate-resolution";
import {
  useAnalyzedRows,
  useColumnMapping,
  useCSVData,
  useCurrentStep,
  useImportSessionActions,
} from "@/features/csv-import/store/import-session";
import {
  useImportUIActions,
  useImportUIState,
} from "@/features/csv-import/store/import-ui-state";
import type {
  AITransaction,
  AmountFormat,
  AutoResolvedTransaction,
  DateFormat,
  ImportOrchestrator,
  PayeeMatchResult,
} from "@/features/csv-import/types/import-types";
import { useConfirm } from "@/hooks/use-confirm";

interface UseImportOrchestratorOptions {
  accountId?: string;
  onCancel?: () => void;
}

/**
 * Orchestrates the entire import flow: wires the analyzer, retry hooks, and
 * importer with the session/UI stores, and exposes step-transition handlers
 * and a cancel-confirm dialog. Keeps the card component a thin shell.
 */
export function useImportOrchestrator({
  accountId,
  onCancel,
}: UseImportOrchestratorOptions): ImportOrchestrator {
  const currentStep = useCurrentStep();
  const csvData = useCSVData();
  const columnMapping = useColumnMapping();
  const analyzedRows = useAnalyzedRows();

  const {
    setFinalMapping: _ignored,
    setDuplicates,
    setCategorizations,
    setPayeeMatches,
    setAutoResolved,
    setAITransactions,
    setImportResult,
    nextStep,
    reset,
  } = useImportSessionActions();
  void _ignored;

  const resolutions = useDuplicateResolutions();
  const { reset: resetResolutions } = useDuplicateResolutionActions();
  const { setError } = useImportUIActions();
  const resetUIState = useImportUIState((s) => s.reset);

  const [ConfirmDialog, confirm] = useConfirm(
    "Are you sure?",
    "All progress will be lost.",
  );

  const [RerunConfirmDialog, confirmRerun] = useConfirm(
    "Re-run analysis?",
    "Current analysis results will be discarded and re-computed.",
  );

  const detectionForAnalyzer = useMemo(
    () =>
      columnMapping.detectionResult
        ? {
            dateFormat: columnMapping.detectionResult.dateFormat as DateFormat,
            amountFormat: columnMapping.detectionResult
              .amountFormat as AmountFormat,
          }
        : null,
    [columnMapping.detectionResult],
  );

  const analyzerCallbacks = useMemo(
    () => ({
      onDuplicatesDetected: setDuplicates,
      onAnalyzeComplete: ({
        autoResolved,
        aiTransactions,
        payeeMatches,
      }: {
        autoResolved: AutoResolvedTransaction[];
        aiTransactions: AITransaction[];
        payeeMatches: PayeeMatchResult[];
      }) => {
        setAutoResolved(autoResolved);
        setAITransactions(aiTransactions);
        setPayeeMatches(payeeMatches);
      },
      onCategorizationsReady: setCategorizations,
      onError: () => {},
      onComplete: nextStep,
    }),
    [
      setDuplicates,
      setAutoResolved,
      setAITransactions,
      setPayeeMatches,
      setCategorizations,
      nextStep,
    ],
  );

  const { analyze, cancel: cancelAnalysis } = useTransactionAnalyzer({
    csvData,
    columnMapping: columnMapping.finalMapping,
    detectionResult: detectionForAnalyzer,
    callbacks: analyzerCallbacks,
  });

  const { retry: retryAnalyze } = useAnalyzeRetry({
    csvData,
    columnMapping: columnMapping.finalMapping,
    detectionResult: detectionForAnalyzer,
    onDuplicatesDetected: setDuplicates,
    onAnalyzeComplete: analyzerCallbacks.onAnalyzeComplete,
  });

  const { retry: retryCategorize } = useCategorizeRetry({
    csvData,
    columnMapping: columnMapping.finalMapping,
    detectionResult: detectionForAnalyzer,
    onCategorizationsReady: setCategorizations,
  });

  const { importTransactions } = useTransactionImport({
    accountId,
    categorizations: analyzedRows.categorizations,
    resolutions,
    setImportResult,
    onComplete: () => {},
  });

  const handleCancel = useCallback(async () => {
    if (
      currentStep !== ImportStep.UPLOAD &&
      currentStep !== ImportStep.IMPORT
    ) {
      const confirmed = await confirm();
      if (!confirmed) return;
    }
    reset();
    resetResolutions();
    resetUIState();
    onCancel?.();
  }, [currentStep, confirm, reset, resetResolutions, resetUIState, onCancel]);

  const handleMappingConfirm = useCallback(() => {
    const { isValid, error } = validateColumnMapping(
      columnMapping.finalMapping,
    );
    if (!isValid) {
      setError("detection", error);
      return;
    }
    setError("detection", null);
    nextStep();
  }, [columnMapping.finalMapping, nextStep, setError]);

  const handleRerunAnalyze = useCallback(async () => {
    const ok = await confirmRerun();
    if (!ok) return;
    void analyze();
  }, [confirmRerun, analyze]);

  const handleStartImport = useCallback(() => {
    nextStep();
    void importTransactions();
  }, [nextStep, importTransactions]);

  const handleCategoryChange = useCallback(
    (
      csvRowIndex: number,
      categoryId: string | null,
      _categoryName: string | null,
      isAiSuggestion?: boolean,
    ) => {
      const updated = analyzedRows.categorizations.map((cat) =>
        cat.csvRowIndex === csvRowIndex
          ? { ...cat, categoryId, userEdited: !isAiSuggestion }
          : cat,
      );
      setCategorizations(updated);
    },
    [analyzedRows.categorizations, setCategorizations],
  );

  return {
    ConfirmDialog,
    RerunConfirmDialog,
    handleCancel,
    handleMappingConfirm,
    handleStartImport,
    handleCategoryChange,
    analyze,
    handleRerunAnalyze,
    cancelAnalysis,
    retryAnalyze,
    retryCategorize,
  };
}
