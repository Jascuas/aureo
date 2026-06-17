"use client";

import { format } from "date-fns";
import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaSeries, OverTimeData } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type BarVariantProps = {
  data: OverTimeData;
  series: AreaSeries[];
};

export const BarVariant = ({ data, series }: BarVariantProps) => {
  const chartConfig = useMemo(
    () =>
      series.reduce<ChartConfig>((acc, { key, color }) => {
        acc[key] = {
          label: key.charAt(0).toUpperCase() + key.slice(1),
          color,
        };
        return acc;
      }, {}),
    [series],
  );

  return (
    <ChartContainer config={chartConfig} className="h-[350px] w-full">
      <BarChart data={data} accessibilityLayer>
        <XAxis
          axisLine={false}
          tickLine={false}
          dataKey="date"
          tickFormatter={(value) => format(value, "dd MMM")}
          style={{ fontSize: "12px" }}
          tickMargin={16}
        />

        <YAxis
          style={{ fontSize: "12px" }}
          tickMargin={16}
        />

        <ChartTooltip
          cursor={{ fill: "rgba(255,255,255,0.1)" }}
          content={
            <ChartTooltipContent
              labelFormatter={(value) =>
                format(new Date(value), "MMM dd, yyyy")
              }
              formatter={(value) => [
                formatCurrency(Number(value)),
              ]}
            />
          }
        />

        {series.map(({ key }) => (
          <Bar
            key={key}
            dataKey={key}
            fill={`var(--color-${key})`}
            className="drop-shadow-sm"
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
};
