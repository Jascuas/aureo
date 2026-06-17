"use client";

import { DataCard } from "@/components/dashboard/data-card";
import { DataCardLoading } from "@/components/loading/data-card-loading";
import { useGetOverview } from "@/features/summary/api/use-get-overview";

export const DataGrid = () => {
  const { data, isLoading } = useGetOverview();

  if (isLoading)
    return (
      <div className="mb-4 grid grid-cols-1 gap-4 lg:mb-6 lg:grid-cols-3 lg:gap-6">
        <DataCardLoading />
        <DataCardLoading />
        <DataCardLoading />
      </div>
    );

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 lg:mb-6 lg:grid-cols-3 lg:gap-6">
      <DataCard
        title="Balance"
        value={data?.balance.amount}
        valueChange={data?.balance.changeAmount}
        percentageChange={data?.balance.changePtc}
      />

      <DataCard
        title="Income"
        value={data?.income.amount}
        valueChange={data?.income.changeAmount}
        percentageChange={data?.income.changePtc}
      />

      <DataCard
        title="Expenses"
        value={data?.expenses.amount}
        valueChange={data?.expenses.changeAmount}
        percentageChange={data?.expenses.changePtc}
      />
    </div>
  );
};
