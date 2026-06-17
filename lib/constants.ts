import { AreaSeries, DataType } from "@/lib/types";

export const PIE_COLORS = Array.from(
  { length: 15 },
  (_, i) => `var(--crt-pie-${i + 1})`,
);

export const SERIES_MAP: Record<DataType, AreaSeries[]> = {
  tx: [
    { key: "income", color: "var(--color-success)" },
    { key: "expenses", color: "var(--crt-accent)" },
  ],
  balance: [{ key: "balance", color: "#3b82f6" }],
};
