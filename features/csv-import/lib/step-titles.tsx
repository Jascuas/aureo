import type { ReactNode } from "react";

import { ImportStep } from "@/features/csv-import/const/import-const";

export function getStepTitle(
  step: ImportStep,
  accountName: string | undefined,
): ReactNode {
  const accountSpan = <span className="text-crt-accent">{accountName}</span>;

  switch (step) {
    case ImportStep.UPLOAD:
      return <>Subiendo datos a {accountSpan}</>;
    case ImportStep.MAPPING:
      return <>Mapeando columnas para {accountSpan}</>;
    case ImportStep.ANALYSIS:
      return <>Analizando transacciones de {accountSpan}</>;
    case ImportStep.REVIEW:
      return <>Revisando la importación de {accountSpan}</>;
    case ImportStep.IMPORT:
      return <>Importando datos a {accountSpan}</>;
    default:
      return null;
  }
}
