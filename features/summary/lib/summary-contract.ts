export type SummaryBreakdownRow = {
  isUncategorized?: boolean;
  name: string;
  valueMilliunits: number;
};

const compareByDisplayedValue = (
  left: SummaryBreakdownRow,
  right: SummaryBreakdownRow,
) =>
  right.valueMilliunits - left.valueMilliunits ||
  left.name.localeCompare(right.name, "es");

export const calculateSummaryPercentageChange = (
  currentMilliunits: number,
  previousMilliunits: number,
) => {
  if (previousMilliunits === 0) {
    if (currentMilliunits === 0) {
      return 0;
    }

    return currentMilliunits > 0 ? 100 : -100;
  }

  return (
    ((currentMilliunits - previousMilliunits) / Math.abs(previousMilliunits)) *
    100
  );
};

export const buildPayeeSummary = (
  rows: SummaryBreakdownRow[],
  top: number,
) => rows.toSorted(compareByDisplayedValue).slice(0, top);

export const buildCategorySummary = (
  rows: SummaryBreakdownRow[],
  top: number,
) => {
  const uncategorized = rows.filter((row) => row.isUncategorized);
  const categorized = rows
    .filter((row) => !row.isUncategorized)
    .toSorted(compareByDisplayedValue);
  const topCategories = categorized.slice(0, top);
  const remainingCategories = categorized.slice(top);

  const summary = [...topCategories, ...uncategorized];

  if (remainingCategories.length > 0) {
    summary.push({
      name: "Otros",
      valueMilliunits: remainingCategories.reduce(
        (total, row) => total + row.valueMilliunits,
        0,
      ),
    });
  }

  return summary.toSorted(compareByDisplayedValue);
};
