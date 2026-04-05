"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CategorizationResult } from "@/features/csv-import/lib/transaction-categorizer";
import type { DuplicateMatch } from "@/features/csv-import/lib/duplicate-matcher";
import { formatCurrency } from "@/lib/utils";

import { ConfidenceBadge } from "./confidence-badge";
import { DuplicateIndicator } from "./duplicate-indicator";
import { EditableCategoryCell } from "./editable-category-cell";

type PreviewRow = {
  csvRowIndex: number;
  date: Date;
  payee: string;
  amount: number;
  categoryId: string | null;
  categoryName: string | null;
  confidence: number;
  duplicate: DuplicateMatch | null;
};

type AiPreviewTableProps = {
  rows: PreviewRow[];
  onCategoryChange: (rowIndex: number, categoryId: string | null, categoryName: string | null) => void;
};

export const AiPreviewTable = ({ 
  rows, 
  onCategoryChange,
}: AiPreviewTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  
  const columns: ColumnDef<PreviewRow>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.date.toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: 'payee',
      header: 'Payee',
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate">
          {row.original.payee}
        </span>
      ),
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Amount
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">
          {formatCurrency(row.original.amount / 1000)}
        </span>
      ),
    },
    {
      accessorKey: 'categoryName',
      header: 'Category',
      cell: ({ row }) => (
        <EditableCategoryCell
          categoryId={row.original.categoryId}
          categoryName={row.original.categoryName}
          confidence={row.original.confidence}
          onCategoryChange={(categoryId, categoryName) => 
            onCategoryChange(row.original.csvRowIndex, categoryId, categoryName)
          }
        />
      ),
    },
    {
      accessorKey: 'confidence',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-8 px-2"
        >
          Confidence
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <ConfidenceBadge confidence={row.original.confidence} />
      ),
    },
    {
      id: 'duplicate',
      header: 'Status',
      cell: ({ row }) => {
        const duplicate = row.original.duplicate;
        if (!duplicate) return <span className="text-sm text-muted-foreground">New</span>;
        
        return (
          <DuplicateIndicator
            existingTransaction={duplicate.existingTransaction}
            matchType={duplicate.matchType}
            score={duplicate.score}
          />
        );
      },
    },
  ];
  
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
  const highConfidenceCount = rows.filter(r => r.confidence >= 0.7).length;
  const lowConfidenceCount = rows.filter(r => r.confidence < 0.7).length;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{totalCount} transaction{totalCount === 1 ? '' : 's'}</span>
          <span>•</span>
          <span>{highConfidenceCount} high confidence</span>
          {lowConfidenceCount > 0 && (
            <>
              <span>•</span>
              <span className="text-amber-600">{lowConfidenceCount} need review</span>
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
                          header.getContext()
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
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
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
