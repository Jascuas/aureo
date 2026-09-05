export type BalanceDiscrepancy = {
  differenceMilliunits: number;
};

export const calculateTotalCorruptionMilliunits = (
  discrepancies: readonly BalanceDiscrepancy[],
): number =>
  discrepancies.reduce(
    (total, { differenceMilliunits }) =>
      total + Math.abs(differenceMilliunits),
    0,
  );
