import { useCallback } from "react";
import Papa from "papaparse";

import { FileUploadSection } from "@/features/csv-import/components/file-upload-section";
import { useImportUIState } from "@/features/csv-import/store/import-ui-state";
import { useColumnDetection } from "@/features/csv-import/hooks/use-column-detection";
import type { ParsedCSVRow } from "@/features/csv-import/types/import-types";

interface UploadStepProps {
  setCSVData: (
    fileName: string,
    headers: string[],
    rows: ParsedCSVRow[],
  ) => void;
  setDetectionResult: (result: any) => void;
  setFinalMapping: (mapping: Record<string, number>) => void;
}

export function UploadStep({
  setCSVData,
  setDetectionResult,
  setFinalMapping,
}: UploadStepProps) {
  const { loading, errors, setLoading, setError } = useImportUIState();

  const { detectColumns } = useColumnDetection({
    onDetected: (result, autoMapping) => {
      setDetectionResult(result);
      setFinalMapping(autoMapping);
    },
  });

  const handleFileSelected = useCallback(
    (file: File) => {
      setError("upload", null);
      setLoading("parsingCSV", true);

      Papa.parse<string[]>(file, {
        complete: (results) => {
          if (!results.data || results.data.length < 2) {
            setError("upload", "CSV file is empty or has no data rows");
            setLoading("parsingCSV", false);
            return;
          }

          const headers = results.data[0];
          const rows: ParsedCSVRow[] = results.data
            .slice(1)
            .filter((row) => row.some((cell) => cell.trim()))
            .map((row, index) => ({ index, data: row }));

          if (rows.length === 0) {
            setError("upload", "CSV contains only headers, no data rows");
            setLoading("parsingCSV", false);
            return;
          }

          setCSVData(file.name, headers, rows);
          setLoading("parsingCSV", false);

          detectColumns(headers, rows);
        },
        error: (error) => {
          setError("upload", `Failed to parse CSV: ${error.message}`);
          setLoading("parsingCSV", false);
        },
        skipEmptyLines: true,
      });
    },
    [setCSVData, setLoading, setError, detectColumns],
  );

  return (
    <FileUploadSection
      onFileSelected={handleFileSelected}
      isProcessing={loading.parsingCSV || loading.detectingColumns}
      error={errors.upload}
    />
  );
}
