import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { client } from "@/lib/hono";
import { convertAmountFromMilliunits } from "@/lib/utils";

export const useGetTransactions = () => {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const accountId = searchParams.get("accountId") || "";

  const query = useInfiniteQuery({
    queryKey: ["transactions", { from, to, accountId }],
    queryFn: async ({ pageParam }) => {
      const response = await client.api.transactions.$get({
        query: {
          from,
          to,
          accountId,
          cursor: pageParam || undefined,
          limit: "50",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch transactions.");

      const { data, nextCursor, hasMore } = await response.json();

      return {
        data: data.map((transaction) => ({
          ...transaction,
          amount: convertAmountFromMilliunits(transaction.amount),
        })),
        nextCursor,
        hasMore,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
  });

  return query;
};
