"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfidenceBadge } from "@/features/csv-import/components/confidence-badge";
import { DuplicateIndicator } from "@/features/csv-import/components/duplicate-indicator";
import { EditableCategoryCell } from "@/features/csv-import/components/editable-category-cell";
import { useDuplicateResolutionActions } from "@/features/csv-import/store/duplicate-resolution";
import type {
  PayeeMatchResult,
  PreviewRow,
} from "@/features/csv-import/types/import-types";
import { formatCurrency } from "@/lib/utils";

type UsePreviewColumnsArgs = {
  payeeMatches?: PayeeMatchResult[];
  onCategoryChange: (
    rowIndex: number,
    categoryId: string | null,
    categoryName: string | null,
    isAiSuggestion?: boolean,
  ) => void;
};

export function usePreviewColumns({
  payeeMatches,
  onCategoryChange,
}: UsePreviewColumnsArgs): ColumnDef<PreviewRow>[] {
  const { openResolution, getResolution } = useDuplicateResolutionActions();

  const suggestionsByRowIndex = new Map(
    (payeeMatches ?? []).map((pm) => [
      pm.csvRowIndex,
      pm.matches.map((m) => ({
        categoryId: m.categoryId,
        confidence: m.confidence,
      })),
    ]),
  );

  return [
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.date.toLocaleDateString("es-ES")}
        </span>
      ),
    },
    {
      accessorKey: "payee",
      header: "Beneficiario",
      cell: ({ row }) => (
        <span className="max-w-50 truncate">{row.original.payee}</span>
      ),
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => {
            const sorted = column.getIsSorted();

            if (sorted === "desc") {
              column.clearSorting();
              return;
            }

            column.toggleSorting(sorted === "asc");
          }}
          className="h-8 px-2"
          aria-label={`Ordenar por importe: ${
            column.getIsSorted() === "asc"
              ? "descendente"
              : column.getIsSorted() === "desc"
                ? "sin orden"
                : "ascendente"
          }`}
        >
          Importe
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
      accessorKey: "categoryName",
      header: "Categoría",
      cell: ({ row }) => (
        <EditableCategoryCell
          categoryId={row.original.categoryId}
          confidence={row.original.confidence}
          suggestions={suggestionsByRowIndex.get(row.original.csvRowIndex)}
          userEdited={row.original.userEdited}
          onCategoryChange={(categoryId, categoryName, isAiSuggestion) =>
            onCategoryChange(
              row.original.csvRowIndex,
              categoryId,
              categoryName,
              isAiSuggestion,
            )
          }
        />
      ),
    },
    {
      accessorKey: "confidence",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => {
            const sorted = column.getIsSorted();

            if (sorted === "desc") {
              column.clearSorting();
              return;
            }

            column.toggleSorting(sorted === "asc");
          }}
          className="h-8 px-2"
          aria-label={`Ordenar por confianza: ${
            column.getIsSorted() === "asc"
              ? "descendente"
              : column.getIsSorted() === "desc"
                ? "sin orden"
                : "ascendente"
          }`}
        >
          Confianza
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <ConfidenceBadge confidence={row.original.confidence} />
      ),
    },
    {
      id: "status",
      header: "Estado",
      cell: ({ row }) => {
        const duplicate = row.original.duplicate;
        if (!duplicate)
          return <span className="text-muted-foreground text-sm">Nueva</span>;

        const resolution = getResolution(duplicate.csvIndex);

        return (
          <DuplicateIndicator
            existingTransaction={duplicate.existingTransaction}
            matchType={duplicate.matchType}
            score={duplicate.score}
            onResolve={() => openResolution(duplicate)}
            isResolved={!!resolution}
            resolution={resolution?.action}
          />
        );
      },
    },
  ];
}
