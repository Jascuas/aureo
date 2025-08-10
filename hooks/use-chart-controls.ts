// hooks/useChartControls.ts
import { useState } from "react";

import { Option } from "@/components/ui/generic-select";
import { SERIES_MAP } from "@/lib/constants";
import { AreaSeries, ChartType, DataType, GroupType } from "@/lib/types";

export function useChartControls(
  initialChart: ChartType = "area",
  initialGroup: GroupType = "day",
  initialDataType: DataType = "tx",
) {
  const [chartType, setChartType] = useState<ChartType>(initialChart);
  const [groupBy, setGroupBy] = useState<GroupType>(initialGroup);
  const [dataType, setDataType] = useState<DataType>(initialDataType);
  const series: AreaSeries[] = SERIES_MAP[dataType];

  const groupOptions: Option<GroupType>[] = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
  ];

  const chartOptions: Option<ChartType>[] = [
    { value: "area", label: "Area chart" },
    { value: "bar", label: "Bar chart" },
  ];

  const dataTypeOptions: Option<DataType>[] = [
    { value: "tx", label: "Transactions" },
    { value: "balance", label: "Balance" },
  ];

  return {
    chartType,
    groupBy,
    dataType,
    series,
    groupOptions,
    chartOptions,
    dataTypeOptions,
    onChartTypeChange: setChartType,
    onGroupChange: setGroupBy,
    onDataTypeChange: setDataType,
  };
}
