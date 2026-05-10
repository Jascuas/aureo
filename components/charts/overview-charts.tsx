"use client";

import { AccountChart } from "@/components/charts/account-chart/account-chart";
import { CategoryChart } from "@/components/charts/category-chart/category-chart";
import { PayeeChart } from "@/components/charts/payee-chart/payee-chart";
import { TimeSeriesChart } from "@/components/charts/time-series/time-series-chart";
import { ChartLoading } from "@/components/loading/chart-loading";
import { useGetOverTime } from "@/features/summary/api/use-get-over-time";

export const OverviewCharts = () => {
  const { data, isLoading } = useGetOverTime();

  return (
    <div className="flex flex-col gap-4 lg:gap-8">
      {/* Row 1: Time series (wide) + Categories (narrow) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-6 lg:gap-8">
        <div className="col-span-1 lg:col-span-3 xl:col-span-4">
          {isLoading ? <ChartLoading /> : <TimeSeriesChart data={data} />}
        </div>

        <div className="col-span-1 lg:col-span-3 xl:col-span-2">
          <CategoryChart />
        </div>
      </div>

      {/* Row 2: Top payees (wide) + Account share (narrow) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-6 lg:gap-8">
        <div className="col-span-1 lg:col-span-3 xl:col-span-4">
          <PayeeChart />
        </div>

        <div className="col-span-1 lg:col-span-3 xl:col-span-2">
          <AccountChart />
        </div>
      </div>
    </div>
  );
};
