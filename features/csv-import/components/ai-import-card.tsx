"use client";

import { useCallback } from "react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
import { IMPORT_STEPS } from "@/features/csv-import/types/import-types";

type AiImportCardProps = {
  accountId?: string;
  onComplete?: () => void;
  onCancel?: () => void;
};

export const AiImportCard = ({
  accountId,
  onComplete,
  onCancel,
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
    reset,
  } = useImportSession();

  const {
    resolutions,
    skipAllExact,
    getPendingCount,
    reset: resetResolutions,
  } = useDuplicateResolution();

  const { data: templatesResponse } = useGetTemplates(accountId);
  const { loading, errors, setError } = useImportUIState();

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

  const handleCancel = useCallback(() => {
    if (
      currentStep !== IMPORT_STEPS.UPLOAD &&
      currentStep !== IMPORT_STEPS.IMPORT
    ) {
      const confirmed = window.confirm(
        "Are you sure? All progress will be lost.",
      );
      if (!confirmed) return;
    }

    reset();
    resetResolutions();
    onCancel?.();
  }, [currentStep, reset, resetResolutions, onCancel]);

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
            onComplete={() => {
              if (analyzedRows.duplicates.length === 0) {
                nextStep();
              }
            }}
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
          <ImportStepComponent accountId={accountId} onComplete={onComplete} />
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

  return (
    <Card className="border-none drop-shadow-sm">
      <CardHeader>
        <CardTitle>AI-Powered CSV Import</CardTitle>
        <ImportStepper currentStep={currentStep} />
      </CardHeader>

      <CardContent className="min-h-[400px]">{renderStepContent()}</CardContent>

      {renderStepActions() && (
        <CardFooter className="flex justify-end">
          {renderStepActions()}
        </CardFooter>
      )}
    </Card>
  );
};
