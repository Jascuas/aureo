"use client";

import React, { useCallback } from "react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useGetAccounts } from "@/features/accounts/api/use-get-accounts";
import { useGetTemplates } from "@/features/csv-import/api/use-get-templates";
import { AnalysisActions } from "@/features/csv-import/components/ai-import-actions/analysis-actions";
import { MappingActions } from "@/features/csv-import/components/ai-import-actions/mapping-actions";
import { ReviewActions } from "@/features/csv-import/components/ai-import-actions/review-actions";
import { UploadActions } from "@/features/csv-import/components/ai-import-actions/upload-actions";
import { AnalysisStep } from "@/features/csv-import/components/ai-import-steps/analysis-step";
import { ImportStep as ImportStepComponent } from "@/features/csv-import/components/ai-import-steps/import-step";
import { MappingStep } from "@/features/csv-import/components/ai-import-steps/mapping-step";
import { ReviewStep } from "@/features/csv-import/components/ai-import-steps/review-step";
import { UploadStep } from "@/features/csv-import/components/ai-import-steps/upload-step";
import { ImportStepper } from "@/features/csv-import/components/import-stepper";
import { useDuplicateResolution } from "@/features/csv-import/hooks/use-duplicate-resolution";
import { useImportSession } from "@/features/csv-import/hooks/use-import-session";
import { useTemplateAutoApply } from "@/features/csv-import/hooks/use-template-auto-apply";
import { useUnloadWarning } from "@/features/csv-import/hooks/use-unload-warning";
import { validateColumnMapping } from "@/features/csv-import/lib/validators";
import { useImportUIState } from "@/features/csv-import/store/import-ui-state";
import {
  IMPORT_STEPS,
  type ImportStep,
} from "@/features/csv-import/types/import-types";
import { useConfirm } from "@/hooks/use-confirm";

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
  const {
    currentStep,
    csvData,
    columnMapping,
    analyzedRows,
    setCSVData,
    setDetectionResult,
    setFinalMapping,
    setDuplicates,
    setCategorizations,
    nextStep,
    previousStep,
    goToStep,
    reset,
  } = useImportSession();

  const {
    resolutions,
    skipAllExact,
    getPendingCount,
    reset: resetResolutions,
  } = useDuplicateResolution();

  const { data: templatesResponse } = useGetTemplates(accountId);
  const { data: accounts } = useGetAccounts();
  const accountName = accountId
    ? accounts?.find((a) => a.id === accountId)?.name
    : undefined;
  const { loading, errors, setError } = useImportUIState();

  const [ConfirmDialog, confirm] = useConfirm(
    "Are you sure?",
    "All progress will be lost.",
  );

  const pendingDuplicatesCount = getPendingCount(analyzedRows.duplicates);

  useTemplateAutoApply({
    currentStep,
    csvData,
    accountId,
    templatesResponse: templatesResponse
      ? { data: (templatesResponse as any).data ?? [] }
      : null,
    onTemplateApplied: (template) => {
      setDetectionResult({
        columns: Object.entries(
          template.columnMapping as Record<string, number>,
        ).map(([type, index]) => ({
          index,
          name: csvData!.headers[index] || `Column ${index}`,
          type: type as any,
          confidence: 1.0,
          samples: [],
        })),
        dateFormat: template.dateFormat as any,
        amountFormat: template.amountFormat as any,
        confidence: 1.0,
        method: "heuristic" as const,
      });
      setFinalMapping(template.columnMapping as Record<string, number>);
    },
    onAutoAdvance: nextStep,
  });

  useUnloadWarning(currentStep);

  const handleCancel = useCallback(async () => {
    if (
      currentStep !== IMPORT_STEPS.UPLOAD &&
      currentStep !== IMPORT_STEPS.IMPORT
    ) {
      const confirmed = await confirm();
      if (!confirmed) return;
    }

    reset();
    resetResolutions();
    onCancel?.();
  }, [currentStep, confirm, reset, resetResolutions, onCancel]);

  const handleMappingConfirm = useCallback(() => {
    const { isValid, error } = validateColumnMapping(
      columnMapping.finalMapping,
    );
    if (!isValid) {
      setError("detection", error);
      return;
    }
    setError("detection", null);
    nextStep();
  }, [columnMapping.finalMapping, nextStep, setError]);

  const handleCategoryChange = useCallback(
    (
      csvRowIndex: number,
      categoryId: string | null,
      _categoryName: string | null,
    ) => {
      const updated = analyzedRows.categorizations.map((cat) =>
        cat.csvRowIndex === csvRowIndex ? { ...cat, categoryId } : cat,
      );
      setCategorizations(updated);
    },
    [analyzedRows.categorizations, setCategorizations],
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case IMPORT_STEPS.UPLOAD:
        return (
          <UploadStep
            setCSVData={(fileName, headers, rows) => {
              // QA/test: limitar a 10 transacciones importadas
              setCSVData(fileName, headers, rows.slice(0, 10));
              resetResolutions();
            }}
            setDetectionResult={setDetectionResult}
            setFinalMapping={setFinalMapping}
          />
        );

      case IMPORT_STEPS.MAPPING:
        return (
          <MappingStep
            accountId={accountId}
            headers={csvData!.headers}
            sampleRows={csvData!.rows.slice(0, 5).map((r) => r.data)}
            detectionResult={columnMapping.detectionResult || undefined}
            onMappingChange={setFinalMapping}
          />
        );

      case IMPORT_STEPS.ANALYSIS:
        return (
          <AnalysisStep
            csvData={csvData}
            columnMapping={columnMapping}
            analyzedRows={analyzedRows}
            onDuplicatesDetected={setDuplicates}
            onCategorizationsReady={setCategorizations}
            onComplete={nextStep}
          />
        );

      case IMPORT_STEPS.REVIEW:
        return (
          <ReviewStep
            duplicates={analyzedRows.duplicates}
            categorizations={analyzedRows.categorizations}
            pendingDuplicatesCount={pendingDuplicatesCount}
            onSkipAll={() => skipAllExact(analyzedRows.duplicates)}
            onCategoryChange={handleCategoryChange}
          />
        );

      case IMPORT_STEPS.IMPORT:
        return (
          <ImportStepComponent
            accountId={accountId}
            onComplete={onComplete}
            onImportAnother={onImportAnother}
          />
        );

      default:
        return null;
    }
  };

  const renderStepActions = () => {
    switch (currentStep) {
      case IMPORT_STEPS.UPLOAD:
        return <UploadActions onCancel={handleCancel} />;

      case IMPORT_STEPS.MAPPING:
        return (
          <MappingActions
            onCancel={handleCancel}
            onContinue={handleMappingConfirm}
          />
        );

      case IMPORT_STEPS.ANALYSIS:
        return (
          <AnalysisActions
            onCancel={handleCancel}
            onBack={previousStep}
            onContinue={nextStep}
            isAnalyzing={loading.detectingDuplicates || loading.categorizing}
            hasError={!!errors.analysis}
            duplicatesCount={analyzedRows.duplicates.length}
          />
        );

      case IMPORT_STEPS.REVIEW: {
        const transactionsToImport = analyzedRows.categorizations.filter(
          (cat) => {
            const resolution = resolutions.find(
              (r) => r.csvIndex === cat.csvRowIndex,
            );
            return resolution?.action !== "skip";
          },
        ).length;

        return (
          <ReviewActions
            onCancel={handleCancel}
            onImport={nextStep}
            transactionsToImport={transactionsToImport}
            hasUnresolvedDuplicates={pendingDuplicatesCount > 0}
          />
        );
      }

      case IMPORT_STEPS.IMPORT:
        return null;

      default:
        return null;
    }
  };

  const STEP_TITLES: Record<ImportStep, React.ReactNode> = {
    [IMPORT_STEPS.UPLOAD]: (
      <>
        Uploading data to{" "}
        <span className="text-brand-green">{accountName}</span>
      </>
    ),
    [IMPORT_STEPS.MAPPING]: (
      <>
        Mapping columns for{" "}
        <span className="text-brand-green">{accountName}</span>
      </>
    ),
    [IMPORT_STEPS.ANALYSIS]: (
      <>
        Analyzing <span className="text-brand-green">{accountName}</span>{" "}
        transactions
      </>
    ),
    [IMPORT_STEPS.REVIEW]: (
      <>
        Reviewing <span className="text-brand-green">{accountName}</span> import
      </>
    ),
    [IMPORT_STEPS.IMPORT]: (
      <>
        Importing data to{" "}
        <span className="text-brand-green">{accountName}</span>
      </>
    ),
  };

  return (
    <Card className="border-none drop-shadow-sm">
      <ConfirmDialog />
      <CardHeader>
        <ImportStepper
          currentStep={currentStep}
          onStepClick={(step) => {
            if (step === IMPORT_STEPS.UPLOAD || step === IMPORT_STEPS.MAPPING) {
              goToStep(step);
            }
          }}
        />
        <CardTitle>{STEP_TITLES[currentStep]}</CardTitle>
      </CardHeader>

      <CardContent className="min-h-100">{renderStepContent()}</CardContent>

      {renderStepActions() && (
        <CardFooter className="flex justify-end">
          {renderStepActions()}
        </CardFooter>
      )}
    </Card>
  );
};
