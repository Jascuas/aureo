/**
 * Column Detector
 * 
 * Heuristic-based column type detection for CSV imports.
 * Uses pattern matching and keyword analysis to identify column types.
 */

import type {
  ColumnType,
  DetectedColumn,
  ColumnDetectionResult,
  AmountFormat,
  HeuristicConfig,
  DEFAULT_HEURISTIC_CONFIG,
} from '../types/import-types';
import { detectDateFormat, looksLikeDate } from './date-parser';
import { getDefaultAIProvider } from '@/lib/ai';

// ============================================================================
// Header Keyword Patterns
// ============================================================================

const HEADER_PATTERNS: Record<ColumnType, string[]> = {
  date: [
    'date', 'fecha', 'data', 'datum',
    'transaction date', 'fecha operacion', 'fecha valor',
    'booking date', 'value date',
  ],
  amount: [
    'amount', 'importe', 'valor', 'monto', 'quantia',
    'transaction amount', 'importe operacion',
    'debit', 'credit', 'débito', 'crédito',
  ],
  payee: [
    'payee', 'merchant', 'comercio', 'beneficiario',
    'description', 'concepto', 'descripcion', 'descripción',
    'details', 'detalle', 'detalles',
  ],
  description: [
    'description', 'descripcion', 'descripción',
    'concept', 'concepto', 'memo', 'note', 'nota',
    'details', 'detalle', 'detalles',
  ],
  notes: [
    'notes', 'notas', 'observations', 'observaciones',
    'reference', 'referencia', 'comments', 'comentarios',
  ],
  balance: [
    'balance', 'saldo', 'saldo disponible',
    'available balance', 'current balance',
  ],
  category: [
    'category', 'categoria', 'categoría',
    'type', 'tipo', 'classification',
  ],
  unknown: [],
};

// ============================================================================
// Content Pattern Detection
// ============================================================================

/**
 * Check if values look like amounts
 */
function looksLikeAmount(values: string[]): boolean {
  const cleanValues = values.filter(v => v && v.trim());
  if (cleanValues.length === 0) return false;

  // Amount patterns: 1234.56, -1234.56, 1.234,56, (1234.56)
  const amountRegex = /^-?\(?[\d\s.,]+\)?$/;
  const matches = cleanValues.filter(v => amountRegex.test(v.trim()));

  return matches.length / cleanValues.length >= 0.7;
}

/**
 * Detect amount format from samples
 */
function detectAmountFormat(samples: string[]): AmountFormat {
  const cleanSamples = samples
    .filter(s => s && s.trim())
    .map(s => s.trim());

  if (cleanSamples.length === 0) {
    return {
      decimalSeparator: '.',
      thousandsSeparator: ',',
      isNegativeExpense: false,
    };
  }

  // Count decimal separators
  let commaAsDecimal = 0;
  let dotAsDecimal = 0;
  let hasNegative = false;

  for (const sample of cleanSamples) {
    // Check for negative
    if (sample.startsWith('-') || sample.startsWith('(')) {
      hasNegative = true;
    }

    // 1.234,56 → comma is decimal
    if (/\d+\.\d{3},\d{2}/.test(sample)) {
      commaAsDecimal++;
    }
    // 1,234.56 → dot is decimal
    else if (/\d+,\d{3}\.\d{2}/.test(sample)) {
      dotAsDecimal++;
    }
    // 1234,56 → comma is decimal
    else if (/\d+,\d{1,2}$/.test(sample)) {
      commaAsDecimal++;
    }
    // 1234.56 → dot is decimal
    else if (/\d+\.\d{1,2}$/.test(sample)) {
      dotAsDecimal++;
    }
  }

  const decimalSeparator = commaAsDecimal > dotAsDecimal ? ',' : '.';
  const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';

  return {
    decimalSeparator,
    thousandsSeparator,
    isNegativeExpense: hasNegative,
  };
}

/**
 * Check if values look like merchant/payee names
 */
function looksLikePayee(values: string[]): boolean {
  const cleanValues = values.filter(v => v && v.trim());
  if (cleanValues.length === 0) return false;

  // Payees are typically longer text strings
  const avgLength = cleanValues.reduce((sum, v) => sum + v.length, 0) / cleanValues.length;
  
  // Payees have varied content (not all numbers, not all dates)
  const allNumbers = cleanValues.every(v => /^[\d\s.,\-]+$/.test(v));
  const allDates = cleanValues.every(v => looksLikeDate(v));

  return avgLength > 5 && !allNumbers && !allDates;
}

// ============================================================================
// Column Type Detection
// ============================================================================

/**
 * Detect column type using header name and sample values
 */
function detectColumnType(
  columnName: string,
  values: string[]
): { type: ColumnType; confidence: number } {
  const lowerName = columnName.toLowerCase().trim();

  // Check header patterns first (high confidence)
  for (const [type, patterns] of Object.entries(HEADER_PATTERNS)) {
    for (const pattern of patterns) {
      if (lowerName.includes(pattern.toLowerCase())) {
        return { type: type as ColumnType, confidence: 0.9 };
      }
    }
  }

  // Fallback to content-based detection (medium confidence)
  const cleanValues = values.filter(v => v && v.trim());
  
  if (cleanValues.length === 0) {
    return { type: 'unknown', confidence: 0 };
  }

  // Check if looks like date
  if (cleanValues.some(v => looksLikeDate(v))) {
    const dateMatches = cleanValues.filter(v => looksLikeDate(v)).length;
    const confidence = dateMatches / cleanValues.length;
    if (confidence >= 0.7) {
      return { type: 'date', confidence };
    }
  }

  // Check if looks like amount
  if (looksLikeAmount(cleanValues)) {
    return { type: 'amount', confidence: 0.75 };
  }

  // Check if looks like payee/merchant
  if (looksLikePayee(cleanValues)) {
    return { type: 'payee', confidence: 0.7 };
  }

  // Check if looks like balance (similar to amount but usually at the end)
  if (looksLikeAmount(cleanValues) && lowerName.includes('saldo')) {
    return { type: 'balance', confidence: 0.8 };
  }

  return { type: 'unknown', confidence: 0.3 };
}

// ============================================================================
// Main Detection Function
// ============================================================================

/**
 * Detect column types using heuristics
 */
export async function detectColumns(
  headers: string[],
  rows: string[][],
  config: HeuristicConfig = DEFAULT_HEURISTIC_CONFIG
): Promise<ColumnDetectionResult> {
  // Sample rows for analysis
  const sampleRows = rows.slice(0, Math.min(config.sampleSize, rows.length));

  // Detect each column
  const detectedColumns: DetectedColumn[] = [];
  let totalConfidence = 0;

  for (let i = 0; i < headers.length; i++) {
    const columnName = headers[i];
    const columnValues = sampleRows.map(row => row[i] || '');

    const { type, confidence } = detectColumnType(columnName, columnValues);

    detectedColumns.push({
      index: i,
      name: columnName,
      type,
      confidence,
      samples: columnValues.slice(0, 3), // First 3 samples
    });

    totalConfidence += confidence;
  }

  const overallConfidence = totalConfidence / headers.length;

  // Detect date format
  const dateColumn = detectedColumns.find(col => col.type === 'date');
  const dateFormatResult = dateColumn
    ? detectDateFormat(dateColumn.samples)
    : { format: 'unknown' as const, confidence: 0 };

  // Detect amount format
  const amountColumn = detectedColumns.find(col => col.type === 'amount');
  const amountFormat = amountColumn
    ? detectAmountFormat(amountColumn.samples)
    : {
        decimalSeparator: '.' as const,
        thousandsSeparator: ',' as const,
        isNegativeExpense: false,
      };

  // Use AI fallback if confidence is low
  if (config.enableAIFallback && overallConfidence < config.minConfidence) {
    console.log(
      `Heuristic confidence too low (${overallConfidence.toFixed(2)}), falling back to AI...`
    );

    try {
      const ai = getDefaultAIProvider();
      const aiResult = await ai.detectColumns({
        headers,
        sampleRows,
      });

      // Convert AI result to our format
      return {
        columns: aiResult.columns.map(col => ({
          index: col.index,
          name: col.name,
          type: col.detectedType as ColumnType,
          confidence: col.confidence,
          samples: sampleRows.map(row => row[col.index] || '').slice(0, 3),
        })),
        dateFormat: aiResult.dateFormat || 'unknown',
        amountFormat: aiResult.amountFormat || amountFormat,
        confidence: aiResult.columns.reduce((sum, col) => sum + col.confidence, 0) / aiResult.columns.length,
        method: 'ai',
      };
    } catch (error) {
      console.error('AI fallback failed:', error);
      // Continue with heuristic result
    }
  }

  return {
    columns: detectedColumns,
    dateFormat: dateFormatResult.format,
    amountFormat,
    confidence: overallConfidence,
    method: 'heuristic',
  };
}

/**
 * Create column mapping from detection result
 * Maps field names to column indices
 */
export function createColumnMapping(
  detectionResult: ColumnDetectionResult
): Record<string, number> {
  const mapping: Record<string, number> = {};

  for (const column of detectionResult.columns) {
    if (column.type !== 'unknown' && column.confidence >= 0.5) {
      // Use the first detected column of each type
      if (!mapping[column.type]) {
        mapping[column.type] = column.index;
      }
    }
  }

  return mapping;
}
