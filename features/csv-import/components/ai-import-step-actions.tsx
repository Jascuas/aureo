import { memo } from "react";

import { AnalysisActions } from "@/features/csv-import/components/ai-import-actions/analysis-actions";
import { MappingActions } from "@/features/csv-import/components/ai-import-actions/mapping-actions";
import { ReviewActions } from "@/features/csv-import/components/ai-import-actions/review-actions";
import { UploadActions } from "@/features/csv-import/components/ai-import-actions/upload-actions";
import {
  ImportStep,
  Resolution,
} from "@/features/csv-import/const/import-const";
import {
  useDuplicateResolutionActions,
  useDuplicateResolutions,
} from "@/features/csv-import/store/duplicate-resolution";
import {
  useAnalyzedRows,
  useCurrentStep,
  useImportSessionActions,
} from "@/features/csv-import/store/import-session";
import {
  useUIErrors,
  useUILoading,
} from "@/features/csv-import/store/import-ui-state";

interface AiImportStepActionsProps {
  handleCancel: () => Promise<void>;
  handleMappingConfirm: () => void;
  handleStartImport: () => void;
}

export const AiImportStepActions = memo(function AiImportStepActions({
  handleCancel,
  handleMappingConfirm,
  handleStartImport,
}: AiImportStepActionsProps) {
  const currentStep = useCurrentStep();
  const analyzedRows = useAnalyzedRows();
  const { previousStep, nextStep } = useImportSessionActions();
  const resolutions = useDuplicateResolutions();
  const { getPendingCount } = useDuplicateResolutionActions();
  const loading = useUILoading();
  const errors = useUIErrors();

  switch (currentStep) {
    case ImportStep.UPLOAD:
      return <UploadActions onCancel={handleCancel} />;

    case ImportStep.MAPPING:
      return (
        <MappingActions
          onCancel={handleCancel}
          onContinue={handleMappingConfirm}
        />
      );

    case ImportStep.ANALYSIS:
      return (
        <AnalysisActions
          onCancel={handleCancel}
          onBack={previousStep}
          onContinue={nextStep}
          isAnalyzing={loading.analyzing || loading.categorizing}
          hasError={!!(errors.analyze || errors.categorize)}
          duplicatesCount={analyzedRows.duplicates.length}
        />
      );

    case ImportStep.REVIEW: {
      const transactionsToImport = analyzedRows.categorizations.filter(
        (cat) => {
          const resolution = resolutions.find(
            (r) => r.csvIndex === cat.csvRowIndex,
          );
          return resolution?.action !== Resolution.Skip;
        },
      ).length;

      return (
        <ReviewActions
          onCancel={handleCancel}
          onImport={handleStartImport}
          transactionsToImport={transactionsToImport}
          hasUnresolvedDuplicates={getPendingCount(analyzedRows.duplicates) > 0}
        />
      );
    }

    case ImportStep.IMPORT:
    default:
      return null;
  }
});
