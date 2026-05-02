"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGetAccounts } from "@/features/accounts/api/use-get-accounts";
import { AiImportStepActions } from "@/features/csv-import/components/ai-import-step-actions";
import { AiImportStepContent } from "@/features/csv-import/components/ai-import-step-content";
import { ImportStepper } from "@/features/csv-import/components/import-stepper";
import { ImportStep } from "@/features/csv-import/const/import-const";
import { useImportOrchestrator } from "@/features/csv-import/hooks/use-import-orchestrator";
import { useUnloadWarning } from "@/features/csv-import/hooks/use-unload-warning";
import { getStepTitle } from "@/features/csv-import/lib/step-titles";
import {
  useCurrentStep,
  useImportSessionActions,
} from "@/features/csv-import/store/import-session";

type AiImportCardProps = {
  accountId?: string;
  onComplete?: () => void;
  onCancel?: () => void;
  onImportAnother?: () => void;
};

export const AiImportCard = ({
  accountId,
  onComplete,
  onCancel,
  onImportAnother,
}: AiImportCardProps) => {
  const currentStep = useCurrentStep();
  const { goToStep } = useImportSessionActions();

  const { data: accounts } = useGetAccounts();
  const accountName = accountId
    ? accounts?.find((a) => a.id === accountId)?.name
    : undefined;

  useUnloadWarning(currentStep);

  const {
    ConfirmDialog,
    handleCancel,
    handleMappingConfirm,
    handleStartImport,
    handleCategoryChange,
    cancelAnalysis,
    retryAnalyze,
    retryCategorize,
  } = useImportOrchestrator({ accountId, onCancel });

  return (
    <Card className="border-none drop-shadow-sm">
      <ConfirmDialog />
      <CardHeader>
        <ImportStepper
          currentStep={currentStep}
          onStepClick={(step) => {
            if (step === ImportStep.UPLOAD || step === ImportStep.MAPPING) {
              goToStep(step);
            }
          }}
        />
        <CardTitle>{getStepTitle(currentStep, accountName)}</CardTitle>
      </CardHeader>

      <CardContent className="min-h-100">
        <AiImportStepContent
          accountId={accountId}
          onComplete={onComplete}
          onImportAnother={onImportAnother}
          cancelAnalysis={cancelAnalysis}
          retryAnalyze={retryAnalyze}
          retryCategorize={retryCategorize}
          handleCategoryChange={handleCategoryChange}
        />
      </CardContent>

      {currentStep !== ImportStep.IMPORT && (
        <CardFooter className="flex justify-end">
          <AiImportStepActions
            handleCancel={handleCancel}
            handleMappingConfirm={handleMappingConfirm}
            handleStartImport={handleStartImport}
          />
        </CardFooter>
      )}
    </Card>
  );
};
