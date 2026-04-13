import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { ColumnMapping } from "@/features/csv-import/components/column-mapping";
import { useImportUIState } from "@/features/csv-import/store/import-ui-state";

interface MappingStepProps {
  accountId?: string;
  headers: string[];
  sampleRows: string[][];
  detectionResult: any;
  onMappingChange: (mapping: Record<string, number>) => void;
}

export function MappingStep({
  accountId,
  headers,
  sampleRows,
  detectionResult,
  onMappingChange,
}: MappingStepProps) {
  const { errors } = useImportUIState();

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
        sampleRows={sampleRows}
        detectionResult={detectionResult}
        onMappingChange={onMappingChange}
        onFormatChange={() => {}}
      />
    </>
  );
}
