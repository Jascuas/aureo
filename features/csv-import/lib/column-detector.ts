import { getDefaultAIProvider } from "@/lib/ai";

import { DEFAULT_HEURISTIC_CONFIG } from "../const/import-const";
import { ColumnType } from "../const/import-const";
import type {
  ColumnDetectionResult,
  DateFormat,
  DetectedColumn,
  HeuristicConfig,
} from "../types/import-types";
import {
  detectAmountFormat,
  detectColumnType,
} from "./column-detection-heuristics";
import { detectDateFormat } from "./date-parser";

export async function detectColumns(
  headers: string[],
  rows: string[][],
  config: HeuristicConfig = DEFAULT_HEURISTIC_CONFIG,
): Promise<ColumnDetectionResult> {
  const sampleRows = rows.slice(0, Math.min(config.sampleSize, rows.length));

  const detectedColumns: DetectedColumn[] = [];
  let totalConfidence = 0;

  for (let i = 0; i < headers.length; i++) {
    const columnName = headers[i];
    const columnValues = sampleRows.map((row) => row[i] || "");

    const { type, confidence } = detectColumnType(columnName, columnValues);

    detectedColumns.push({
      index: i,
      name: columnName,
      type,
      confidence,
      samples: columnValues.slice(0, 3),
    });

    totalConfidence += confidence;
  }

  const overallConfidence = totalConfidence / headers.length;

  const dateColumn = detectedColumns.find(
    (col) => col.type === ColumnType.Date,
  );
  const dateFormatResult = dateColumn
    ? detectDateFormat(dateColumn.samples)
    : { format: "unknown" as const, confidence: 0 };

  const amountColumn = detectedColumns.find(
    (col) => col.type === ColumnType.Amount,
  );
  const amountFormat = amountColumn
    ? detectAmountFormat(amountColumn.samples)
    : {
        decimalSeparator: "." as const,
        thousandsSeparator: "," as const,
        isNegativeExpense: false,
      };

  if (config.enableAIFallback && overallConfidence < config.minConfidence) {
    console.log(
      `Heuristic confidence too low (${overallConfidence.toFixed(2)}), falling back to AI...`,
    );

    try {
      const ai = getDefaultAIProvider();
      const aiResult = await ai.detectColumns({
        headers,
        sampleRows,
      });

      return {
        columns: aiResult.columns.map((col) => ({
          index: col.index,
          name: col.name,
          type: col.detectedType as ColumnType,
          confidence: col.confidence,
          samples: sampleRows.map((row) => row[col.index] || "").slice(0, 3),
        })),
        dateFormat:
          (aiResult.dateFormat as DateFormat | undefined) || "unknown",
        amountFormat: aiResult.amountFormat || amountFormat,
        confidence:
          aiResult.columns.reduce((sum, col) => sum + col.confidence, 0) /
          aiResult.columns.length,
        method: "ai",
      };
    } catch (error) {
      console.error("AI fallback failed:", error);
    }
  }

  return {
    columns: detectedColumns,
    dateFormat: dateFormatResult.format,
    amountFormat,
    confidence: overallConfidence,
    method: "heuristic",
  };
}

export function createColumnMapping(
  detectionResult: ColumnDetectionResult,
): Record<string, number> {
  const mapping: Record<string, number> = {};

  for (const column of detectionResult.columns) {
    if (column.type !== ColumnType.Unknown && column.confidence >= 0.5) {
      if (!mapping[column.type]) {
        mapping[column.type] = column.index;
      }
    }
  }

  return mapping;
}
