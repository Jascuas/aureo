import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CustomTooltip } from "@/components/custom-tooltip";
import { AreaSeries, TransactionOrBalance } from "@/lib/types";

type BarVariantProps = {
  data: TransactionOrBalance;
  series: AreaSeries[];
};

export const BarVariant = ({ data, series }: BarVariantProps) => {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
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
          cursor={{ fill: "rgba(255,255,255,0.1)" }}
          content={({ active, payload }) => (
            <CustomTooltip active={active} payload={payload} />
          )}
        />
        {series.map(({ key, color }) => (
          <Bar
            key={key}
            dataKey={key}
            fill={color}
            className="drop-shadow-sm"
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};
