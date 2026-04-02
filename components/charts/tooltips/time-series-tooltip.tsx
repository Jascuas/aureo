import { format } from "date-fns";
import type {
  NameType,
  Payload,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

import { Separator } from "@/components/ui/separator";
import { TooltipBase } from "@/components/tooltips/tooltip-base";
import { formatCurrency } from "@/lib/utils";

type TimeSeriesToolTipProps = {
  active: boolean | undefined;
  payload: readonly Payload<ValueType, NameType>[] | undefined;
};

export const TimeSeriesToolTip = ({
  active,
  payload,
}: TimeSeriesToolTipProps) => {
  if (!active || !payload) return null;

  const date = payload[0].payload.date;
  const income = payload[0].value as number;
  const expenses = payload[1].value as number;

  return (
    <TooltipBase title={date}>
      <TooltipBase.Item
        label="Income"
        value={formatCurrency(income)}
        color="bg-blue-500"
      />
      <TooltipBase.Item
        label="Expenses"
        value={formatCurrency(expenses * -1)}
        color="bg-rose-500"
      />
    </TooltipBase>
  );
};

type SeriesItem = {
  key: string;
  color: string;
};

type CustomTooltipProps = {
  active: boolean | undefined;
  payload: readonly Payload<ValueType, NameType>[] | undefined;
  series: SeriesItem[];
};

export const CustomTooltip = ({
  active,
  payload,
  series,
}: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  const dateString = payload[0].payload.date as string;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;

  return (
    <div className="dark:bg-background overflow-hidden rounded-sm border shadow-sm">
      <div className="bg-muted text-muted-foreground p-2 px-3 text-sm">
        {format(date, "MMM dd, yyyy")}
      </div>

      <Separator />

      <div className="space-y-1 p-2 px-3">
        {series.map((s, index) => {
          const value = payload[index]?.value as number;

          return (
            <div
              key={s.key}
              className="flex items-center justify-between gap-x-4"
            >
              <div className="flex items-center gap-x-2">
                <div
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <p className="text-muted-foreground text-sm">
                  {s.key.charAt(0).toUpperCase() + s.key.slice(1)}
                </p>
              </div>

              <p className="text-right text-sm font-medium">
                {formatCurrency(value)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
