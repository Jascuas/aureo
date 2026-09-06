"use client";

import { useEffect, useState } from "react";

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
import {
  ImportStepper,
  type ImportStepStatus,
} from "@/features/csv-import/components/import-stepper";
import { ImportStep } from "@/features/csv-import/const/import-const";
import { useImportOrchestrator } from "@/features/csv-import/hooks/use-import-orchestrator";
import { useImportSession } from "@/features/csv-import/hooks/use-import-session";
import { useUnloadWarning } from "@/features/csv-import/hooks/use-unload-warning";
import { getStepTitle } from "@/features/csv-import/lib/step-titles";
import { useDuplicateResolutionActions } from "@/features/csv-import/store/duplicate-resolution";
import { useUIErrors } from "@/features/csv-import/store/import-ui-state";

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
  const { currentStep, goToStep, analyzedRows, csvData, importResult } =
    useImportSession();

  const { data: accounts } = useGetAccounts();
  const errors = useUIErrors();
  const { getPendingCount } = useDuplicateResolutionActions();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const accountName =
    isMounted && accountId
      ? accounts?.find((account) => account.id === accountId)?.name
      : undefined;

  const stepStatuses: Partial<Record<ImportStep, ImportStepStatus>> = {
    [ImportStep.UPLOAD]: errors.upload ? "failed" : undefined,
    [ImportStep.MAPPING]: errors.detection
      ? "failed"
      : currentStep === ImportStep.UPLOAD && csvData
        ? "available"
        : undefined,
    [ImportStep.ANALYSIS]: errors.analyze || errors.categorize
      ? "failed"
      : currentStep === ImportStep.MAPPING && csvData
        ? "available"
        : undefined,
    [ImportStep.IMPORT]: importResult
      ? importResult.errorCount > 0
        ? "failed"
        : "completed"
      : currentStep === ImportStep.REVIEW
        ? getPendingCount(analyzedRows.duplicates) === 0
          ? "available"
          : "blocked"
        : undefined,
  };

  useUnloadWarning(currentStep);

  const {
    ConfirmDialog,
    RerunConfirmDialog,
    handleCancel,
    handleMappingConfirm,
    handleStartImport,
    handleCategoryChange,
    analyze,
    handleRerunAnalyze,
    retryAnalyze,
  } = useImportOrchestrator({ accountId, onCancel });

  return (
    <Card className="border-border border drop-shadow-sm">
      <ConfirmDialog />
      <RerunConfirmDialog />
      <CardHeader>
        <ImportStepper
          currentStep={currentStep}
          stepStatuses={stepStatuses}
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
          analyze={analyze}
          retryAnalyze={retryAnalyze}
          handleCategoryChange={handleCategoryChange}
        />
      </CardContent>

      {currentStep !== ImportStep.IMPORT && (
        <CardFooter className="flex justify-end">
          <AiImportStepActions
            handleCancel={handleCancel}
            handleMappingConfirm={handleMappingConfirm}
            handleStartImport={handleStartImport}
            handleRerunAnalyze={handleRerunAnalyze}
          />
        </CardFooter>
      )}
    </Card>
  );
};
