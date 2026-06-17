"use client";
import { FileSearch } from "lucide-react";
import { useState } from "react";

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

  const { data = [], isLoading } = useGetCategorySummary({
    type: filter.type,
    top: filter.top,
  });

  if (isLoading) return <SpendingPieLoading />;

  return (
    <Card className="border-border flex h-full flex-col border drop-shadow-sm">
      <CardHeader className="mb-4 flex justify-between space-y-2 p-4 pb-0 lg:mb-6 lg:flex-row lg:items-start lg:space-y-0 lg:p-6 lg:pb-0">
        <CardTitle className="line-clamp-1 text-xs">
          <span className="text-crt-accent">▌</span> Categories
        </CardTitle>

        <CategoryChartFilterDialog value={filter} onChange={setFilter} />
      </CardHeader>

      <CardContent className="flex-1 p-4 pt-0 lg:px-6 lg:pt-0 lg:pb-6">
        {data.length === 0 ? (
          <div className="flex h-[350px] w-full flex-col items-center justify-center gap-y-4">
            <FileSearch className="text-muted-foreground size-6" />

            <p className="text-muted-foreground text-sm">
              No data for this period.
            </p>
          </div>
        ) : (
          <ProgressVariant data={data} />
        )}
      </CardContent>
    </Card>
  );
};
