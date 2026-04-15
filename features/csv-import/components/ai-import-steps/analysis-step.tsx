import { useEffect, useRef, useState } from "react";

import { AnalysisSection } from "@/features/csv-import/components/analysis-section";
import { useCategorizeRetry } from "@/features/csv-import/hooks/use-categorize-retry";
import { useDuplicateRetry } from "@/features/csv-import/hooks/use-duplicate-retry";
import { useTransactionAnalyzer } from "@/features/csv-import/hooks/use-transaction-analyzer";
import { useImportUIState } from "@/features/csv-import/store/import-ui-state";
import type {
  AmountFormat,
  ColumnDetectionResult,
  DateFormat,
  ParsedCSVRow,
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
  const [duplicatesComplete, setDuplicatesComplete] = useState(false);
  const [isCategorizationStarted, setIsCategorizationStarted] = useState(false);
  const [simulatedProgress, setSimulatedProgress] = useState(0);
  const simulatedProgressRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const totalTransactions = csvData?.rows.length ?? 0;

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
      onDuplicatesDetected: (duplicates) => {
        setDuplicatesComplete(true);
        onDuplicatesDetected(duplicates);
      },
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

  // Simulated progress for duplicate detection phase
  // Animates 0→90% over 4s; jumps to 100% when detection completes
  useEffect(() => {
    if (isDetectingDuplicates) {
      setSimulatedProgress(0);
      const DURATION_MS = 4000;
      const TARGET = 90;
      const TICK_MS = 50;
      const increment = (TARGET / DURATION_MS) * TICK_MS;

      simulatedProgressRef.current = setInterval(() => {
        setSimulatedProgress((prev) => {
          if (prev >= TARGET) {
            clearInterval(simulatedProgressRef.current!);
            return TARGET;
          }
          return Math.min(prev + increment, TARGET);
        });
      }, TICK_MS);
    } else {
      if (simulatedProgressRef.current) {
        clearInterval(simulatedProgressRef.current);
        simulatedProgressRef.current = null;
      }
      if (duplicatesComplete) {
        setSimulatedProgress(100);
      }
    }

    return () => {
      if (simulatedProgressRef.current) {
        clearInterval(simulatedProgressRef.current);
        simulatedProgressRef.current = null;
      }
    };
  }, [isDetectingDuplicates, duplicatesComplete]);

  useEffect(() => {
    if (isCategorizing) setIsCategorizationStarted(true);
  }, [isCategorizing]);

  useEffect(() => {
    if (
      !isDetectingDuplicates &&
      !isCategorizing &&
      !errors.analysis &&
      analyzedRows.categorizations.length > 0
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
    <AnalysisSection
      isDetectingDuplicates={isDetectingDuplicates}
      isCategorizing={isCategorizing}
      isDuplicatesComplete={duplicatesComplete}
      isCategorizationStarted={isCategorizationStarted}
      duplicateError={null}
      categorizeError={null}
      onRetryDuplicates={retryDuplicates}
      onRetryCategorize={retryCategorize}
      batchProgress={batchProgress}
      onCancelAnalysis={cancel}
      simulatedProgress={simulatedProgress}
      totalTransactions={totalTransactions}
    />
  );
}
