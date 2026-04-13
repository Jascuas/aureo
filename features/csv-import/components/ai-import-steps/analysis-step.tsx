import { useEffect, useRef } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

import { AnalysisSection } from "@/features/csv-import/components/analysis-section";
import { useCategorizeRetry } from "@/features/csv-import/hooks/use-categorize-retry";
import { useDuplicateRetry } from "@/features/csv-import/hooks/use-duplicate-retry";
import { useTransactionAnalyzer } from "@/features/csv-import/hooks/use-transaction-analyzer";
import { useImportUIState } from "@/features/csv-import/store/import-ui-state";
import type {
  ParsedCSVRow,
  ColumnDetectionResult,
  DateFormat,
  AmountFormat,
} from "@/features/csv-import/types/import-types";

interface AnalysisStepProps {
  csvData: { fileName: string; headers: string[]; rows: ParsedCSVRow[] } | null;
  columnMapping: {
    detectionResult: ColumnDetectionResult | null;
    finalMapping: Record<string, number> | null;
  };
  analyzedRows: {
    categorizations: any[];
    duplicates: any[];
  };
  onDuplicatesDetected: (duplicates: any[]) => void;
  onCategorizationsReady: (categorizations: any[]) => void;
  onComplete: () => void;
}

export function AnalysisStep({
  csvData,
  columnMapping,
  analyzedRows,
  onDuplicatesDetected,
  onCategorizationsReady,
  onComplete,
}: AnalysisStepProps) {
  const { loading, errors, batchProgress } = useImportUIState();
  const hasStartedRef = useRef(false);

  const detectionResultForAnalyzer = columnMapping.detectionResult
    ? {
        dateFormat: columnMapping.detectionResult.dateFormat as DateFormat,
        amountFormat: columnMapping.detectionResult
          .amountFormat as AmountFormat,
      }
    : null;

  const { analyze, cancel } = useTransactionAnalyzer({
    csvData,
    columnMapping: columnMapping.finalMapping,
    detectionResult: detectionResultForAnalyzer,
    callbacks: {
      onDuplicatesDetected,
      onCategorizationsReady,
      onError: () => {},
      onComplete: () => {},
    },
  });

  const { retry: retryDuplicates } = useDuplicateRetry({
    csvData,
    columnMapping: columnMapping.finalMapping,
    detectionResult: detectionResultForAnalyzer,
    onDuplicatesDetected,
  });

  const { retry: retryCategorize } = useCategorizeRetry({
    csvData,
    columnMapping: columnMapping.finalMapping,
    detectionResult: detectionResultForAnalyzer,
    onCategorizationsReady,
  });

  useEffect(() => {
    if (hasStartedRef.current) return;
    if (analyzedRows.categorizations.length > 0) return;
    hasStartedRef.current = true;
    analyze();
    // analyze is stable (useCallback with no mutation deps), safe to depend on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDetectingDuplicates = loading.detectingDuplicates;
  const isCategorizing = loading.categorizing;

  useEffect(() => {
    if (
      !isDetectingDuplicates &&
      !isCategorizing &&
      !errors.analysis &&
      analyzedRows.categorizations.length > 0 &&
      analyzedRows.duplicates.length === 0
    ) {
      onComplete();
    }
  }, [
    isDetectingDuplicates,
    isCategorizing,
    errors.analysis,
    analyzedRows,
    onComplete,
  ]);

  return (
    <>
      {errors.analysis && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="size-4" />
          <AlertDescription className="whitespace-pre-line">
            {errors.analysis}
          </AlertDescription>
        </Alert>
      )}
      <AnalysisSection
        isDetectingDuplicates={isDetectingDuplicates}
        isCategorizing={isCategorizing}
        duplicateError={null}
        categorizeError={null}
        onRetryDuplicates={retryDuplicates}
        onRetryCategorize={retryCategorize}
        batchProgress={batchProgress}
        onCancelAnalysis={cancel}
      />
    </>
  );
}
