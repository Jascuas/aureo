import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { formatPercentage } from "@/lib/utils";

import { CategoryTooltip } from "../category-tooltip";

const COLORS = ["#0062FF", "#12C6FF", "#FF647F", "#FF9354"];

type PieVariantProps = {
  data: {
    name: string;
    value: number;
  }[];
};

export const PieVariant = ({ data }: PieVariantProps) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Legend
          layout="horizontal"
          verticalAlign="bottom"
          align="right"
          iconType="circle"
          content={({ payload }) => {
            return (
              <ul className="mt-4 flex flex-col space-y-2">
                {payload?.map((entry, index) => {
                  const dataItem = data.find(
                    (item) => item.name === entry.value,
                  );
                  const percentage =
                    dataItem && total > 0 ? (dataItem.value / total) * 100 : 0;

                  return (
                    <li
                      key={`item-${index}`}
                      className="flex items-center space-x-2"
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{
                          backgroundColor: entry.color,
                        }}
                        aria-hidden
                      />

                      <div className="space-x-1">
                        <span className="text-muted-foreground text-sm">
                          {entry.value}
                        </span>

                        <span className="text-sm">
                          {formatPercentage(percentage)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            );
          }}
        />

        <Tooltip
          content={({ active, payload }) => (
            <CategoryTooltip active={active} payload={payload} />
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
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
};
