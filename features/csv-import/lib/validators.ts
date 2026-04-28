import { ColumnType } from "@/features/csv-import/const/import-const";

export function validateColumnMapping(mapping: Record<string, number> | null): {
  isValid: boolean;
  error: string | null;
} {
  if (!mapping) {
    return { isValid: false, error: "Please complete the column mapping" };
  }

  const date = mapping[ColumnType.Date];
  const amount = mapping[ColumnType.Amount];
  const payee = mapping[ColumnType.Payee];
  if (date === undefined || amount === undefined || payee === undefined) {
    return {
      isValid: false,
      error: "Date, Amount, and Payee columns are required",
    };
  }

  return { isValid: true, error: null };
}

export function validateTemplateCompatibility(
  template: { columnMapping: Record<string, number> },
  headerCount: number,
): boolean {
  const templateIndices = Object.values(
    template.columnMapping as Record<string, number>,
  );
  const maxIndex = Math.max(...templateIndices);
  return maxIndex < headerCount;
}
