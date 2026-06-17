"use client";

import { format } from "date-fns";
import { useMemo } from "react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { AreaSeries } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type AreaVariantProps = {
  data: unknown[];
  series: AreaSeries[];
};

export const AreaVariant = ({ data, series }: AreaVariantProps) => {
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
      <AreaChart data={data} accessibilityLayer>
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
          tickCount={5}
          axisLine={false}
          tickLine={false}
        />

        <ChartTooltip
          cursor={false}
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

        <defs>
          {series.map(({ key }) => (
            <linearGradient key={key} id={key} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={`var(--color-${key})`}
                stopOpacity={0.85}
              />
              <stop
                offset="50%"
                stopColor={`var(--color-${key})`}
                stopOpacity={0.4}
              />
              <stop
                offset="100%"
                stopColor={`var(--color-${key})`}
                stopOpacity={0.05}
              />
            </linearGradient>
          ))}
        </defs>

        {series.map(({ key }) => (
          <Area
            key={key}
            type="natural"
            dataKey={key}
            strokeWidth={2}
            stroke={`var(--color-${key})`}
            fill={`url(#${key})`}
            stackId="a"
            className="drop-shadow-sm"
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
};
