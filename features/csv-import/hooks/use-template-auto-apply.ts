import { useEffect } from "react";
import {
  IMPORT_STEPS,
  type ImportStep,
} from "@/features/csv-import/types/import-types";
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
      currentStep !== IMPORT_STEPS.MAPPING ||
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
