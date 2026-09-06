"use client";
import { useState } from "react";

import { getDashboardDataState } from "@/components/dashboard/dashboard-data-state";
import {
  DashboardEmptyState,
  DashboardErrorState,
} from "@/components/dashboard/dashboard-state-message";
import { SpendingPieLoading } from "@/components/loading/spending-pie-loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetCategorySummary } from "@/features/summary/api/use-get-category-summary";

import {
  CategoryChartFilterDialog,
  CategoryFilterValue,
  DEFAULT_CATEGORY_FILTER,
} from "./category-chart-filter-dialog";
import { ProgressVariant } from "./variants/progress-variant";

export const CategoryChart = () => {
  const [filter, setFilter] = useState<CategoryFilterValue>(
    DEFAULT_CATEGORY_FILTER,
  );

  const { data, isError, isLoading, refetch } = useGetCategorySummary({
    type: filter.type,
    top: filter.top,
  });
  const state = getDashboardDataState({
    data,
    isEmpty: (rows) => rows.length === 0,
    isError,
    isLoading,
  });

  if (state.kind === "loading") return <SpendingPieLoading />;

  return (
    <Card className="border-border flex h-full flex-col border drop-shadow-sm">
      <CardHeader className="mb-4 flex justify-between space-y-2 p-4 pb-0 lg:mb-6 lg:flex-row lg:items-start lg:space-y-0 lg:p-6 lg:pb-0">
        <CardTitle className="line-clamp-1 text-xs">
          <span className="text-crt-accent">▌</span> Categories
        </CardTitle>

        <CategoryChartFilterDialog value={filter} onChange={setFilter} />
      </CardHeader>

      <CardContent className="flex-1 p-4 pt-0 lg:px-6 lg:pt-0 lg:pb-6">
        {state.kind === "error" ? (
          <DashboardErrorState
            className="h-[350px]"
            title="CATEGORÍAS NO DISPONIBLES"
            description="No se han podido cargar las categorías. Inténtalo de nuevo."
            onRetry={() => void refetch()}
          />
        ) : state.kind === "empty" ? (
          <DashboardEmptyState
            className="h-[350px]"
            message="Sin categorías con movimientos en este periodo"
          />
        ) : (
          <ProgressVariant data={state.data} />
        )}
      </CardContent>
    </Card>
  );
};
