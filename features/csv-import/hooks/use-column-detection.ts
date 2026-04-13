import { useCallback } from "react";
import type {
  ParsedCSVRow,
  ColumnDetectionResult,
  DateFormat,
} from "@/features/csv-import/types/import-types";
import { useImportUIState } from "@/features/csv-import/store/import-ui-state";

interface UseColumnDetectionOptions {
  onDetected: (
    result: ColumnDetectionResult,
    autoMapping: Record<string, number>,
  ) => void;
}

interface UseColumnDetectionReturn {
  detectColumns: (headers: string[], rows: ParsedCSVRow[]) => void;
  isProcessing: boolean;
  error: string | null;
}

export function useColumnDetection({
  onDetected,
}: UseColumnDetectionOptions): UseColumnDetectionReturn {
  const { loading, errors, setLoading, setError } = useImportUIState();

  const detectColumns = useCallback(
    (headers: string[], rows: ParsedCSVRow[]) => {
      setError("detection", null);
      setLoading("detectingColumns", true);

      try {
        const detectionResult: ColumnDetectionResult = {
          columns: headers.map((header, index) => {
            let type:
              | "date"
              | "amount"
              | "payee"
              | "description"
              | "notes"
              | "category"
              | "balance"
              | "unknown" = "unknown";
            let confidence = 0;

            const lowerHeader = header.toLowerCase();

            if (/(date|fecha)/i.test(lowerHeader)) {
              type = "date";
              confidence = 0.9;
            } else if (/(amount|importe|monto|valor)/i.test(lowerHeader)) {
              type = "amount";
              confidence = 0.9;
            } else if (
              /(payee|merchant|tienda|comercio|beneficiario)/i.test(lowerHeader)
            ) {
              type = "payee";
              confidence = 0.85;
            } else if (
              /(description|desc|concepto|detalle)/i.test(lowerHeader)
            ) {
              type = "description";
              confidence = 0.8;
            } else if (/(note|nota)/i.test(lowerHeader)) {
              type = "notes";
              confidence = 0.75;
            } else if (/(category|categor)/i.test(lowerHeader)) {
              type = "category";
              confidence = 0.8;
            } else if (/(balance|saldo)/i.test(lowerHeader)) {
              type = "balance";
              confidence = 0.8;
            }

            const samples = rows.slice(0, 5).map((r) => r.data[index] || "");

            return {
              index,
              name: header,
              type,
              confidence,
              samples,
            };
          }),
          dateFormat: "DD/MM/YYYY" as DateFormat,
          amountFormat: {
            decimalSeparator: "," as const,
            thousandsSeparator: "." as const,
            isNegativeExpense: true,
          },
          confidence: 0.85,
          method: "heuristic" as const,
        };

        const autoMapping: Record<string, number> = {};
        detectionResult.columns.forEach((col) => {
          if (col.type !== "unknown") {
            autoMapping[col.type] = col.index;
          }
        });

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
