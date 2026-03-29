import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatCurrency, formatPercentage } from "@/lib/utils";

import { CountUp } from "./count-up";

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
      <CardContent className="p-4 pt-0 lg:p-6">
        <CardTitle className="mb-2 line-clamp-1 text-base">{title}</CardTitle>

        <h1 className="line-clamp-1 flex gap-3 text-base font-bold break-words lg:text-lg">
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
              <TooltipContent>
                <div className="flex gap-1">
                  <span
                    className={cn(
                      "line-clamp-1 flex items-center gap-2 text-xs",
                      changeColorClass,
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
            </Tooltip>
          </TooltipProvider>
        </h1>
      </CardContent>
    </Card>
  );
};

export const DataCardLoading = () => {
  return (
    <Card className="h-auto border-none drop-shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-40" />
        </div>

        <Skeleton className="size-12" />
      </CardHeader>

      <CardContent>
        <Skeleton className="mb-2 h-10 w-24 shrink-0" />
        <Skeleton className="h-4 w-40 shrink-0" />
      </CardContent>
    </Card>
  );
};
