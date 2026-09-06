"use client";

import { useMemo, useState } from "react";
import { Pie, PieChart, Sector, type SectorProps } from "recharts";

import { getDashboardDataState } from "@/components/dashboard/dashboard-data-state";
import {
  DashboardEmptyState,
  DashboardErrorState,
} from "@/components/dashboard/dashboard-state-message";
import { SpendingPieLoading } from "@/components/loading/spending-pie-loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetAccountSummary } from "@/features/summary/api/use-get-account-summary";
import { formatCurrency, formatPercentage } from "@/lib/utils";

const ACCOUNT_COLORS = Array.from(
  { length: 5 },
  (_, i) => `var(--chart-${i + 1})`,
);

const TOP_OPTIONS = [
  { value: "3", label: "Top 3" },
  { value: "5", label: "Top 5" },
  { value: "8", label: "Top 8" },
  { value: "all", label: "All" },
];

// Highest balance account is always index 0 (API sorts desc by balance)
const ACTIVE_INDEX = 0;

export const AccountChart = () => {
  const [top, setTop] = useState<string>("5");
  const { data, isError, isLoading, refetch } = useGetAccountSummary();
  const state = getDashboardDataState({
    data,
    isEmpty: (rows) => rows.every((row) => row.value <= 0),
    isError,
    isLoading,
  });
  const accountRows = state.kind === "populated" ? state.data : [];

  const positiveData = useMemo(
    () => accountRows.filter((r) => r.value > 0),
    [accountRows],
  );

  const chartData = useMemo(() => {
    if (top === "all") return positiveData;
    return positiveData.slice(0, Number(top));
  }, [positiveData, top]);

  const total = useMemo(
    () => chartData.reduce((s, r) => s + r.value, 0),
    [chartData],
  );

  // Build chartConfig: account-0, account-1, ... → resolves var(--color-account-N)
  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = { value: { label: "Balance" } };
    chartData.forEach((item, index) => {
      config[`account-${index}`] = {
        label: item.name,
        color: ACCOUNT_COLORS[index % ACCOUNT_COLORS.length],
      };
    });
    return config;
  }, [chartData]);

  // Attach fill so ChartContainer can resolve colours
  const chartDataWithFill = useMemo(
    () =>
      chartData.map((item, index) => ({
        ...item,
        fill: `var(--color-account-${index})`,
      })),
    [chartData],
  );

  if (state.kind === "loading") return <SpendingPieLoading />;

  return (
    <Card className="border-border border drop-shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-0 lg:p-6 lg:pb-0">
        <CardTitle className="line-clamp-1 text-xs">
          <span className="text-crt-accent">▌</span> Accounts
        </CardTitle>

        <Select value={top} onValueChange={setTop}>
          <SelectTrigger className="h-8 w-24 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TOP_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>

      <CardContent className="p-4 pt-0 lg:p-6">
        {state.kind === "error" ? (
          <DashboardErrorState
            className="h-[350px]"
            title="CUENTAS NO DISPONIBLES"
            description="No se han podido cargar las cuentas. Inténtalo de nuevo."
            onRetry={() => void refetch()}
          />
        ) : state.kind === "empty" ? (
          <DashboardEmptyState
            className="h-[350px]"
            message="No hay cuentas con saldo positivo"
          />
        ) : (
          <div>
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[200px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={chartDataWithFill}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
                  activeIndex={ACTIVE_INDEX}
                  activeShape={(props: SectorProps) => (
                    <Sector
                      {...props}
                      outerRadius={(props.outerRadius ?? 0) + 10}
                    />
                  )}
                />
              </PieChart>
            </ChartContainer>

            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {chartData.map((item, index) => {
                const pct = total > 0 ? (item.value / total) * 100 : 0;
                return (
                  <li
                    key={`legend-${item.id}`}
                    className="flex items-center space-x-2 px-1 py-0.5 whitespace-nowrap"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          ACCOUNT_COLORS[index % ACCOUNT_COLORS.length],
                      }}
                      aria-hidden
                    />
                    <span className="text-muted-foreground text-sm">
                      {item.name}
                    </span>
                    <span className="text-sm tabular-nums">
                      {formatPercentage(pct)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {total > 0 && (
          <p className="text-muted-foreground mt-2 text-center text-xs">
            Total {formatCurrency(total)}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
