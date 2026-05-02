import { ColumnType } from "@/features/csv-import/const/import-const";
import { validateTemplateCompatibility } from "@/features/csv-import/lib/validators";
import type {
  AmountFormat,
  ColumnDetectionResult,
  DateFormat,
  ImportTemplate,
} from "@/features/csv-import/types/import-types";

type TemplatesResponse =
  | { data: ImportTemplate[] }
  | ImportTemplate[]
  | null
  | undefined;

function extractTemplates(response: TemplatesResponse): ImportTemplate[] {
  if (!response) return [];
  if (Array.isArray(response)) return response;
  if ("data" in response && Array.isArray(response.data)) return response.data;
  return [];
}

export function findCompatibleTemplate(
  response: TemplatesResponse,
  headers: string[],
): ImportTemplate | null {
  const templates = extractTemplates(response);
  if (templates.length === 0) return null;
  const candidate = templates[0];
  if (!validateTemplateCompatibility(candidate, headers.length)) return null;
  return candidate;
}

export function templateToDetectionResult(
  template: ImportTemplate,
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
