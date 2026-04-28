import { convertAmountToMilliunits, parseAmount } from "@/lib/utils";
import { parseDate } from "@/features/csv-import/lib/date-parser";
import { ColumnType } from "@/features/csv-import/const/import-const";
import type {
  ParsedCSVRow,
  TransactionForAnalysis,
  AmountFormat,
  DateFormat,
} from "@/features/csv-import/types/import-types";

export function prepareTransactionsForAnalysis(
  rows: ParsedCSVRow[],
  mapping: Record<string, number>,
  dateFormat: DateFormat,
  amountFormat: AmountFormat,
): TransactionForAnalysis[] {
  return rows.map((row) => {
    const amountValue = parseAmount(
      row.data[mapping[ColumnType.Amount]!],
      amountFormat.decimalSeparator,
      amountFormat.thousandsSeparator,
    );

    const dateValue = row.data[mapping[ColumnType.Date]!];
    let parsedDate = parseDate(dateValue, dateFormat);

    if (!parsedDate && dateFormat.includes("YYYY")) {
      const yyFormat = dateFormat.replace("YYYY", "YY") as DateFormat;
      parsedDate = parseDate(dateValue, yyFormat);
    }

    const dateISO = parsedDate?.toISOString().split("T")[0] || dateValue;

    return {
      csvRowIndex: row.index,
      date: dateISO,
      amount: convertAmountToMilliunits(amountValue),
      payee: row.data[mapping[ColumnType.Payee]!],
      description:
        mapping[ColumnType.Description] !== undefined
          ? row.data[mapping[ColumnType.Description]]
          : undefined,
      notes:
        mapping[ColumnType.Notes] !== undefined
          ? row.data[mapping[ColumnType.Notes]]
          : undefined,
    };
  });
}

export function transformDuplicates<
  T extends { existingTransaction: { date: string | Date } },
>(duplicates: T[]): T[] {
  return duplicates.map((dup) => ({
    ...dup,
    existingTransaction: {
      ...dup.existingTransaction,
      date: new Date(dup.existingTransaction.date),
    },
  }));
}
