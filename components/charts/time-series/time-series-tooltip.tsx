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
