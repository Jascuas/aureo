"use client";

import { useGetCategorySummary } from "@/features/summary/api/use-get-category-summary";
import { useGetOverTime } from "@/features/summary/api/use-get-over-time";

import { Chart, ChartLoading } from "./chart";
import { SpendingPie, SpendingPieLoading } from "./spending-pie";

export const DataCharts = () => {
  const { data, isLoading } = useGetOverTime();
  const { data: categoryData, isLoading: isLoadingCategory } =
    useGetCategorySummary();

  const isLoadingAny = isLoading || isLoadingCategory;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-6 lg:gap-8">
      <div className="col-span-1 lg:col-span-3 xl:col-span-4">
        {isLoadingAny ? <ChartLoading /> : <Chart data={data} />}
      </div>

      <div className="col-span-1 lg:col-span-3 xl:col-span-2">
        {isLoadingAny ? (
          <SpendingPieLoading />
        ) : (
          <SpendingPie data={categoryData} />
        )}
      </div>
    </div>
  );
};
