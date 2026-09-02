const transactionsKey = ["transactions"] as const;

type TransactionFilters = {
  accountId: string;
  from: string;
  to: string;
};

export const transactionQueryKeys = {
  all: transactionsKey,
  detail: (id?: string) => [...transactionsKey, "detail", { id }] as const,
  list: ({ from, to, accountId }: TransactionFilters) =>
    [...transactionsKey, "list", { from, to, accountId }] as const,
  recent: ({ from, to, accountId }: TransactionFilters) =>
    [...transactionsKey, "recent", { from, to, accountId }] as const,
};
