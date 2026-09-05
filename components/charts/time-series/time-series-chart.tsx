import { FileSearch } from "lucide-react";

import { GenericSelect } from "@/components/inputs/generic-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useChartControls } from "@/hooks/use-chart-controls";
import { OverTimeData } from "@/lib/types";
import { groupByPeriod, overtimeReducers } from "@/lib/utils";

import { AreaVariant } from "./variants/area-variant";

type ChartProps = {
  data?: OverTimeData;
};

export const TimeSeriesChart = ({ data = [] }: ChartProps) => {
  const {
    groupBy,
    dataType,
    series,
    groupOptions,
    dataTypeOptions,
    onGroupChange,
    onDataTypeChange,
  } = useChartControls();

  const groupedData = groupByPeriod(
    data,
    groupBy,
    overtimeReducers,
  );

  return (
    <Card className="border-border h-full border drop-shadow-sm">
      <CardHeader className="flex justify-between space-y-2 p-4 pb-0 lg:flex-row lg:items-center lg:space-y-0 lg:p-6 lg:pb-0">
        <CardTitle className="line-clamp-1 text-xs">
          <span className="text-crt-accent">▌</span> Transactions
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <GenericSelect
            value={groupBy}
            options={groupOptions}
            placeholder="Group by"
            onChange={onGroupChange}
          />

          <GenericSelect
            value={dataType}
            options={dataTypeOptions}
            placeholder="Data"
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
