import { ColumnType } from "@/features/csv-import/const/import-const";
import { validateTemplateCompatibility } from "@/features/csv-import/lib/validators";
import type {
  AmountFormat,
  ColumnDetectionResult,
  DateFormat,
} from "@/features/csv-import/types/import-types";

export type CompatibleTemplate = {
  id: string;
  accountId: string;
  name: string;
  columnMapping: Record<string, number> | unknown;
  dateFormat: string;
  amountFormat: unknown;
};

export function findCompatibleTemplate<T extends CompatibleTemplate>(
  templates: T[] | null | undefined,
  headers: string[],
): T | null {
  if (!templates || templates.length === 0) return null;
  const candidate = templates[0];
  const mapping = candidate.columnMapping as Record<string, number>;
  if (
    !validateTemplateCompatibility({ columnMapping: mapping }, headers.length)
  )
    return null;
  return candidate;
}

export function templateToDetectionResult(
  template: CompatibleTemplate,
  headers: string[],
): ColumnDetectionResult {
  const mapping = template.columnMapping as Record<string, number>;
  return {
    columns: Object.entries(mapping).map(([type, index]) => ({
      index,
      name: headers[index] || `Column ${index}`,
      type: type as ColumnType,
      confidence: 1.0,
      samples: [],
    })),
    dateFormat: template.dateFormat as DateFormat,
    amountFormat: template.amountFormat as AmountFormat,
    confidence: 1.0,
    method: "heuristic" as const,
  };
}
