import { useEffect, useRef } from "react";

import { AnalysisSection } from "@/features/csv-import/components/analysis-section";
import { useAnalyzedRows } from "@/features/csv-import/store/import-session";
import {
  useAnalyzeComplete,
  useBatchProgress,
  useImportUIActions,
  useUIErrors,
  useUILoading,
} from "@/features/csv-import/store/import-ui-state";

interface AnalysisStepProps {
  totalTransactions: number;
  analyze: () => Promise<void>;
  onCancelAnalysis: () => void;
  onRetryAnalyze: () => void;
  onRetryCategorize: () => void;
}

export function AnalysisStep({
  totalTransactions,
  analyze,
  onCancelAnalysis,
  onRetryAnalyze,
  onRetryCategorize,
}: AnalysisStepProps) {
  const loading = useUILoading();
  const errors = useUIErrors();
  const batchProgress = useBatchProgress();
  const analyzeComplete = useAnalyzeComplete();
  const analyzedRows = useAnalyzedRows();
  const { setAnalyzeComplete } = useImportUIActions();

  const isAnalyzing = loading.analyzing;
  const isCategorizing = loading.categorizing;

  // Rehydrate the ephemeral analyzeComplete flag from persisted session state.
  // After a page reload, the UI store resets to defaults but the session store
  // (which holds analyzedRows) is restored from sessionStorage. If
  // categorizations are present, analysis previously completed.
  useEffect(() => {
    if (!analyzeComplete && analyzedRows.categorizations.length > 0) {
      setAnalyzeComplete(true);
    }
  }, [
    analyzeComplete,
    analyzedRows.categorizations.length,
    setAnalyzeComplete,
  ]);

  // Auto-trigger analysis on mount when entering this step without prior
  // results (covers the normal mapping → analysis flow, template-driven
  // auto-advance, and page reloads). Skip when:
  //  - results are already present in-memory (back navigation from review),
  //  - an analysis is already in flight,
  //  - a previous run errored (user must manually retry).
  const didFireRef = useRef(false);
  useEffect(() => {
    if (didFireRef.current) return;
    if (isAnalyzing || isCategorizing) return;
    if (analyzeComplete) return;
    if (errors.analyze || errors.categorize) return;
    didFireRef.current = true;
    void analyze();
  }, [
    analyze,
    analyzeComplete,
    isAnalyzing,
    isCategorizing,
    errors.analyze,
    errors.categorize,
  ]);

  // Categorization is "started" once it has begun OR has produced rows.
  const isCategorizationStarted =
    isCategorizing || analyzedRows.aiTransactions.length > 0;

  return (
    <AnalysisSection
      isAnalyzing={isAnalyzing}
      isCategorizing={isCategorizing}
      isAnalyzeComplete={analyzeComplete}
      isCategorizationStarted={isCategorizationStarted}
      analyzeError={errors.analyze}
      categorizeError={errors.categorize}
      onRetryAnalyze={onRetryAnalyze}
      onRetryCategorize={onRetryCategorize}
      batchProgress={batchProgress}
      onCancelAnalysis={onCancelAnalysis}
      totalTransactions={totalTransactions}
    />
  );
}
