import type { DashboardDataState } from "@/components/dashboard/dashboard-data-state";
import {
  DashboardEmptyState,
  DashboardErrorState,
} from "@/components/dashboard/dashboard-state-message";
import { GenericSelect } from "@/components/inputs/generic-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useChartControls } from "@/hooks/use-chart-controls";
import { OverTimeData } from "@/lib/types";
import { groupByPeriod, overtimeReducers } from "@/lib/utils";

import { AreaVariant } from "./variants/area-variant";

type ChartProps = {
  onRetry: () => void;
  state: DashboardDataState<OverTimeData>;
};

export const TimeSeriesChart = ({ onRetry, state }: ChartProps) => {
  const {
    groupBy,
    dataType,
    series,
    groupOptions,
    dataTypeOptions,
    onGroupChange,
    onDataTypeChange,
  } = useChartControls();

  const data = state.kind === "populated" ? state.data : [];
  const groupedData = groupByPeriod(
    data,
    groupBy,
    overtimeReducers,
  );

  return (
    <Card className="border-border h-full border drop-shadow-sm">
      <CardHeader className="flex justify-between space-y-2 p-4 pb-0 lg:flex-row lg:items-center lg:space-y-0 lg:p-6 lg:pb-0">
        <CardTitle className="line-clamp-1 text-xs">
          <span className="text-crt-accent">▌</span> Transacciones
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <GenericSelect
            value={groupBy}
            options={groupOptions}
            placeholder="Agrupar por"
            onChange={onGroupChange}
          />

          <GenericSelect
            value={dataType}
            options={dataTypeOptions}
            placeholder="Datos"
            onChange={onDataTypeChange}
          />
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 lg:p-6">
        {state.kind === "error" ? (
          <DashboardErrorState
            className="h-[350px]"
            title="GRÁFICO NO DISPONIBLE"
            description="No se ha podido cargar el gráfico. Inténtalo de nuevo."
            onRetry={onRetry}
          />
        ) : state.kind === "empty" ? (
          <DashboardEmptyState
            className="h-[350px]"
            message="Sin movimientos en este periodo"
          />
        ) : (
          <AreaVariant data={groupedData} series={series} />
        )}
      </CardContent>
    </Card>
  );
};
