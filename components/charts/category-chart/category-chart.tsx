"use client";
import { FileSearch } from "lucide-react";
import { useState } from "react";

import { GenericSelect, Option } from "@/components/inputs/generic-select";
import { SpendingPieLoading } from "@/components/loading/spending-pie-loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetCategorySummary } from "@/features/summary/api/use-get-category-summary";
import { CategoryChartType } from "@/lib/types";

import {
  CategoryChartFilterDialog,
  CategoryFilterValue,
  DEFAULT_CATEGORY_FILTER,
} from "./category-chart-filter-dialog";
import { PieVariant } from "./variants/pie-variant";
import { RadarVariant } from "./variants/radar-variant";
import { RadialVariant } from "./variants/radial-variant";

export const CategoryChart = () => {
  type ChartType = "pie" | "radar" | "radial";
  const [chartType, setChartType] = useState<ChartType>("pie");
  const [filter, setFilter] = useState<CategoryFilterValue>(
    DEFAULT_CATEGORY_FILTER,
  );

  const { data = [], isLoading } = useGetCategorySummary({
    type: filter.type,
    top: filter.top,
  });

  const chartOptions: Option<CategoryChartType>[] = [
    { value: "pie", label: "Pie chart" },
    { value: "radar", label: "Radar chart" },
    { value: "radial", label: "Radial chart" },
  ];

  if (isLoading) return <SpendingPieLoading />;

  const titleSuffix =
    filter.type === "Expense"
      ? "expenses"
      : filter.type === "Income"
        ? "income"
        : "refunds";

  return (
    <Card className="border-none drop-shadow-sm">
      <CardHeader className="flex justify-between space-y-2 p-4 pb-4 lg:flex-row lg:items-center lg:space-y-0 lg:p-6">
        <CardTitle className="line-clamp-1 text-base">
          Categories &middot;{" "}
          <span className="text-muted-foreground font-normal">
            top {filter.top} {titleSuffix}
          </span>
        </CardTitle>

        <div className="flex items-center gap-2">
          <CategoryChartFilterDialog value={filter} onChange={setFilter} />

          <GenericSelect
            value={chartType}
            options={chartOptions}
            placeholder="Chart type"
            onChange={setChartType}
          />
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 lg:p-6">
        {data.length === 0 ? (
          <div className="flex h-[350px] w-full flex-col items-center justify-center gap-y-4">
            <FileSearch className="text-muted-foreground size-6" />

            <p className="text-muted-foreground text-sm">
              No data for this period.
            </p>
          </div>
        ) : (
          <>
            {chartType === "pie" && <PieVariant data={data} />}
            {chartType === "radar" && <RadarVariant data={data} />}
            {chartType === "radial" && <RadialVariant data={data} />}
          </>
        )}
      </CardContent>
    </Card>
  );
};
