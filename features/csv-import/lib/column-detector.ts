import { getDefaultAIProvider } from "@/lib/ai";

import { DEFAULT_HEURISTIC_CONFIG } from "../const/import-const";
import { ColumnType } from "../const/import-const";
import type {
  AmountFormat,
  ColumnDetectionResult,
  DateFormat,
  DetectedColumn,
  HeuristicConfig,
} from "../types/import-types";
import { detectDateFormat, looksLikeDate } from "./date-parser";

const HEADER_PATTERNS: Record<ColumnType, string[]> = {
  [ColumnType.Date]: [
    "date",
    "fecha",
    "data",
    "datum",
    "transaction date",
    "fecha operacion",
    "fecha valor",
    "booking date",
    "value date",
  ],
  [ColumnType.Amount]: [
    "amount",
    "importe",
    "valor",
    "monto",
    "quantia",
    "transaction amount",
    "importe operacion",
    "debit",
    "credit",
    "débito",
    "crédito",
  ],
  [ColumnType.Payee]: [
    "payee",
    "merchant",
    "comercio",
    "beneficiario",
    "description",
    "concepto",
    "descripcion",
    "descripción",
    "details",
    "detalle",
    "detalles",
  ],
  [ColumnType.Description]: [
    "description",
    "descripcion",
    "descripción",
    "concept",
    "concepto",
    "memo",
    "note",
    "nota",
    "details",
    "detalle",
    "detalles",
  ],
  [ColumnType.Notes]: [
    "notes",
    "notas",
    "observations",
    "observaciones",
    "reference",
    "referencia",
    "comments",
    "comentarios",
  ],
  [ColumnType.Balance]: [
    "balance",
    "saldo",
    "saldo disponible",
    "available balance",
    "current balance",
  ],
  [ColumnType.Category]: [
    "category",
    "categoria",
    "categoría",
    "type",
    "tipo",
    "classification",
  ],
  [ColumnType.Unknown]: [],
};

function looksLikeAmount(values: string[]): boolean {
  const cleanValues = values.filter((v) => v && v.trim());
  if (cleanValues.length === 0) return false;

  const amountRegex = /^-?\(?[\d\s.,]+\)?$/;
  const matches = cleanValues.filter((v) => amountRegex.test(v.trim()));

  return matches.length / cleanValues.length >= 0.7;
}

function detectAmountFormat(samples: string[]): AmountFormat {
  const cleanSamples = samples
    .filter((s) => s && s.trim())
    .map((s) => s.trim());

  if (cleanSamples.length === 0) {
    return {
      decimalSeparator: ".",
      thousandsSeparator: ",",
      isNegativeExpense: false,
    };
  }

  let commaAsDecimal = 0;
  let dotAsDecimal = 0;
  let hasNegative = false;

  for (const sample of cleanSamples) {
    if (sample.startsWith("-") || sample.startsWith("(")) {
      hasNegative = true;
    }

    if (/\d+\.\d{3},\d{2}/.test(sample)) {
      commaAsDecimal++;
    } else if (/\d+,\d{3}\.\d{2}/.test(sample)) {
      dotAsDecimal++;
    } else if (/\d+,\d{1,2}$/.test(sample)) {
      commaAsDecimal++;
    } else if (/\d+\.\d{1,2}$/.test(sample)) {
      dotAsDecimal++;
    }
  }

  const decimalSeparator = commaAsDecimal > dotAsDecimal ? "," : ".";
  const thousandsSeparator = decimalSeparator === "," ? "." : ",";

  return {
    decimalSeparator,
    thousandsSeparator,
    isNegativeExpense: hasNegative,
  };
}

function looksLikePayee(values: string[]): boolean {
  const cleanValues = values.filter((v) => v && v.trim());
  if (cleanValues.length === 0) return false;

  const avgLength =
    cleanValues.reduce((sum, v) => sum + v.length, 0) / cleanValues.length;

  const allNumbers = cleanValues.every((v) => /^[\d\s.,-]+$/.test(v));
  const allDates = cleanValues.every((v) => looksLikeDate(v));

  return avgLength > 5 && !allNumbers && !allDates;
}

function detectColumnType(
  columnName: string,
  values: string[],
): { type: ColumnType; confidence: number } {
  const lowerName = columnName.toLowerCase().trim();

  for (const [type, patterns] of Object.entries(HEADER_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerName.includes(pattern.toLowerCase())) {
        return { type: type as ColumnType, confidence: 0.9 };
      }
    }
  }

  const cleanValues = values.filter((v) => v && v.trim());

  if (cleanValues.length === 0) {
    return { type: ColumnType.Unknown, confidence: 0 };
  }

  if (cleanValues.some((v) => looksLikeDate(v))) {
    const dateMatches = cleanValues.filter((v) => looksLikeDate(v)).length;
    const confidence = dateMatches / cleanValues.length;
    if (confidence >= 0.7) {
      return { type: ColumnType.Date, confidence };
    }
  }

  if (looksLikeAmount(cleanValues)) {
    return { type: ColumnType.Amount, confidence: 0.75 };
  }

  if (looksLikePayee(cleanValues)) {
    return { type: ColumnType.Payee, confidence: 0.7 };
  }

  if (looksLikeAmount(cleanValues) && lowerName.includes("saldo")) {
    return { type: ColumnType.Balance, confidence: 0.8 };
  }

  return { type: ColumnType.Unknown, confidence: 0.3 };
}

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
