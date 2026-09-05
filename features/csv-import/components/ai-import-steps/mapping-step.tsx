import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { ColumnMapping } from "@/features/csv-import/components/column-mapping";
import { useUIErrors } from "@/features/csv-import/store/import-ui-state";
import type {
  AmountFormat,
  ColumnDetectionResult,
  DateFormat,
  ParsedCSVRow,
} from "@/features/csv-import/types/import-types";

type MappingStepProps = {
  accountId?: string;
  headers: string[];
  rows: ParsedCSVRow[];
  detectionResult?: ColumnDetectionResult;
  onMappingChange: (mapping: Record<string, number>) => void;
  onFormatChange: (dateFormat: DateFormat, amountFormat: AmountFormat) => void;
};

export function MappingStep({
  accountId,
  headers,
  rows,
  detectionResult,
  onMappingChange,
  onFormatChange,
}: MappingStepProps) {
  const errors = useUIErrors();

  return (
    <>
      {errors.detection && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="size-4" />
          <AlertDescription>{errors.detection}</AlertDescription>
        </Alert>
      )}
      <ColumnMapping
        accountId={accountId}
        headers={headers}
        rows={rows}
        detectionResult={detectionResult}
        onMappingChange={onMappingChange}
        onFormatChange={onFormatChange}
      />
    </>
  );
}