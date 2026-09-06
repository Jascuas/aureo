// hooks/useChartControls.ts
import { useState } from "react";

import { Option } from "@/components/inputs/generic-select";
import { SERIES_MAP } from "@/lib/constants";
import { AreaSeries, DataType, GroupType } from "@/lib/types";

export function useChartControls(
  initialGroup: GroupType = "day",
  initialDataType: DataType = "tx",
) {
  const [groupBy, setGroupBy] = useState<GroupType>(initialGroup);
  const [dataType, setDataType] = useState<DataType>(initialDataType);
  const series: AreaSeries[] = SERIES_MAP[dataType];

  const groupOptions: Option<GroupType>[] = [
    { value: "day", label: "Día" },
    { value: "week", label: "Semana" },
    { value: "month", label: "Mes" },
  ];

  const dataTypeOptions: Option<DataType>[] = [
    { value: "tx", label: "Transacciones" },
    { value: "balance", label: "Saldo" },
  ];

  return {
    groupBy,
    dataType,
    series,
    groupOptions,
    dataTypeOptions,
    onGroupChange: setGroupBy,
    onDataTypeChange: setDataType,
  };
}
