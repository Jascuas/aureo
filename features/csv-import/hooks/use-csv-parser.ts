import { useCallback } from "react";
import Papa from "papaparse";
import type { ParsedCSVRow } from "@/features/csv-import/types/import-types";
import { useImportUIState } from "@/features/csv-import/store/import-ui-state";

interface UseCSVParserOptions {
  onParsed: (fileName: string, headers: string[], rows: ParsedCSVRow[]) => void;
}

interface UseCSVParserReturn {
  parseFile: (file: File) => void;
  isProcessing: boolean;
  error: string | null;
}

export function useCSVParser({
  onParsed,
}: UseCSVParserOptions): UseCSVParserReturn {
  const { loading, errors, setLoading, setError } = useImportUIState();

  const parseFile = useCallback(
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
            .map((row, index) => ({
              index,
              data: row,
            }));

          if (rows.length === 0) {
            setError("upload", "CSV contains only headers, no data rows");
            setLoading("parsingCSV", false);
            return;
          }

          onParsed(file.name, headers, rows);
          setLoading("parsingCSV", false);
        },
        error: (error) => {
          setError("upload", `Failed to parse CSV: ${error.message}`);
          setLoading("parsingCSV", false);
        },
        skipEmptyLines: true,
      });
    },
    [onParsed, setLoading, setError],
  );

  return {
    parseFile,
    isProcessing: loading.parsingCSV,
    error: errors.upload,
  };
}
