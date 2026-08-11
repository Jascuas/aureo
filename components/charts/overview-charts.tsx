"use client";

import { CategoryChart } from "@/components/charts/category-chart/category-chart";
import { TimeSeriesChart } from "@/components/charts/time-series/time-series-chart";
import { AccountsCard } from "@/components/dashboard/accounts-card";
import { RecentTransactionsCard } from "@/components/dashboard/recent-transactions-card";
import { ChartLoading } from "@/components/loading/chart-loading";
import { useGetOverTime } from "@/features/summary/api/use-get-over-time";

export const OverviewCharts = () => {
  const { data, isLoading } = useGetOverTime();

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {/* Row 1: Time series (wide) + Categories (narrow) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-6 lg:gap-6">
        <div className="col-span-1 lg:col-span-3 xl:col-span-4">
          {isLoading ? <ChartLoading /> : <TimeSeriesChart data={data} />}
        </div>

        <div className="col-span-1 lg:col-span-3 xl:col-span-2">
          <CategoryChart />
        </div>
      </div>

      {/* Row 2: Accounts card + Recent transactions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
        <div className="col-span-1 max-[1100px]:col-span-12 lg:col-span-4 h-full">
          <AccountsCard />
        </div>

        <div className="col-span-1 max-[1100px]:col-span-12 lg:col-span-8">
          <RecentTransactionsCard />
        </div>
      </div>
    </div>
  );
};
