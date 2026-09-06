"use client";

import { CategoryChart } from "@/components/charts/category-chart/category-chart";
import { TimeSeriesChart } from "@/components/charts/time-series/time-series-chart";
import { AccountsCard } from "@/components/dashboard/accounts-card";
import { getDashboardDataState } from "@/components/dashboard/dashboard-data-state";
import { RecentTransactionsCard } from "@/components/dashboard/recent-transactions-card";
import { ChartLoading } from "@/components/loading/chart-loading";
import { useGetOverTime } from "@/features/summary/api/use-get-over-time";

export const OverviewCharts = () => {
  const { data, isError, isLoading, refetch } = useGetOverTime();
  const state = getDashboardDataState({
    data,
    isEmpty: (rows) =>
      rows.every((row) => row.income === 0 && row.expenses === 0),
    isError,
    isLoading,
  });

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      {/* Row 1: Time series (wide) + Categories (narrow) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-6 lg:gap-6">
        <div className="col-span-1 lg:col-span-3 xl:col-span-4">
          {state.kind === "loading" ? (
            <ChartLoading />
          ) : (
            <TimeSeriesChart state={state} onRetry={() => void refetch()} />
          )}
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
