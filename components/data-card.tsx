import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatCurrency, formatPercentage } from "@/lib/utils";

import { CountUp } from "./count-up";
import { ChangeTooltip } from "./tooltips/change-tooltip";

type DataCardProps = {
  title: string;
  value?: number;

  percentageChange?: number;
  valueChange?: number;
};

export const DataCard = ({
  title,
  value = 0,
  valueChange = 0,
  percentageChange = 0,
}: DataCardProps) => {
  const changeColorClass =
    percentageChange > 0
      ? "text-emerald-500  bg-emerald-500/10"
      : percentageChange < 0
        ? "text-rose-500 bg-rose-500/10"
        : "text-muted-foreground bg-muted-foreground/10";

  return (
    <Card className="border-none drop-shadow-sm">
      <CardContent className="p-4">
        <CardTitle className="mb-2 line-clamp-1 text-base">{title}</CardTitle>

        <h1 className="line-clamp-1 flex gap-3 text-base font-bold wrap-break-word lg:text-lg">
          <CountUp
            preserveValue
            start={0}
            end={value}
            decimals={2}
            decimalPlaces={2}
            formattingFn={formatCurrency}
          />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "line-clamp-1 flex items-center gap-2 rounded-2xl p-1 px-2 text-xs",
                    changeColorClass,
                  )}
                >
                  {formatPercentage(percentageChange, { addPrefix: true })}
                </span>
              </TooltipTrigger>
              <ChangeTooltip
                valueChange={valueChange}
                colorClass={changeColorClass}
              />
            </Tooltip>
          </TooltipProvider>
        </h1>
      </CardContent>
    </Card>
  );
};
