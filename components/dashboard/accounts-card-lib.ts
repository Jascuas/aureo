import type { AccountSummaryRow } from "@/features/summary/api/use-get-account-summary";

const PIE_COLORS = [
  "var(--crt-pie-1)",
  "var(--crt-pie-2)",
  "var(--crt-pie-3)",
  "var(--crt-pie-4)",
  "var(--crt-pie-5)",
  "var(--crt-pie-6)",
  "var(--crt-pie-7)",
  "var(--crt-pie-8)",
  "var(--crt-pie-9)",
  "var(--crt-pie-10)",
  "var(--crt-pie-11)",
  "var(--crt-pie-12)",
  "var(--crt-pie-13)",
  "var(--crt-pie-14)",
  "var(--crt-pie-15)",
] as const;

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

export function getAccountRowColors(
  rows: readonly AccountSummaryRow[],
): readonly string[] {
  let nonZeroOrdinal = 0;

  return rows.map((row) => {
    if (row.value === 0) return "var(--crt-muted)";

    const color = PIE_COLORS[nonZeroOrdinal % PIE_COLORS.length];
    nonZeroOrdinal += 1;

    return color;
  });
}
