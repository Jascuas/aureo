import { cva, type VariantProps } from "class-variance-authority";
import { type IconType } from "react-icons";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency, formatPercentage } from "@/lib/utils";

import { CountUp } from "./count-up";

const boxVariant = cva("shrink-0 rounded-md p-3", {
  variants: {
    variant: {
      default: "bg-blue-500/20",
      success: "bg-emerald-500/20",
      danger: "bg-rose-500/20",
      warning: "bg-yellow-500/20",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const iconVariant = cva("size-4", {
  variants: {
    variant: {
      default: "fill-blue-500",
      success: "fill-emerald-500",
      danger: "fill-rose-500",
      warning: "fill-yellow-500",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type BoxVariants = VariantProps<typeof boxVariant>;
type IconVariants = VariantProps<typeof iconVariant>;

type DataCardProps = BoxVariants &
  IconVariants & {
    icon: IconType;
    title: string;
    value?: number;
    dateRange?: string;
    percentageChange?: number;
    valueChange?: number;
  };

export const DataCard = ({
  title,
  value = 0,
  valueChange = 0,
  percentageChange = 0,
  icon: Icon,
  variant,
  dateRange,
}: DataCardProps) => {
  const changeColorClass =
    percentageChange > 0
      ? "text-emerald-500"
      : percentageChange < 0
        ? "text-rose-500"
        : "text-muted-foreground";

  return (
    <Card className="border-none drop-shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-0 lg:p-6">
        <CardTitle className="mb-0 line-clamp-1 text-lg lg:text-2xl">
          {title}
        </CardTitle>

        <div className={cn(boxVariant({ variant }))}>
          <Icon className={cn(iconVariant({ variant }))} />
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 lg:p-6">
        <h1 className="line-clamp-1 flex gap-3 text-base font-bold break-words lg:text-2xl">
          <CountUp
            preserveValue
            start={0}
            end={value}
            decimals={2}
            decimalPlaces={2}
            formattingFn={formatCurrency}
          />
          <span
            className={cn(
              "line-clamp-1 flex items-center gap-2 text-xs lg:text-xs",
              changeColorClass,
            )}
          >
            {formatPercentage(percentageChange, { addPrefix: true })}
          </span>
        </h1>

        <p
          className={cn(
            "line-clamp-1 flex items-center gap-2 text-xs",
            changeColorClass,
          )}
        >
          <CountUp
            preserveValue
            start={0}
            end={valueChange}
            decimals={2}
            decimalPlaces={2}
            formattingFn={formatCurrency}
          />
          {dateRange && (
            <span className="text-muted-foreground flex items-center gap-2 text-xs leading-none">
              {dateRange}
            </span>
          )}
        </p>
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
