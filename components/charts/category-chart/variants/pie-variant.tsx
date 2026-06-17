import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { PieTooltip } from "@/components/charts/tooltips/pie-tooltip";
import { PIE_COLORS } from "@/lib/constants";
import { formatPercentage } from "@/lib/utils";

type PieVariantProps = {
  data: {
    name: string;
    value: number;
  }[];
};

export const PieVariant = ({ data }: PieVariantProps) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Tooltip
            content={({ active, payload }) => (
              <PieTooltip
                active={active}
                payload={payload}
                label="Expenses"
                negate
              />
            )}
          />

          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={60}
            paddingAngle={2}
            fill="#8884d8"
            dataKey="value"
            labelLine={false}
          >
            {data.map((_entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={PIE_COLORS[index % PIE_COLORS.length]}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <li
              key={`legend-${index}`}
              className="flex items-center space-x-2 whitespace-nowrap"
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{
                  backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                }}
                aria-hidden
              />
              <div className="space-x-1">
                <span className="text-muted-foreground text-sm">
                  {item.name}
                </span>
                <span className="text-sm">{formatPercentage(percentage)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
