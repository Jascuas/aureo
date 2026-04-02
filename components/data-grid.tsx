"use client";

import { useGetOverview } from "@/features/summary/api/use-get-overview";

import { DataCard } from "./data-card";
import { DataCardLoading } from "./loading/data-card-loading";

export const DataGrid = () => {
  const { data, isLoading } = useGetOverview();

  if (isLoading)
    return (
      <div className="mb-2 grid grid-cols-1 gap-4 pb-2 lg:mb-8 lg:grid-cols-3 lg:gap-8">
        <DataCardLoading />
        <DataCardLoading />
        <DataCardLoading />
      </div>
    );

  return (
    <div className="mb-2 grid grid-cols-1 gap-4 pb-2 lg:mb-8 lg:grid-cols-3 lg:gap-8">
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
