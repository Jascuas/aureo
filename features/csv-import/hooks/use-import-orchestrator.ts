import { useCallback, useMemo } from "react";

import { ImportStep } from "@/features/csv-import/const/import-const";
import { useImportSession } from "@/features/csv-import/hooks/use-import-session";
import { useTransactionAnalyzer } from "@/features/csv-import/hooks/use-transaction-analyzer";
import { useTransactionImport } from "@/features/csv-import/hooks/use-transaction-import";
import { buildMappingPreview } from "@/features/csv-import/lib/transaction-mapper";
import { validateColumnMapping } from "@/features/csv-import/lib/validators";
import {
  useDuplicateResolutionActions,
  useDuplicateResolutions,
} from "@/features/csv-import/store/duplicate-resolution";
import {
  useImportUIActions,
  useImportUIState,
} from "@/features/csv-import/store/import-ui-state";
import type {
  AmountFormat,
  DateFormat,
  DuplicateMatch,
  EnrichedCategorization,
  ImportOrchestrator,
  ImportRowOutcome,
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
  const {
    currentStep,
    csvData,
    importAttemptId,
    columnMapping,
    analyzedRows,
    setDuplicates,
    setCategorizations,
    setPayeeMatches,
    setImportResult,
    nextStep,
    reset,
  } = useImportSession();

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

  const mappingFailureOutcomes = useMemo<ImportRowOutcome[]>(() => {
    if (!csvData || !columnMapping.detectionResult || !columnMapping.finalMapping) {
      return [];
    }

    return buildMappingPreview(
      csvData.rows,
      columnMapping.finalMapping,
      columnMapping.detectionResult.dateFormat,
      columnMapping.detectionResult.amountFormat,
    ).flatMap((row) =>
      row.errors.length === 0
        ? []
        : [
            {
              csvRowIndex: row.csvRowIndex,
              reason: row.errors.join(" "),
              status: "failed" as const,
            },
          ],
    );
  }, [
    columnMapping.detectionResult,
    columnMapping.finalMapping,
    csvData,
  ]);

  const analyzerCallbacks = useMemo(
    () => ({
      onAnalysisComplete: ({
        categorizations,
        duplicates,
        payeeMatches,
      }: {
        categorizations: EnrichedCategorization[];
        duplicates: DuplicateMatch[];
        payeeMatches: PayeeMatchResult[];
      }) => {
        setDuplicates(duplicates);
        setCategorizations(categorizations);
        setPayeeMatches(payeeMatches);
      },
      onError: (message: string) => setError("analyze", message),
      onComplete: nextStep,
    }),
    [
      setDuplicates,
      setPayeeMatches,
      setCategorizations,
      nextStep,
      setError,
    ],
  );

  const { analyze } = useTransactionAnalyzer({
    csvData,
    columnMapping: columnMapping.finalMapping,
    detectionResult: detectionForAnalyzer,
    callbacks: analyzerCallbacks,
  });

  const { importTransactions } = useTransactionImport({
    accountId,
    categorizations: analyzedRows.categorizations,
    importAttemptId,
    preImportFailedOutcomes: mappingFailureOutcomes,
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
    const finalMapping = columnMapping.finalMapping;
    if (!csvData || !columnMapping.detectionResult || !finalMapping) {
      setError("detection", "CSV format detection is not ready yet.");
      return;
    }
    setError("detection", null);
    nextStep();
  }, [
    columnMapping.detectionResult,
    columnMapping.finalMapping,
    csvData,
    nextStep,
    setError,
  ]);

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
    retryAnalyze: analyze,
  };
}
