import Papa from "papaparse";

import type {
  ParsedCSV,
  ParsedCSVRow,
} from "@/features/csv-import/types/import-types";

export class CSVParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CSVParseError";
  }
}

export function parseCSVFile(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length < 2) {
          reject(new CSVParseError("CSV file is empty or has no data rows"));
          return;
        }

        const headers = results.data[0];
        const rows: ParsedCSVRow[] = results.data
          .slice(1)
          .filter((row) => row.some((cell) => cell.trim()))
          .map((row, index) => ({ index, data: row }));

        if (rows.length === 0) {
          reject(new CSVParseError("CSV contains only headers, no data rows"));
          return;
        }

        resolve({ headers, rows });
      },
      error: (error) => {
        reject(new CSVParseError(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}
