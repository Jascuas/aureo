import { memo } from "react";

import { AnalysisStep } from "@/features/csv-import/components/ai-import-steps/analysis-step";
import { ImportStep as ImportStepComponent } from "@/features/csv-import/components/ai-import-steps/import-step";
import { MappingStep } from "@/features/csv-import/components/ai-import-steps/mapping-step";
import { ReviewStep } from "@/features/csv-import/components/ai-import-steps/review-step";
import { UploadStep } from "@/features/csv-import/components/ai-import-steps/upload-step";
import { ImportStep } from "@/features/csv-import/const/import-const";
import { useDuplicateResolution } from "@/features/csv-import/store/duplicate-resolution";
import {
  useAnalyzedRows,
  useColumnMapping,
  useCSVData,
  useCurrentStep,
  useImportSessionActions,
} from "@/features/csv-import/store/import-session";

interface AiImportStepContentProps {
  accountId?: string;
  onComplete?: () => void;
  onImportAnother?: () => void;
  cancelAnalysis: () => void;
  retryAnalyze: () => Promise<void>;
  retryCategorize: () => Promise<void>;
  handleCategoryChange: (
    csvRowIndex: number,
    categoryId: string | null,
    _categoryName: string | null,
    isAiSuggestion?: boolean,
  ) => void;
}

export const AiImportStepContent = memo(function AiImportStepContent({
  accountId,
  onComplete,
  onImportAnother,
  cancelAnalysis,
  retryAnalyze,
  retryCategorize,
  handleCategoryChange,
}: AiImportStepContentProps) {
  const currentStep = useCurrentStep();
  const csvData = useCSVData();
  const columnMapping = useColumnMapping();
  const analyzedRows = useAnalyzedRows();
  const { setFinalMapping } = useImportSessionActions();
  const { skipAllExact, getPendingCount } = useDuplicateResolution();

  switch (currentStep) {
    case ImportStep.UPLOAD:
      return <UploadStep accountId={accountId} />;

    case ImportStep.MAPPING:
      return (
        <MappingStep
          accountId={accountId}
          headers={csvData!.headers}
          sampleRows={csvData!.rows.slice(0, 5).map((r) => r.data)}
          detectionResult={columnMapping.detectionResult || undefined}
          onMappingChange={setFinalMapping}
        />
      );

    case ImportStep.ANALYSIS:
      return (
        <AnalysisStep
          totalTransactions={csvData?.rows.length ?? 0}
          onCancelAnalysis={cancelAnalysis}
          onRetryAnalyze={retryAnalyze}
          onRetryCategorize={retryCategorize}
        />
      );

    case ImportStep.REVIEW:
      return (
        <ReviewStep
          duplicates={analyzedRows.duplicates}
          categorizations={analyzedRows.categorizations}
          payeeMatches={analyzedRows.payeeMatches}
          pendingDuplicatesCount={getPendingCount(analyzedRows.duplicates)}
          onSkipAll={() => skipAllExact(analyzedRows.duplicates)}
          onCategoryChange={handleCategoryChange}
        />
      );

    case ImportStep.IMPORT:
      return (
        <ImportStepComponent
          onComplete={onComplete}
          onImportAnother={onImportAnother}
        />
      );

    default:
      return null;
  }
});
