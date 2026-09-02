type DateRange = {
  from: string;
  to: string;
  accountId: string;
};

type TypeSummaryParams = DateRange & {
  type: string;
  top: string;
};

const summaryKey = ["summary"] as const;

export const summaryQueryKeys = {
  all: summaryKey,
  byAccount: () => [...summaryKey, "by-account"] as const,
  byCategoryRoot: () => [...summaryKey, "by-category"] as const,
  overTime: ({ from, accountId }: Omit<DateRange, "to">) =>
    [...summaryKey, "over-time", { from, accountId }] as const,
  overview: ({ from, to, accountId }: DateRange) =>
    [...summaryKey, "overview", { from, to, accountId }] as const,
  byPayee: ({ type, from, to, accountId, top }: TypeSummaryParams) =>
    [...summaryKey, "by-payee", { type, from, to, accountId, top }] as const,
  byCategory: ({ type, from, to, accountId, top }: TypeSummaryParams) =>
    [...summaryKey, "by-category", { type, from, to, accountId, top }] as const,
};
