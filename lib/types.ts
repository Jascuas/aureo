export type GroupType = "day" | "week" | "month";
export type ChartType = "area" | "bar";
export type DataType = "tx" | "balance";
export type CategoryChartType = "pie" | "radar" | "radial";

export type Transaction = { date: string; income: number; expenses: number };

export type Balance = { date: string; balance: number };

export type TransactionOrBalance = Transaction[] | Balance[];

export type AreaSeries = {
  key: string;
  color: string;
};
