import { useEffect, useRef, useState } from "react";

import { AnalysisSection } from "@/features/csv-import/components/analysis-section";
import { useCategorizeRetry } from "@/features/csv-import/hooks/use-categorize-retry";
import { useAnalyzeRetry } from "@/features/csv-import/hooks/use-analyze-retry";
import { useTransactionAnalyzer } from "@/features/csv-import/hooks/use-transaction-analyzer";
import { useImportUIState } from "@/features/csv-import/store/import-ui-state";
import type {
  AmountFormat,
  ColumnDetectionResult,
  DateFormat,
  ParsedCSVRow,
} from "@/features/csv-import/types/import-types";
import type { AITransaction } from "@/features/csv-import/lib/analyzer";

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
  onAnalyzeComplete: (opts: {
    autoResolved: any[];
    aiTransactions: AITransaction[];
    payeeMatches: any[];
  }) => void;
  onComplete: () => void;
}

export function AnalysisStep({
  csvData,
  columnMapping,
  analyzedRows,
  onDuplicatesDetected,
  onCategorizationsReady,
  onAnalyzeComplete,
  onComplete,
}: AnalysisStepProps) {
  const { loading, errors, batchProgress } = useImportUIState();
  const hasStartedRef = useRef(false);
  const [analyzeComplete, setAnalyzeComplete] = useState(false);
  const [isCategorizationStarted, setIsCategorizationStarted] = useState(false);

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
      onDuplicatesDetected,
      onAnalyzeComplete: (opts) => {
        setAnalyzeComplete(true);
        onAnalyzeComplete(opts);
      },
      onCategorizationsReady,
      onError: () => {},
      onComplete: () => {},
    },
  });

  const { retry: retryAnalyze } = useAnalyzeRetry({
    csvData,
    columnMapping: columnMapping.finalMapping,
    detectionResult: detectionResultForAnalyzer,
    onDuplicatesDetected,
    onAnalyzeComplete: (opts) => {
      setAnalyzeComplete(true);
      onAnalyzeComplete(opts);
    },
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
  }, []);

  const isAnalyzing = loading.analyzing;
  const isCategorizing = loading.categorizing;

  useEffect(() => {
    if (isCategorizing) setIsCategorizationStarted(true);
  }, [isCategorizing]);

  useEffect(() => {
    if (
      !isAnalyzing &&
      !isCategorizing &&
      !errors.analyze &&
      !errors.categorize &&
      analyzedRows.categorizations.length > 0
    ) {
      onComplete();
    }
  }, [
    isAnalyzing,
    isCategorizing,
    errors.analyze,
    errors.categorize,
    analyzedRows,
    onComplete,
  ]);

  return (
    <AnalysisSection
      isAnalyzing={isAnalyzing}
      isCategorizing={isCategorizing}
      isAnalyzeComplete={analyzeComplete}
      isCategorizationStarted={isCategorizationStarted}
      analyzeError={errors.analyze}
      categorizeError={errors.categorize}
      onRetryAnalyze={retryAnalyze}
      onRetryCategorize={retryCategorize}
      batchProgress={batchProgress}
      onCancelAnalysis={cancel}
      totalTransactions={totalTransactions}
    />
  );
}
