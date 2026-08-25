"use client";

import { DataCard } from "@/components/dashboard/data-card";
import { DataCardLoading } from "@/components/loading/data-card-loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { useGetOverview } from "@/features/summary/api/use-get-overview";

export const DataGrid = () => {
  const { data, isError, isLoading, refetch } = useGetOverview();

  if (isLoading)
    return (
      <div className="mb-4 grid grid-cols-1 gap-4 lg:mb-6 lg:grid-cols-3 lg:gap-6">
        <DataCardLoading />
        <DataCardLoading />
        <DataCardLoading />
      </div>
    );

  if (isError)
    return (
      <div className="mb-4 grid grid-cols-1 gap-4 lg:mb-6 lg:grid-cols-3 lg:gap-6">
        <Card className="border-border border drop-shadow-sm lg:col-span-3">
          <CardContent
            className="flex flex-col items-center gap-3 p-4 text-center lg:p-6"
            role="alert"
          >
            <CardTitle>RESUMEN NO DISPONIBLE</CardTitle>
            <p className="text-destructive text-xs">
              No se ha podido cargar el resumen. Inténtalo de nuevo.
            </p>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
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
