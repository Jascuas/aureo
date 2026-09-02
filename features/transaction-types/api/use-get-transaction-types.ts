import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";

import { transactionTypeQueryKeys } from "./query-keys";

export const useGetTransactionTypes = () => {
  const query = useQuery({
    queryKey: transactionTypeQueryKeys.all,
    staleTime: Infinity,
    queryFn: async () => {
      const response = await client.api["transaction-types"].$get();

      if (!response.ok) throw new Error("Failed to fetch transaction types.");

      const { data } = await response.json();

      return data;
    },
  });

  return query;
};
