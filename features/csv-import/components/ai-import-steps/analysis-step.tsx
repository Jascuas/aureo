import { useEffect, useRef } from "react";

import { AnalysisSection } from "@/features/csv-import/components/analysis-section";
import { useImportSession } from "@/features/csv-import/hooks/use-import-session";
import {
  useAnalyzeComplete,
  useBatchProgress,
  useImportUIActions,
  useUIErrors,
  useUILoading,
} from "@/features/csv-import/store/import-ui-state";

type AnalysisStepProps = {
  analyze: () => Promise<void>;
  onRetryAnalyze: () => void;
};

export function AnalysisStep({
  analyze,
  onRetryAnalyze,
}: AnalysisStepProps) {
  const loading = useUILoading();
  const errors = useUIErrors();
  const batchProgress = useBatchProgress();
  const analyzeComplete = useAnalyzeComplete();
  const { analyzedRows } = useImportSession();
  const { setAnalyzeComplete } = useImportUIActions();
  const isAnalyzing = loading.analyzing;

  useEffect(() => {
    if (!analyzeComplete && analyzedRows.categorizations.length > 0) {
      setAnalyzeComplete(true);
    }
  }, [analyzeComplete, analyzedRows.categorizations.length, setAnalyzeComplete]);

  const didFireRef = useRef(false);
  useEffect(() => {
    if (didFireRef.current || isAnalyzing || analyzeComplete || errors.analyze) {
      return;
    }

    didFireRef.current = true;
    void analyze();
  }, [analyze, analyzeComplete, errors.analyze, isAnalyzing]);

  return (
    <AnalysisSection
      analyzeError={errors.analyze}
      batchProgress={batchProgress}
      isAnalyzing={isAnalyzing}
      isAnalyzeComplete={analyzeComplete}
      onRetryAnalyze={onRetryAnalyze}
    />
  );
}
