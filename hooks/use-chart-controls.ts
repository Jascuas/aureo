// hooks/useChartControls.ts
import { useState } from "react";

import { Option } from "@/components/inputs/generic-select";
import { SERIES_MAP } from "@/lib/constants";
import { AreaSeries, ChartType, DataType, GroupType } from "@/lib/types";

export function useChartControls(
  initialGroup: GroupType = "day",
  initialDataType: DataType = "tx",
  initialChartType: ChartType = "area",
) {
  const [groupBy, setGroupBy] = useState<GroupType>(initialGroup);
  const [dataType, setDataType] = useState<DataType>(initialDataType);
  const [chartType, setChartType] = useState<ChartType>(initialChartType);
  const series: AreaSeries[] = SERIES_MAP[dataType];

  const groupOptions: Option<GroupType>[] = [
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
  ];

  const dataTypeOptions: Option<DataType>[] = [
    { value: "tx", label: "Transactions" },
    { value: "balance", label: "Balance" },
  ];

  const chartTypeOptions: Option<ChartType>[] = [
    { value: "area", label: "Area" },
    { value: "bar", label: "Bar" },
  ];

  return {
    groupBy,
    dataType,
    chartType,
    series,
    groupOptions,
    dataTypeOptions,
    chartTypeOptions,
    onGroupChange: setGroupBy,
    onDataTypeChange: setDataType,
    onChartTypeChange: setChartType,
  };
}
