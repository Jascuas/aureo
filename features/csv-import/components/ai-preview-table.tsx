"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePreviewColumns } from "@/features/csv-import/components/use-preview-columns";
import type {
  PayeeMatchResult,
  PreviewRow,
} from "@/features/csv-import/types/import-types";

type AiPreviewTableProps = {
  rows: PreviewRow[];
  payeeMatches?: PayeeMatchResult[];
  onCategoryChange: (
    rowIndex: number,
    categoryId: string | null,
    categoryName: string | null,
    isAiSuggestion?: boolean,
  ) => void;
};

export const AiPreviewTable = ({
  rows,
  payeeMatches,
  onCategoryChange,
}: AiPreviewTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const columns = usePreviewColumns({ payeeMatches, onCategoryChange });

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  const totalCount = rows.length;
  const highConfidenceCount = rows.filter((r) => r.confidence >= 0.7).length;
  const lowConfidenceCount = rows.filter((r) => r.confidence < 0.7).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground flex items-center gap-4 text-sm">
          <span>
            {totalCount} transaction{totalCount === 1 ? "" : "s"}
          </span>
          <span>•</span>
          <span>{highConfidenceCount} high confidence</span>
          {lowConfidenceCount > 0 && (
            <>
              <span>•</span>
              <span className="text-amber-600">
                {lowConfidenceCount} need review
              </span>
            </>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No transactions to preview.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
