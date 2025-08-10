import { FileSearch, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useChartControls } from "@/hooks/use-chart-controls";
import { useGroupedData } from "@/hooks/use-group-by-period";
import { TransactionOrBalance } from "@/lib/types";

import { AreaVariant } from "./area-variant";
import { BarVariant } from "./bar-variant";
import { GenericSelect } from "./ui/generic-select";

interface ChartProps {
  data?: TransactionOrBalance;
}

export const Chart = ({ data = [] }: ChartProps) => {
  const {
    chartType,
    groupBy,
    dataType,
    series,
    groupOptions,
    chartOptions,
    dataTypeOptions,
    onChartTypeChange,
    onGroupChange,
    onDataTypeChange,
  } = useChartControls();

  const groupedData = useGroupedData(data ?? [], groupBy);

  return (
    <Card className="border-none drop-shadow-sm">
      <CardHeader className="flex justify-between space-y-2 lg:flex-row lg:items-center lg:space-y-0">
        <CardTitle className="line-clamp-1 text-xl">Transactions</CardTitle>
        <GenericSelect
          value={chartType}
          options={chartOptions}
          placeholder="Chart type"
          onChange={onChartTypeChange}
        />

        <GenericSelect
          value={groupBy}
          options={groupOptions}
          placeholder="Group by"
          onChange={onGroupChange}
        />

        <GenericSelect
          value={dataType}
          options={dataTypeOptions}
          placeholder="Chart type"
          onChange={onDataTypeChange}
        />
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-[350px] w-full flex-col items-center justify-center gap-y-4">
            <FileSearch className="text-muted-foreground size-6" />
            <p className="text-muted-foreground text-sm">
              No data for this period.
            </p>
          </div>
        ) : (
          <>
            {chartType === "area" && (
              <AreaVariant data={groupedData} series={series} />
            )}
            {chartType === "bar" && (
              <BarVariant data={groupedData} series={series} />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export const ChartLoading = () => {
  return (
    <Card className="border-none drop-shadow-sm">
      <CardHeader className="flex justify-between space-y-2 lg:flex-row lg:items-center lg:space-y-0">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-full lg:w-[120px]" />
      </CardHeader>

      <CardContent>
        <div className="flex h-[350px] w-full items-center justify-center">
          <Loader2 className="size-6 animate-spin text-slate-300" />
        </div>
      </CardContent>
    </Card>
  );
};
