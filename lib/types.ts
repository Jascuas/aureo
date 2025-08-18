export type GroupType = "day" | "week" | "month";
export type ChartType = "area" | "bar";
export type DataType = "tx" | "balance";
export type CategoryChartType = "pie" | "radar" | "radial";

export type Transaction = { date: string; income: number; expenses: number };

export type Balance = { date: string; balance: number };

export type OverTimeData = {
  date: string;
  income: number;
  expenses: number;
  balance: number;
}[];

export type AreaSeries = {
  key: string;
  color: string;
};

export type Day = { date: Date; income: number; expenses: number };
