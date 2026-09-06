"use client";

import { getDashboardDataState } from "@/components/dashboard/dashboard-data-state";
import {
  DashboardEmptyState,
  DashboardErrorState,
} from "@/components/dashboard/dashboard-state-message";
import { DataCard } from "@/components/dashboard/data-card";
import { DataCardLoading } from "@/components/loading/data-card-loading";
import { Card, CardContent } from "@/components/ui/card";
import { useGetOverview } from "@/features/summary/api/use-get-overview";

export const DataGrid = () => {
  const { data, isError, isLoading, refetch } = useGetOverview();
  const state = getDashboardDataState({
    data,
    isEmpty: (summary) =>
      summary.income.amount === 0 && summary.expenses.amount === 0,
    isError,
    isLoading,
  });

  if (state.kind === "loading")
    return (
      <div className="mb-4 grid grid-cols-1 gap-4 lg:mb-6 lg:grid-cols-3 lg:gap-6">
        <DataCardLoading />
        <DataCardLoading />
        <DataCardLoading />
      </div>
    );

  if (state.kind === "error")
    return (
      <div className="mb-4 grid grid-cols-1 gap-4 lg:mb-6 lg:grid-cols-3 lg:gap-6">
        <Card className="border-border border drop-shadow-sm lg:col-span-3">
          <CardContent
            className="p-4 lg:p-6"
          >
            <DashboardErrorState
              title="RESUMEN NO DISPONIBLE"
              description="No se ha podido cargar el resumen. Inténtalo de nuevo."
              onRetry={() => void refetch()}
            />
          </CardContent>
        </Card>
      </div>
    );

  if (state.kind === "empty")
    return (
      <div className="mb-4 grid grid-cols-1 gap-4 lg:mb-6 lg:grid-cols-3 lg:gap-6">
        <Card className="border-border border drop-shadow-sm lg:col-span-3">
          <CardContent className="p-4 lg:p-6">
            <DashboardEmptyState message="Sin movimientos en este periodo" />
          </CardContent>
        </Card>
      </div>
    );

  const { data: summary } = state;

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 lg:mb-6 lg:grid-cols-3 lg:gap-6">
      <DataCard
        title="Balance"
        value={summary.balance.amount}
        valueChange={summary.balance.changeAmount}
        percentageChange={summary.balance.changePtc}
      />

      <DataCard
        title="Income"
        value={summary.income.amount}
        valueChange={summary.income.changeAmount}
        percentageChange={summary.income.changePtc}
      />

      <DataCard
        title="Expenses"
        value={summary.expenses.amount}
        valueChange={summary.expenses.changeAmount}
        percentageChange={summary.expenses.changePtc}
      />
    </div>
  );
};
