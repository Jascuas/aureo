import assert from "node:assert/strict";
import { File } from "node:buffer";

import { parseImportAmount } from "../features/csv-import/lib/amount-parser.ts";
import { parseCSVFile } from "../features/csv-import/lib/csv-parser.ts";
import { detectDateFormat, parseDate } from "../features/csv-import/lib/date-parser.ts";

const euFormat = {
  decimalSeparator: "," as const,
  thousandsSeparator: "." as const,
  isNegativeExpense: true,
};
const usFormat = {
  decimalSeparator: "." as const,
  thousandsSeparator: "," as const,
  isNegativeExpense: true,
};
const spaceDotFormat = {
  decimalSeparator: "." as const,
  thousandsSeparator: " " as const,
  isNegativeExpense: true,
};
const spaceCommaFormat = {
  decimalSeparator: "," as const,
  thousandsSeparator: " " as const,
  isNegativeExpense: true,
};
const plainDotFormat = {
  decimalSeparator: "." as const,
  thousandsSeparator: "" as const,
  isNegativeExpense: true,
};
const plainCommaFormat = {
  decimalSeparator: "," as const,
  thousandsSeparator: "" as const,
  isNegativeExpense: true,
};

function assertDate(value: string, format: Parameters<typeof parseDate>[1]) {
  const date = parseDate(value, format);
  assert.ok(date, `${value} must parse as ${format}`);
}

async function main() {
  assert.deepEqual(detectDateFormat(["31/12/2024", "15/01/2025"]), {
    format: "DD/MM/YYYY",
    confidence: 1,
  });
  assert.deepEqual(detectDateFormat(["12/31/2024", "01/15/2025"]), {
    format: "MM/DD/YYYY",
    confidence: 1,
  });
  assert.deepEqual(detectDateFormat(["01/02/2024", "03/04/2024"]), {
    format: "unknown",
    confidence: 0,
  });

  for (const [value, format] of [
    ["31/12/2024", "DD/MM/YYYY"],
    ["12/31/2024", "MM/DD/YYYY"],
    ["2024-12-31", "YYYY-MM-DD"],
    ["31-12-2024", "DD-MM-YYYY"],
    ["31/12/24", "DD/MM/YY"],
    ["12/31/24", "MM/DD/YY"],
    ["31-Dec-2024", "DD-MMM-YYYY"],
    ["31-Dec-24", "DD-MMM-YY"],
    ["2024/12/31", "YYYY/MM/DD"],
  ] as const) {
    assertDate(value, format);
  }
  assert.equal(parseDate("31/02/2024", "DD/MM/YYYY"), null);

  assert.equal(parseImportAmount("1.234,56", euFormat), 1234.56);
  assert.equal(parseImportAmount("1,234.56", usFormat), 1234.56);
  assert.equal(parseImportAmount("1 234.56", spaceDotFormat), 1234.56);
  assert.equal(parseImportAmount("1 234,56", spaceCommaFormat), 1234.56);
  assert.equal(parseImportAmount("1234.56", plainDotFormat), 1234.56);
  assert.equal(parseImportAmount("1234,56", plainCommaFormat), 1234.56);
  assert.equal(parseImportAmount("(12.34)", usFormat), -12.34);
  assert.equal(parseImportAmount("12.34abc", usFormat), null);
  assert.equal(parseImportAmount("", euFormat), null);

  const malformed = new File(
    ["Date,Amount,Payee\n31/12/2024,12,34,Coffee\n01/01/2025,5.00\n"],
    "malformed.csv",
    { type: "text/csv" },
  );
  const parsedMalformed = await parseCSVFile(malformed);
  assert.equal(parsedMalformed.rows[0].index, 0);
  assert.equal(parsedMalformed.rows[1].index, 1);
  assert.ok(parsedMalformed.rows.every((row) => row.errors.length > 0));

  const windows1252 = new File(
    [
      Uint8Array.from([
        ...Buffer.from("Date,Amount,Payee\n31/12/2024,12.34,Caf"),
        0xe9,
        ...Buffer.from("\n"),
      ]),
    ],
    "bank.csv",
    { type: "text/csv" },
  );
  const parsedWindows1252 = await parseCSVFile(windows1252);
  assert.equal(parsedWindows1252.encoding, "windows-1252");
  assert.equal(parsedWindows1252.rows[0].data[2], "Café");

  console.log("CSV import contract fixtures passed: EU, US, ambiguous date, invalid date, malformed rows, and Windows-1252.");
}

await main();
