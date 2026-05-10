import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { CountUp } from "@/components/count-up";
import { ChangeTooltip } from "@/components/tooltips/change-tooltip";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, formatCurrency, formatPercentage } from "@/lib/utils";

type SparklinePoint = { value: number };

type DataCardProps = {
  title: string;
  value?: number;

  percentageChange?: number;
  valueChange?: number;

  sparkline?: SparklinePoint[];
  sparklineColor?: string;
};

export const DataCard = ({
  title,
  value = 0,
  valueChange = 0,
  percentageChange = 0,
  sparkline,
  sparklineColor,
}: DataCardProps) => {
  const changeColorClass =
    percentageChange > 0
      ? "text-emerald-500  bg-emerald-500/10"
      : percentageChange < 0
        ? "text-rose-500 bg-rose-500/10"
        : "text-muted-foreground bg-muted-foreground/10";

  const sparkColor =
    sparklineColor ??
    (percentageChange >= 0
      ? "#10b981" /* emerald-500 */
      : "#f43f5e") /* rose-500 */;

  const gradientId = `spark-${title.replace(/\s+/g, "-").toLowerCase()}`;

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

        {sparkline && sparkline.length > 1 && (
          <div className="mt-3 h-10 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={sparkline}
                margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={sparkColor}
                      stopOpacity={0.4}
                    />
                    <stop
                      offset="100%"
                      stopColor={sparkColor}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={sparkColor}
                  strokeWidth={1.75}
                  fill={`url(#${gradientId})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
