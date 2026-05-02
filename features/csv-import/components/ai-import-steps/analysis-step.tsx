import { AnalysisSection } from "@/features/csv-import/components/analysis-section";
import {
  useAnalyzeComplete,
  useBatchProgress,
  useUIErrors,
  useUILoading,
} from "@/features/csv-import/store/import-ui-state";
import { useAnalyzedRows } from "@/features/csv-import/store/import-session";

interface AnalysisStepProps {
  totalTransactions: number;
  onCancelAnalysis: () => void;
  onRetryAnalyze: () => void;
  onRetryCategorize: () => void;
}

export function AnalysisStep({
  totalTransactions,
  onCancelAnalysis,
  onRetryAnalyze,
  onRetryCategorize,
}: AnalysisStepProps) {
  const loading = useUILoading();
  const errors = useUIErrors();
  const batchProgress = useBatchProgress();
  const analyzeComplete = useAnalyzeComplete();
  const analyzedRows = useAnalyzedRows();

  const isAnalyzing = loading.analyzing;
  const isCategorizing = loading.categorizing;

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
