import type { AccountSummaryRow } from "@/features/summary/api/use-get-account-summary";

export type AccountSummaryMetrics = {
  rows: readonly AccountSummaryRow[];
  maxAbs: number;
  totalAbs: number;
  total: number;
};

export function getAccountSummaryMetrics(
  rows: readonly AccountSummaryRow[],
): AccountSummaryMetrics {
  const maxAbs = rows.reduce(
    (maximum, row) => Math.max(maximum, Math.abs(row.value)),
    0,
  );
  const totalAbs = rows.reduce((sum, row) => sum + Math.abs(row.value), 0);
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return { rows, maxAbs, totalAbs, total };
}
