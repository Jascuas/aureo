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
import { ImportStepper } from "@/features/csv-import/components/import-stepper";
import { ImportStep } from "@/features/csv-import/const/import-const";
import { useImportOrchestrator } from "@/features/csv-import/hooks/use-import-orchestrator";
import { useImportSession } from "@/features/csv-import/hooks/use-import-session";
import { useUnloadWarning } from "@/features/csv-import/hooks/use-unload-warning";
import { getStepTitle } from "@/features/csv-import/lib/step-titles";

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
  const { currentStep, goToStep } = useImportSession();

  const { data: accounts } = useGetAccounts();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const accountName =
    isMounted && accountId
      ? accounts?.find((account) => account.id === accountId)?.name
      : undefined;

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
