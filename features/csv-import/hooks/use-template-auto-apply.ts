import { useEffect } from "react";
import { ImportStep } from "@/features/csv-import/const/import-const";
import { validateTemplateCompatibility } from "@/features/csv-import/lib/validators";

interface UseTemplateAutoApplyOptions {
  currentStep: ImportStep;
  csvData: { headers: string[] } | null;
  accountId: string | undefined;
  templatesResponse: { data: any[] } | null;
  onTemplateApplied: (template: any) => void;
  onAutoAdvance: () => void;
}

export function useTemplateAutoApply({
  currentStep,
  csvData,
  accountId,
  templatesResponse,
  onTemplateApplied,
  onAutoAdvance,
}: UseTemplateAutoApplyOptions) {
  useEffect(() => {
    if (
      currentStep !== ImportStep.MAPPING ||
      !csvData ||
      !accountId ||
      !templatesResponse ||
      !("data" in templatesResponse) ||
      templatesResponse.data.length === 0
    ) {
      return;
    }

    const template = templatesResponse.data[0];

    if (!validateTemplateCompatibility(template, csvData.headers.length)) {
      return;
    }

    onTemplateApplied(template);
    onAutoAdvance();
  }, [
    currentStep,
    csvData,
    accountId,
    templatesResponse,
    onTemplateApplied,
    onAutoAdvance,
  ]);
}
