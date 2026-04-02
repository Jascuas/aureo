import type {
  NameType,
  Payload,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

import { TooltipBase } from "@/components/tooltips/tooltip-base";
import { formatCurrency } from "@/lib/utils";

type CategoryTooltipProps = {
  active: boolean | undefined;
  payload: readonly Payload<ValueType, NameType>[] | undefined;
};

export const CategoryTooltip = ({ active, payload }: CategoryTooltipProps) => {
  if (!active || !payload) return null;

  const name = payload[0].payload.name;
  const value = payload[0].value as number;

  return (
    <TooltipBase title={name}>
      <TooltipBase.Item
        label="Expenses"
        value={formatCurrency(value * -1)}
        color="bg-rose-500"
      />
    </TooltipBase>
  );
};
