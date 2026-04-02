"use client";

import { ChartLoading } from "@/components/loading/chart-loading";
import { SpendingPieLoading } from "@/components/loading/spending-pie-loading";
import { useGetCategorySummary } from "@/features/summary/api/use-get-category-summary";
import { useGetOverTime } from "@/features/summary/api/use-get-over-time";

import { CategoryChart } from "@/components/charts/category-chart/category-chart";
import { TimeSeriesChart } from "@/components/charts/time-series/time-series-chart";

export const OverviewCharts = () => {
  const { data, isLoading } = useGetOverTime();
  const { data: categoryData, isLoading: isLoadingCategory } =
    useGetCategorySummary();

  const isLoadingAny = isLoading || isLoadingCategory;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-6 lg:gap-8">
      <div className="col-span-1 lg:col-span-3 xl:col-span-4">
        {isLoadingAny ? <ChartLoading /> : <TimeSeriesChart data={data} />}
      </div>

      <div className="col-span-1 lg:col-span-3 xl:col-span-2">
        {isLoadingAny ? (
          <SpendingPieLoading />
        ) : (
          <CategoryChart data={categoryData} />
        )}
      </div>
    </div>
  );
};
