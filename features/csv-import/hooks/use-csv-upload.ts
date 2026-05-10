import { useCallback } from "react";

import { useGetTemplates } from "@/features/csv-import/api/use-get-templates";
import {
  CSVParseError,
  parseCSVFile,
} from "@/features/csv-import/lib/csv-parser";
import { MAX_IMPORT_ROWS_DEV } from "@/features/csv-import/lib/config";
import {
  findCompatibleTemplate,
  templateToDetectionResult,
} from "@/features/csv-import/lib/template-applier";
import { useDuplicateResolutionActions } from "@/features/csv-import/store/duplicate-resolution";
import { useColumnDetection } from "@/features/csv-import/hooks/use-column-detection";
import { useImportSessionActions } from "@/features/csv-import/store/import-session";
import {
  useImportUIActions,
  useImportUIState,
  useUIErrors,
  useUILoading,
} from "@/features/csv-import/store/import-ui-state";

interface UseCSVUploadOptions {
  accountId?: string;
}

interface UseCSVUploadReturn {
  uploadFile: (file: File) => Promise<void>;
  isProcessing: boolean;
  error: string | null;
}

/**
 * Orchestrates the CSV upload flow as a single event-driven action:
 *  1. parse CSV
 *  2. cap rows in dev
 *  3. set CSV data (auto-advances to MAPPING)
 *  4. reset previous duplicate resolutions
 *  5. if a compatible template exists → apply it + advance to ANALYSIS
 *  6. else → run heuristic column detection
 *
 * Replaces the previous `useTemplateAutoApply` render-time effect.
 */
export function useCSVUpload({
  accountId,
}: UseCSVUploadOptions): UseCSVUploadReturn {
  const loading = useUILoading();
  const errors = useUIErrors();
  const { setLoading, setError } = useImportUIActions();
  const resetUIState = useImportUIState((s) => s.reset);

  const { setCSVData, setDetectionResult, setFinalMapping, nextStep } =
    useImportSessionActions();
  const { reset: resetResolutions } = useDuplicateResolutionActions();

  const { data: templates } = useGetTemplates(accountId);

  const { detectColumns } = useColumnDetection({
    onDetected: (result, autoMapping) => {
      setDetectionResult(result);
      setFinalMapping(autoMapping);
    },
  });

  const uploadFile = useCallback(
    async (file: File) => {
      // A new file invalidates any prior analysis. Wipe ephemeral UI flags
      // (analyzeComplete, errors, batchProgress, loading) so the Analysis step
      // re-triggers cleanly. Persisted analyzedRows are cleared by setCSVData.
      resetUIState();
      setError("upload", null);
      setLoading("parsingCSV", true);

      try {
        const { headers, rows } = await parseCSVFile(file);
        const cappedRows =
          MAX_IMPORT_ROWS_DEV !== null
            ? rows.slice(0, MAX_IMPORT_ROWS_DEV)
            : rows;

        setCSVData(file.name, headers, cappedRows);
        resetResolutions();

        const template = findCompatibleTemplate(templates, headers);

        if (template) {
          setDetectionResult(templateToDetectionResult(template, headers));
          setFinalMapping(template.columnMapping as Record<string, number>);
          nextStep();
          return;
        }

        detectColumns(headers, cappedRows);
      } catch (err) {
        const message =
          err instanceof CSVParseError
            ? err.message
            : "Failed to parse CSV file";
        setError("upload", message);
      } finally {
        setLoading("parsingCSV", false);
      }
    },
    [
      resetUIState,
      setError,
      setLoading,
      setCSVData,
      resetResolutions,
      templates,
      setDetectionResult,
      setFinalMapping,
      nextStep,
      detectColumns,
    ],
  );

  return {
    uploadFile,
    isProcessing: loading.parsingCSV || loading.detectingColumns,
    error: errors.upload,
  };
}
