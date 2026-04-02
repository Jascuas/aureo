import { TooltipContent } from "@/components/ui/tooltip";
import { cn, formatCurrency } from "@/lib/utils";

import { CountUp } from "../count-up";

type ChangeTooltipProps = {
  valueChange: number;
  colorClass: string;
};

export const ChangeTooltip = ({
  valueChange,
  colorClass,
}: ChangeTooltipProps) => (
  <TooltipContent>
    <div className="flex gap-1">
      <span
        className={cn(
          "line-clamp-1 flex items-center gap-2 text-xs",
          colorClass,
        )}
      >
        <CountUp
          preserveValue
          start={valueChange}
          end={valueChange}
          decimals={2}
          decimalPlaces={2}
          formattingFn={formatCurrency}
        />
      </span>
      <span className="text-muted-foreground flex items-center gap-2 text-[0.6rem] leading-none">
        vs last period
      </span>
    </div>
  </TooltipContent>
);
