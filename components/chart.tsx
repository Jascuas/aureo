import { FileSearch, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useChartControls } from "@/hooks/use-chart-controls";
import { OverTimeData } from "@/lib/types";
import { groupByPeriod, overtimeReducers } from "@/lib/utils";

import { AreaVariant } from "./area-variant";
import { GenericSelect } from "./ui/generic-select";

interface ChartProps {
  data?: OverTimeData;
}

export const Chart = ({ data = [] }: ChartProps) => {
  const {
    groupBy,
    dataType,
    series,
    groupOptions,
    dataTypeOptions,
    onGroupChange,
    onDataTypeChange,
  } = useChartControls();

  const groupedData = groupByPeriod(data ?? [], groupBy, overtimeReducers);

  return (
    <Card className="border-none drop-shadow-sm">
      <CardHeader className="flex justify-between space-y-2 p-4 pb-4 lg:flex-row lg:items-center lg:space-y-0 lg:p-6">
        <CardTitle className="line-clamp-1 text-lg lg:text-2xl">
          Transactions
        </CardTitle>
        <div className="flex items-center gap-x-2">
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
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 lg:p-6">
        {data.length === 0 ? (
          <div className="flex h-[350px] w-full flex-col items-center justify-center gap-y-4">
            <FileSearch className="text-muted-foreground size-6" />
            <p className="text-muted-foreground text-sm">
              No data for this period.
            </p>
          </div>
        ) : (
          <AreaVariant data={groupedData} series={series} />
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
