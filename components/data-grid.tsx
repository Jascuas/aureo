"use client";

import { FaPiggyBank } from "react-icons/fa";
import { FaArrowTrendDown, FaArrowTrendUp } from "react-icons/fa6";

import { useGetOverview } from "@/features/summary/api/use-get-overview";

import { DataCard, DataCardLoading } from "./data-card";

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
        icon={FaPiggyBank}
        variant="default"
        dateRange={data?.lastPeriodBalance}
      />

      <DataCard
        title="Income"
        value={data?.income.amount}
        valueChange={data?.income.changeAmount}
        percentageChange={data?.income.changePtc}
        icon={FaArrowTrendUp}
        variant="success"
        dateRange={data?.lastPeriod}
      />

      <DataCard
        title="Expenses"
        value={data?.expenses.amount}
        valueChange={data?.expenses.changeAmount}
        percentageChange={data?.expenses.changePtc}
        icon={FaArrowTrendDown}
        variant="danger"
        dateRange={data?.lastPeriod}
      />
    </div>
  );
};
