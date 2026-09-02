import { useCallback } from "react";

import {
  createColumnMapping,
  detectColumns as detectColumnsFromSamples,
} from "@/features/csv-import/lib/column-detector";
import {
  useImportUIActions,
  useUIErrors,
  useUILoading,
} from "@/features/csv-import/store/import-ui-state";
import type {
  ColumnDetectionResult,
  ParsedCSVRow,
} from "@/features/csv-import/types/import-types";

interface UseColumnDetectionOptions {
  onDetected: (
    result: ColumnDetectionResult,
    autoMapping: Record<string, number>,
  ) => void;
}

interface UseColumnDetectionReturn {
  detectColumns: (headers: string[], rows: ParsedCSVRow[]) => Promise<void>;
  isProcessing: boolean;
  error: string | null;
}

export function useColumnDetection({
  onDetected,
}: UseColumnDetectionOptions): UseColumnDetectionReturn {
  const loading = useUILoading();
  const errors = useUIErrors();
  const { setLoading, setError } = useImportUIActions();

  const detectColumns = useCallback(
    async (headers: string[], rows: ParsedCSVRow[]) => {
      setError("detection", null);
      setLoading("detectingColumns", true);

      try {
        const detectionResult = await detectColumnsFromSamples(
          headers,
          rows.map((row) => row.data),
          { enableAIFallback: false, minConfidence: 0.7, sampleSize: 10 },
        );
        const autoMapping = createColumnMapping(detectionResult);

        onDetected(detectionResult, autoMapping);
      } catch {
        setError(
          "detection",
          "Failed to detect columns. Please map them manually.",
        );
      } finally {
        setLoading("detectingColumns", false);
      }
    },
    [setLoading, setError, onDetected],
  );

  return {
    detectColumns,
    isProcessing: loading.detectingColumns,
    error: errors.detection,
  };
}
