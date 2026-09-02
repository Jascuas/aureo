"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ColumnType } from "@/features/csv-import/const/import-const";
import { buildMappingPreview } from "@/features/csv-import/lib/transaction-mapper";
import type {
  AmountFormat,
  DateFormat,
  ParsedCSVRow,
} from "@/features/csv-import/types/import-types";
import { formatCurrency } from "@/lib/utils";

type ColumnPreviewProps = {
  headers: string[];
  rows: ParsedCSVRow[];
  mapping: Record<string, number>;
  dateFormat: DateFormat;
  amountFormat: AmountFormat;
  maxRows?: number;
};

export const ColumnPreview = ({
  headers,
  rows,
  mapping,
  dateFormat,
  amountFormat,
  maxRows = 5,
}: ColumnPreviewProps) => {
  const previews = buildMappingPreview(rows, mapping, dateFormat, amountFormat);
  const rowsToShow = previews.slice(0, maxRows);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Corrected preview</p>
      <div className="overflow-x-auto border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 text-center">CSV row</TableHead>
              <TableHead>{headers[mapping[ColumnType.Date]] ?? "Date"}</TableHead>
              <TableHead>
                {headers[mapping[ColumnType.Amount]] ?? "Amount"}
              </TableHead>
              <TableHead>{headers[mapping[ColumnType.Payee]] ?? "Payee"}</TableHead>
              <TableHead>Validation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowsToShow.map((row) => (
              <TableRow key={row.csvRowIndex}>
                <TableCell className="text-center text-xs text-muted-foreground">
                  {row.csvRowIndex + 2}
                </TableCell>
                <TableCell>
                  {row.date ? row.date.toLocaleDateString("es-ES") : row.rawDate || "-"}
                </TableCell>
                <TableCell className="font-medium tabular-nums">
                  {row.amount === null
                    ? row.rawAmount || "-"
                    : formatCurrency(row.amount / 1000)}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {row.payee || "-"}
                </TableCell>
                <TableCell className="max-w-[360px] text-sm">
                  {row.errors.length > 0 ? (
                    <span className="text-destructive">{row.errors.join(" ")}</span>
                  ) : (
                    <span className="text-crt-pos">Ready for analysis</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Showing first {rowsToShow.length} rows of {rows.length} total
      </p>
    </div>
  );
};