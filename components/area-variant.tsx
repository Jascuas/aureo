import { format } from "date-fns";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AreaSeries, TransactionOrBalance } from "@/lib/types";

import { CustomTooltip } from "./custom-tooltip";

type AreaVariantProps = {
  data: TransactionOrBalance;
  series: AreaSeries[];
};

export const AreaVariant = ({ data, series }: AreaVariantProps) => {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />

        <XAxis
          axisLine={false}
          tickLine={false}
          dataKey="date"
          tickFormatter={(value) => format(value, "dd MMM")}
          style={{
            fontSize: "12px",
          }}
          tickMargin={16}
        />

        <YAxis
          style={{
            fontSize: "12px",
          }}
          tickMargin={16}
        />

        <Tooltip
          content={({ active, payload }) => (
            <CustomTooltip active={active} payload={payload} />
          )}
        />

        <defs>
          {series.map(({ key, color }) => (
            <linearGradient key={key} id={key} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.8} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>

        {series.map(({ key, color }) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stackId={key}
            strokeWidth={2}
            stroke={color}
            fill={`url(#${key})`}
            className="drop-shadow-sm"
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
};
