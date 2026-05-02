import type { ReactNode } from "react";

import { ImportStep } from "@/features/csv-import/const/import-const";

export function getStepTitle(
  step: ImportStep,
  accountName: string | undefined,
): ReactNode {
  const accountSpan = <span className="text-brand-green">{accountName}</span>;

  switch (step) {
    case ImportStep.UPLOAD:
      return <>Uploading data to {accountSpan}</>;
    case ImportStep.MAPPING:
      return <>Mapping columns for {accountSpan}</>;
    case ImportStep.ANALYSIS:
      return <>Analyzing {accountSpan} transactions</>;
    case ImportStep.REVIEW:
      return <>Reviewing {accountSpan} import</>;
    case ImportStep.IMPORT:
      return <>Importing data to {accountSpan}</>;
    default:
      return null;
  }
}
