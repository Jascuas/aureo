"use client";

import { useGetCategorySummary } from "@/features/summary/api/use-get-category-summary";
import { useGetOverTime } from "@/features/summary/api/use-get-over-time";

import { Chart, ChartLoading } from "./chart";
import { SpendingPie, SpendingPieLoading } from "./spending-pie";

export const DataCharts = () => {
  const { data, isLoading } = useGetOverTime();
  const { data: categoryData, isLoading: isLoadingCategory } =
    useGetCategorySummary();

  if (isLoading || isLoadingCategory) {
    return (
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-6">
        <div className="col-span-1 lg:col-span-3 xl:col-span-4">
          <ChartLoading />
        </div>

        <div className="col-span-1 lg:col-span-3 xl:col-span-2">
          <SpendingPieLoading />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-6">
      <div className="col-span-1 lg:col-span-3 xl:col-span-4">
        <Chart data={data} />
      </div>

      <div className="col-span-1 lg:col-span-3 xl:col-span-2">
        <SpendingPie data={categoryData} />
      </div>
    </div>
  );
};
