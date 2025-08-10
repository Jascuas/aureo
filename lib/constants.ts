import { AreaSeries, DataType } from "@/lib/types";

export const SERIES_MAP: Record<DataType, AreaSeries[]> = {
  tx: [
    { key: "income", color: "#3d82f6" },
    { key: "expenses", color: "#f43f5e" },
  ],
  balance: [{ key: "balance", color: "#3b82f6" }],
};
