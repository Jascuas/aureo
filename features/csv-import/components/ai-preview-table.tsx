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
import { Checkbox } from "@/components/ui/checkbox";
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
  onRowSelectionChange?: (selectedRows: number[]) => void;
};

export const AiPreviewTable = ({ 
  rows, 
  onCategoryChange,
  onRowSelectionChange,
}: AiPreviewTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState({});
  
  const columns: ColumnDef<PreviewRow>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all rows"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={`Select row ${row.index + 1}`}
        />
      ),
      enableSorting: false,
    },
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
          {formatCurrency(row.original.amount)}
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
    onRowSelectionChange: (updater) => {
      setRowSelection(updater);
      
      const newSelection = typeof updater === 'function' 
        ? updater(rowSelection) 
        : updater;
      
      const selectedIndices = Object.keys(newSelection)
        .filter(key => newSelection[key as keyof typeof newSelection])
        .map(key => parseInt(key));
      
      onRowSelectionChange?.(selectedIndices);
    },
    state: {
      sorting,
      rowSelection,
    },
  });
  
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalCount = table.getFilteredRowModel().rows.length;
  const highConfidenceCount = rows.filter(r => r.confidence >= 0.9).length;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{selectedCount} of {totalCount} selected</span>
          <span>•</span>
          <span>{highConfidenceCount} high confidence</span>
        </div>
        
        {highConfidenceCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const highConfidenceIndices = rows
                .map((r, i) => ({ ...r, index: i }))
                .filter(r => r.confidence >= 0.9)
                .map(r => r.index);
              
              const newSelection = highConfidenceIndices.reduce((acc, idx) => {
                acc[idx] = true;
                return acc;
              }, {} as Record<number, boolean>);
              
              setRowSelection(newSelection);
            }}
          >
            Select All High Confidence
          </Button>
        )}
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
