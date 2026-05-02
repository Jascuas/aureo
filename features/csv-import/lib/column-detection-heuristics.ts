import { ColumnType } from "../const/import-const";
import type { AmountFormat } from "../types/import-types";
import { looksLikeDate } from "./date-parser";

export const HEADER_PATTERNS: Record<ColumnType, string[]> = {
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

export function looksLikeAmount(values: string[]): boolean {
  const cleanValues = values.filter((v) => v && v.trim());
  if (cleanValues.length === 0) return false;

  const amountRegex = /^-?\(?[\d\s.,]+\)?$/;
  const matches = cleanValues.filter((v) => amountRegex.test(v.trim()));

  return matches.length / cleanValues.length >= 0.7;
}

export function detectAmountFormat(samples: string[]): AmountFormat {
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

export function looksLikePayee(values: string[]): boolean {
  const cleanValues = values.filter((v) => v && v.trim());
  if (cleanValues.length === 0) return false;

  const avgLength =
    cleanValues.reduce((sum, v) => sum + v.length, 0) / cleanValues.length;

  const allNumbers = cleanValues.every((v) => /^[\d\s.,-]+$/.test(v));
  const allDates = cleanValues.every((v) => looksLikeDate(v));

  return avgLength > 5 && !allNumbers && !allDates;
}

export function detectColumnType(
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
