import { ColumnType } from "@/features/csv-import/const/import-const";
import { parseImportAmount } from "@/features/csv-import/lib/amount-parser";
import { parseDate } from "@/features/csv-import/lib/date-parser";
import type {
  AmountFormat,
  DateFormat,
  MappingPreviewRow,
  ParsedCSVRow,
  TransactionForAnalysis,
} from "@/features/csv-import/types/import-types";
import { convertAmountToMilliunits } from "@/lib/utils";

function getCell(row: ParsedCSVRow, columnIndex: number | undefined): string {
  return columnIndex === undefined ? "" : (row.data[columnIndex] ?? "");
}

export function buildMappingPreview(
  rows: ParsedCSVRow[],
  mapping: Record<string, number>,
  dateFormat: DateFormat,
  amountFormat: AmountFormat,
): MappingPreviewRow[] {
  return rows.map((row) => {
    const rawDate = getCell(row, mapping[ColumnType.Date]);
    const rawAmount = getCell(row, mapping[ColumnType.Amount]);
    const payee = getCell(row, mapping[ColumnType.Payee]).trim();
    const date =
      dateFormat === "unknown" ? null : parseDate(rawDate, dateFormat);
    const parsedAmount = parseImportAmount(rawAmount, amountFormat);
    const amount =
      parsedAmount === null ? null : convertAmountToMilliunits(parsedAmount);
    const errors = [...row.errors];

    if (mapping[ColumnType.Date] === undefined) {
      errors.push("Mapea una columna de fecha.");
    } else if (!rawDate.trim()) {
      errors.push("El campo Fecha es obligatorio.");
    } else if (dateFormat === "unknown") {
      errors.push("Selecciona un formato de fecha sin ambigüedades.");
    } else if (!date) {
      errors.push(`La fecha "${rawDate}" no coincide con ${dateFormat}.`);
    }

    if (mapping[ColumnType.Amount] === undefined) {
      errors.push("Mapea una columna de importe.");
    } else if (!rawAmount.trim()) {
      errors.push("El importe es obligatorio.");
    } else if (amount === null) {
      errors.push(
        `El importe "${rawAmount}" no coincide con el formato seleccionado.`,
      );
    }

    if (mapping[ColumnType.Payee] === undefined) {
      errors.push("Mapea una columna de beneficiario.");
    } else if (!payee) {
      errors.push("El beneficiario es obligatorio.");
    }

    return {
      csvRowIndex: row.index,
      rawDate,
      rawAmount,
      date,
      amount,
      payee,
      errors: [...new Set(errors)],
    };
  });
}

export function prepareTransactionsForAnalysis(
  rows: ParsedCSVRow[],
  mapping: Record<string, number>,
  dateFormat: DateFormat,
  amountFormat: AmountFormat,
): TransactionForAnalysis[] {
  const previews = buildMappingPreview(rows, mapping, dateFormat, amountFormat);
  const sourceRowsByIndex = new Map(rows.map((row) => [row.index, row]));

  return previews.flatMap((preview) => {
    if (!preview.date || preview.amount === null || preview.errors.length > 0) {
      return [];
    }

    const sourceRow = sourceRowsByIndex.get(preview.csvRowIndex);
    if (!sourceRow) return [];

    return [{
      csvRowIndex: preview.csvRowIndex,
      date: preview.date.toISOString().split("T")[0],
      amount: preview.amount,
      payee: preview.payee,
      description:
        mapping[ColumnType.Description] !== undefined
          ? getCell(sourceRow, mapping[ColumnType.Description])
          : undefined,
      notes:
        mapping[ColumnType.Notes] !== undefined
          ? getCell(sourceRow, mapping[ColumnType.Notes])
          : undefined,
    }];
  });
}

export function transformDuplicates<
  T extends { existingTransaction: { date: string | Date } },
>(
  duplicates: T[],
): Array<
  Omit<T, "existingTransaction"> & {
    existingTransaction: Omit<T["existingTransaction"], "date"> & {
      date: Date;
    };
  }
> {
  return duplicates.map((dup) => ({
    ...dup,
    existingTransaction: {
      ...dup.existingTransaction,
      date: new Date(dup.existingTransaction.date),
    },
  })) as Array<
    Omit<T, "existingTransaction"> & {
      existingTransaction: Omit<T["existingTransaction"], "date"> & {
        date: Date;
      };
    }
  >;
}
