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
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center space-x-6 lg:space-x-8">
          {/* Page info */}
          <div className="text-muted-foreground text-sm">
            Page {paginationInfo.currentPage} •{" "}
            {paginationInfo.totalItemsLoaded} items loaded
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={paginationCallbacks.onPreviousPage}
            disabled={
              !paginationInfo.hasPreviousPage || paginationInfo.isLoading
            }
          >
            Previous
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
            {paginationInfo.isFetchingNextPage ? "Loading..." : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
