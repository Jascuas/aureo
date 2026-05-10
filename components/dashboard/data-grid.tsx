"use client";

import { useMemo } from "react";

import { DataCard } from "@/components/dashboard/data-card";
import { DataCardLoading } from "@/components/loading/data-card-loading";
import { useGetOverTime } from "@/features/summary/api/use-get-over-time";
import { useGetOverview } from "@/features/summary/api/use-get-overview";

export const DataGrid = () => {
  const { data, isLoading } = useGetOverview();
  const { data: series } = useGetOverTime();

  const sparklines = useMemo(() => {
    const rows = series ?? [];
    return {
      balance: rows.map((r) => ({ value: r.balance ?? 0 })),
      income: rows.map((r) => ({ value: r.income ?? 0 })),
      expenses: rows.map((r) => ({ value: r.expenses ?? 0 })),
    };
  }, [series]);

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
        sparkline={sparklines.balance}
        sparklineColor="#3b82f6"
      />

      <DataCard
        title="Income"
        value={data?.income.amount}
        valueChange={data?.income.changeAmount}
        percentageChange={data?.income.changePtc}
        sparkline={sparklines.income}
        sparklineColor="#10b981"
      />

      <DataCard
        title="Expenses"
        value={data?.expenses.amount}
        valueChange={data?.expenses.changeAmount}
        percentageChange={data?.expenses.changePtc}
        sparkline={sparklines.expenses}
        sparklineColor="#f43f5e"
      />
    </div>
  );
};
