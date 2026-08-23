"use client";

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

const DASHBOARD_TIME_ZONE = "Europe/Madrid";
const dashboardDateFormatters = {
  axis: new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    timeZone: DASHBOARD_TIME_ZONE,
  }),
  full: new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    timeZone: DASHBOARD_TIME_ZONE,
    year: "numeric",
  }),
} as const;

function parseDashboardDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim();
    const dateOnlyMatch = normalizedValue.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/,
    );

    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch.map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, day, 12));

      return parsed.getUTCFullYear() === year &&
        parsed.getUTCMonth() === month - 1 &&
        parsed.getUTCDate() === day
        ? parsed
        : null;
    }

    if (!normalizedValue) return null;
    const parsed = new Date(normalizedValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value !== "number") return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDashboardDate(
  value: unknown,
  style: keyof typeof dashboardDateFormatters = "full",
): string {
  const date = parseDashboardDate(value);
  if (!date) return "—";

  const parts = dashboardDateFormatters[style].formatToParts(date);
  const day = parts.find(({ type }) => type === "day")?.value;
  const month = parts.find(({ type }) => type === "month")?.value;
  const year = parts.find(({ type }) => type === "year")?.value;

  if (!day || !month || (style === "full" && !year)) return "—";
  return style === "axis" ? `${day} ${month}` : `${month} ${day}, ${year}`;
}

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
          tickFormatter={(value) => formatDashboardDate(value, "axis")}
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
              labelFormatter={(value) => formatDashboardDate(value)}
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
