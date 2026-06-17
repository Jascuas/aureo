import type {
  NameType,
  Payload,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

import { TooltipBase } from "@/components/tooltips/tooltip-base";
import { formatCurrency } from "@/lib/utils";

type PieTooltipProps = {
  active: boolean | undefined;
  payload: readonly Payload<ValueType, NameType>[] | undefined;
  label?: string;
  negate?: boolean;
};

export const PieTooltip = ({
  active,
  payload,
  label = "Expenses",
  negate = false,
}: PieTooltipProps) => {
  if (!active || !payload) return null;

  const name = payload[0].payload.name;
  const value = payload[0].value as number;

  return (
    <TooltipBase title={name}>
      <TooltipBase.Item
        label={label}
        value={formatCurrency(negate ? value * -1 : value)}
        color="bg-rose-500"
      />
    </TooltipBase>
  );
};
