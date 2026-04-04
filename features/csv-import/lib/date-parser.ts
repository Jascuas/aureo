/**
 * Date Parser
 * 
 * Multi-format date detection and parsing for CSV imports.
 * Supports European and American date formats.
 */

import type { DateFormat } from '../types/import-types';

// ============================================================================
// Date Format Patterns
// ============================================================================

type DatePattern = {
  format: DateFormat;
  regex: RegExp;
  parser: (value: string) => Date | null;
  example: string;
};

const DATE_PATTERNS: DatePattern[] = [
  // DD/MM/YYYY (European - most common in Spain)
  {
    format: 'DD/MM/YYYY',
    regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/,
    parser: (value: string) => {
      const match = value.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
      if (!match) return null;
      const [, day, month, year] = match;
      return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    },
    example: '15/03/2024',
  },
  
  // YYYY-MM-DD (ISO format)
  {
    format: 'YYYY-MM-DD',
    regex: /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/,
    parser: (value: string) => {
      const match = value.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
      if (!match) return null;
      const [, year, month, day] = match;
      return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    },
    example: '2024-03-15',
  },
  
  // MM/DD/YYYY (American)
  {
    format: 'MM/DD/YYYY',
    regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/,
    parser: (value: string) => {
      const match = value.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
      if (!match) return null;
      const [, month, day, year] = match;
      return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    },
    example: '03/15/2024',
  },
  
  // DD/MM/YY (2-digit year)
  {
    format: 'DD/MM/YY',
    regex: /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/,
    parser: (value: string) => {
      const match = value.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
      if (!match) return null;
      const [, day, month, year] = match;
      const fullYear = parseInt(year) + (parseInt(year) > 50 ? 1900 : 2000);
      return new Date(Date.UTC(fullYear, parseInt(month) - 1, parseInt(day)));
    },
    example: '15/03/24',
  },
  
  // DD-MMM-YYYY (15-Jan-2024)
  {
    format: 'DD-MMM-YYYY',
    regex: /^(\d{1,2})[\/\-\.]([A-Za-z]{3})[\/\-\.](\d{4})$/,
    parser: (value: string) => {
      const match = value.match(/^(\d{1,2})[\/\-\.]([A-Za-z]{3})[\/\-\.](\d{4})$/);
      if (!match) return null;
      const [, day, monthStr, year] = match;
      const monthMap: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
        ene: 0, // Spanish
        abr: 3,
        ago: 7,
        dic: 11,
      };
      const month = monthMap[monthStr.toLowerCase()];
      if (month === undefined) return null;
      return new Date(Date.UTC(parseInt(year), month, parseInt(day)));
    },
    example: '15-Jan-2024',
  },
];

// ============================================================================
// Date Detection
// ============================================================================

/**
 * Detect date format from sample values
 */
export function detectDateFormat(samples: string[]): {
  format: DateFormat;
  confidence: number;
} {
  const cleanedSamples = samples
    .filter(s => s && s.trim())
    .map(s => s.trim());

  if (cleanedSamples.length === 0) {
    return { format: 'unknown', confidence: 0 };
  }

  // Try each pattern
  const scores: Array<{ format: DateFormat; matches: number }> = [];

  for (const pattern of DATE_PATTERNS) {
    let matches = 0;
    let validDates = 0;

    for (const sample of cleanedSamples) {
      if (pattern.regex.test(sample)) {
        matches++;
        const parsed = pattern.parser(sample);
        if (parsed && !isNaN(parsed.getTime())) {
          validDates++;
        }
      }
    }

    if (matches > 0) {
      // Confidence = (valid dates / total samples)
      const confidence = validDates / cleanedSamples.length;
      scores.push({ format: pattern.format, matches: validDates });

      // If we have >80% match, we're confident
      if (confidence >= 0.8) {
        return { format: pattern.format, confidence };
      }
    }
  }

  // Return best match if any
  if (scores.length > 0) {
    scores.sort((a, b) => b.matches - a.matches);
    const best = scores[0];
    return {
      format: best.format,
      confidence: best.matches / cleanedSamples.length,
    };
  }

  return { format: 'unknown', confidence: 0 };
}

/**
 * Parse a date string using detected format
 */
export function parseDate(value: string, format: DateFormat): Date | null {
  if (!value || !value.trim()) return null;

  const pattern = DATE_PATTERNS.find(p => p.format === format);
  if (!pattern) return null;

  return pattern.parser(value.trim());
}

/**
 * Check if a value looks like a date
 */
export function looksLikeDate(value: string): boolean {
  if (!value || !value.trim()) return false;
  
  return DATE_PATTERNS.some(pattern => pattern.regex.test(value.trim()));
}

/**
 * Get example format string for display
 */
export function getDateFormatExample(format: DateFormat): string {
  const pattern = DATE_PATTERNS.find(p => p.format === format);
  return pattern?.example || format;
}
