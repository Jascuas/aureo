"use client";

import { ColumnDef, Row } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import type { PaginationCallbacks, PaginationInfo } from "@/types/pagination";

type PaginatedDataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterKey: string;
  onDelete: (rows: Row<TData>[]) => void;
  disabled?: boolean;
  paginationInfo: PaginationInfo;
  paginationCallbacks: PaginationCallbacks;
};

export function PaginatedDataTable<TData, TValue>({
  columns,
  data,
  filterKey,
  onDelete,
  disabled,
  paginationInfo,
  paginationCallbacks,
}: PaginatedDataTableProps<TData, TValue>) {
  return (
    <div className="space-y-4">
      {/* DataTable base component without pagination */}
      <DataTable
        columns={columns}
        data={data}
        filterKey={filterKey}
        onDelete={onDelete}
        disabled={disabled}
      />

      {/* Server-side pagination controls */}
      <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-6 lg:space-x-8">
          {/* Page info */}
          <div className="text-muted-foreground text-sm" role="status" aria-live="polite">
            Página {paginationInfo.currentPage} •{" "}
            {paginationInfo.totalItemsLoaded} elementos cargados
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={paginationCallbacks.onPreviousPage}
            disabled={
              !paginationInfo.hasPreviousPage || paginationInfo.isLoading
            }
          >
            <span className="sm:hidden">Atrás</span>
            <span className="hidden sm:inline">Anterior</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={paginationCallbacks.onNextPage}
            disabled={
              !paginationInfo.hasNextPage ||
              paginationInfo.isFetchingNextPage ||
              paginationInfo.isLoading
            }
          >
            {paginationInfo.isFetchingNextPage ? "Cargando..." : "Siguiente"}
          </Button>
        </div>
      </div>
    </div>
  );
}
