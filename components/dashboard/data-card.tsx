import { CountUp } from "@/components/count-up";
import { ChangeTooltip } from "@/components/tooltips/change-tooltip";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatCurrency, formatPercentage } from "@/lib/utils";

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
      ? "text-success border-success"
      : percentageChange < 0
        ? "text-crt-accent border-crt-accent"
        : "text-muted-foreground border-muted-foreground";

  return (
    <Card className="border-border border drop-shadow-sm">
      <CardContent className="p-4 lg:p-6">
        <CardTitle className="mb-2 flex justify-between text-xs">
          <span className="flex items-center gap-1">
            <span className="text-crt-accent">▌</span>
            {title}
          </span>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "text-3xs line-clamp-1 flex items-center border px-2",
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
        </CardTitle>

        <h1 className="line-clamp-1 flex gap-3 text-xl font-bold wrap-break-word lg:text-2xl">
          <CountUp
            preserveValue
            start={0}
            end={value}
            decimals={2}
            decimalPlaces={2}
            formattingFn={formatCurrency}
          />
        </h1>
      </CardContent>
    </Card>
  );
};
