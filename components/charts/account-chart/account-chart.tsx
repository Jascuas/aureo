"use client";

import { FileSearch, Wallet } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import qs from "query-string";
import { useMemo } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { CategoryTooltip } from "@/components/charts/category-chart/category-tooltip";
import { SpendingPieLoading } from "@/components/loading/spending-pie-loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetAccountSummary } from "@/features/summary/api/use-get-account-summary";
import { formatCurrency, formatPercentage } from "@/lib/utils";

const COLORS = [
  "#0062FF",
  "#12C6FF",
  "#FF647F",
  "#FF9354",
  "#7C3AED",
  "#22C55E",
  "#F59E0B",
  "#EC4899",
];

export const AccountChart = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeAccountId = searchParams.get("accountId") ?? "";
  const { data = [], isLoading } = useGetAccountSummary();

  // Donut: only positive balances make sense in a share view.
  const chartData = useMemo(() => data.filter((r) => r.value > 0), [data]);
  const total = useMemo(
    () => chartData.reduce((s, r) => s + r.value, 0),
    [chartData],
  );

  const handleSlice = (id: string) => {
    const current = qs.parse(searchParams.toString());
    const nextAccountId = activeAccountId === id ? undefined : id;

    const url = qs.stringifyUrl(
      {
        url: window.location.pathname,
        query: { ...current, accountId: nextAccountId },
      },
      { skipNull: true, skipEmptyString: true },
    );

    router.push(url);
  };

  if (isLoading) return <SpendingPieLoading />;

  return (
    <Card className="border-none drop-shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-4 lg:p-6">
        <CardTitle className="line-clamp-1 text-base">
          Accounts{" "}
          <span className="text-muted-foreground font-normal">
            &middot; balance share
          </span>
        </CardTitle>

        <Wallet className="text-muted-foreground size-4" />
      </CardHeader>

      <CardContent className="p-4 pt-0 lg:p-6">
        {chartData.length === 0 ? (
          <div className="flex h-[350px] w-full flex-col items-center justify-center gap-y-4">
            <FileSearch className="text-muted-foreground size-6" />

            <p className="text-muted-foreground text-sm">
              No accounts with a positive balance.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                content={({ payload }) => (
                  <ul className="mt-4 flex flex-col space-y-2">
                    {payload?.map((entry, index) => {
                      const item = chartData.find(
                        (r) => r.name === entry.value,
                      );
                      const pct =
                        item && total > 0 ? (item.value / total) * 100 : 0;
                      const isActive = item && activeAccountId === item.id;

                      return (
                        <li
                          key={`item-${index}`}
                          className={`hover:bg-muted flex cursor-pointer items-center space-x-2 rounded px-1 py-0.5 transition-colors ${
                            isActive ? "bg-muted" : ""
                          }`}
                          onClick={() => item && handleSlice(item.id)}
                        >
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                            aria-hidden
                          />

                          <div className="flex w-full items-center justify-between gap-2">
                            <span className="text-muted-foreground line-clamp-1 text-sm">
                              {entry.value}
                            </span>

                            <span className="text-sm tabular-nums">
                              {formatPercentage(pct)}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              />

              <Tooltip
                content={({ active, payload }) => (
                  <CategoryTooltip active={active} payload={payload} />
                )}
              />

              <Pie
                data={chartData}
                cx="50%"
                cy="40%"
                outerRadius={90}
                innerRadius={60}
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
                onClick={(slice) => {
                  const id = (slice as { id?: string }).id;
                  if (id) handleSlice(id);
                }}
                className="cursor-pointer"
              >
                {chartData.map((row, index) => (
                  <Cell
                    key={`cell-${row.id}`}
                    fill={COLORS[index % COLORS.length]}
                    opacity={
                      activeAccountId && activeAccountId !== row.id ? 0.35 : 1
                    }
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
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
