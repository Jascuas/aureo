import { parseISO } from "date-fns";
import { FileSearch } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { GenericSelect } from "@/components/inputs/generic-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useChartControls } from "@/hooks/use-chart-controls";
import { OverTimeData } from "@/lib/types";
import { groupByPeriod, overtimeReducers } from "@/lib/utils";

import { AreaVariant } from "./variants/area-variant";
import { BarVariant } from "./variants/bar-variant";

type ChartProps = {
  data?: OverTimeData;
};

export const TimeSeriesChart = ({ data = [] }: ChartProps) => {
  const searchParams = useSearchParams();
  const {
    groupBy,
    dataType,
    chartType,
    series,
    groupOptions,
    dataTypeOptions,
    chartTypeOptions,
    onGroupChange,
    onDataTypeChange,
    onChartTypeChange,
  } = useChartControls();

  // Filter data based on chart type:
  // - For transactions (tx): only show data up to the requested 'to' date
  // - For balance: show all data (includes extension to today)
  const filteredData = (() => {
    if (dataType === "balance") return data;

    const toParam = searchParams.get("to");
    if (!toParam) return data;

    const toDate = parseISO(toParam);
    return data.filter((item) => parseISO(item.date) <= toDate);
  })();

  const groupedData = groupByPeriod(
    filteredData ?? [],
    groupBy,
    overtimeReducers,
  );

  // Bar variant doesn't make sense for the single-series balance view,
  // fall back to area in that case.
  const effectiveChartType = dataType === "balance" ? "area" : chartType;

  return (
    <Card className="border-none drop-shadow-sm">
      <CardHeader className="flex justify-between space-y-2 p-4 pb-4 lg:flex-row lg:items-center lg:space-y-0 lg:p-6">
        <CardTitle className="line-clamp-1 text-base">Transactions</CardTitle>
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

          {dataType === "tx" && (
            <GenericSelect
              value={chartType}
              options={chartTypeOptions}
              placeholder="Chart type"
              onChange={onChartTypeChange}
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 lg:p-6">
        {filteredData.length === 0 ? (
          <div className="flex h-[350px] w-full flex-col items-center justify-center gap-y-4">
            <FileSearch className="text-muted-foreground size-6" />
            <p className="text-muted-foreground text-sm">
              No data for this period.
            </p>
          </div>
        ) : effectiveChartType === "bar" ? (
          <BarVariant data={groupedData} series={series} />
        ) : (
          <AreaVariant data={groupedData} series={series} />
        )}
      </CardContent>
    </Card>
  );
};
