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

async function decodeCSVFile(
  file: File,
): Promise<{ content: string; encoding: ParsedCSV["encoding"] }> {
  const bytes = await file.arrayBuffer();

  try {
    return {
      content: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      encoding: "utf-8",
    };
  } catch {
    return {
      content: new TextDecoder("windows-1252").decode(bytes),
      encoding: "windows-1252",
    };
  }
}

export async function parseCSVFile(file: File): Promise<ParsedCSV> {
  const { content, encoding } = await decodeCSVFile(file);

  return new Promise((resolve, reject) => {
    Papa.parse<string[]>(content, {
      skipEmptyLines: false,
      complete: (results) => {
        if (!results.data || results.data.length < 2) {
          reject(new CSVParseError("CSV file is empty or has no data rows"));
          return;
        }

        const headers = results.data[0].map((header, index) =>
          index === 0 ? header.replace(/^\uFEFF/, "") : header,
        );
        if (!headers.some((header) => header.trim())) {
          reject(new CSVParseError("CSV header row is empty"));
          return;
        }

        const rows: ParsedCSVRow[] = results.data
          .slice(1)
          .map((row, index) => ({ row, index }))
          .filter(({ row }) => row.some((cell) => cell.trim()))
          .map(({ row, index }) => {
            const parserErrors = results.errors
              .filter((error) => error.row === index + 1)
              .map((error) => error.message);
            const widthError =
              row.length === headers.length
                ? []
                : [
                    `CSV row has ${row.length} cells; expected ${headers.length}.`,
                  ];

            return {
              index,
              data: row,
              errors: [...new Set([...parserErrors, ...widthError])],
            };
          });

        if (rows.length === 0) {
          reject(new CSVParseError("CSV contains only headers, no data rows"));
          return;
        }

        const fileErrors = results.errors.filter(
          (error) => error.row === undefined || error.row < 1,
        );
        if (fileErrors.length > 0) {
          reject(
            new CSVParseError(
              `Failed to parse CSV: ${fileErrors.map((error) => error.message).join("; ")}`,
            ),
          );
          return;
        }

        resolve({ headers, rows, encoding });
      },
      error: (error: Error) => {
        reject(new CSVParseError(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}
