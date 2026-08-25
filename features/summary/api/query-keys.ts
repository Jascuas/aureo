type DateRange = {
  from: string;
  to: string;
  accountId: string;
};

type TypeSummaryParams = DateRange & {
  type: string;
  top: string;
};

export const summaryQueryKeys = {
  overTime: ({ from, accountId }: Omit<DateRange, "to">) =>
    ["over-time", { from, accountId }] as const,
  overview: ({ from, to, accountId }: DateRange) =>
    ["overview", { from, to, accountId }] as const,
  byPayee: ({ type, from, to, accountId, top }: TypeSummaryParams) =>
    ["by-payee", { type, from, to, accountId, top }] as const,
  byCategory: ({ type, from, to, accountId, top }: TypeSummaryParams) =>
    ["by-category", { type, from, to, accountId, top }] as const,
  byAccount: () => ["by-account"] as const,
};
