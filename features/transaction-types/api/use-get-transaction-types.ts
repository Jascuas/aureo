import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";

export const useGetTransactionTypes = () => {
  const query = useQuery({
    queryKey: ["transaction-types"],
    queryFn: async () => {
      const response = await client.api["transaction-types"].$get();

      if (!response.ok) throw new Error("Failed to fetch transaction types.");

      const { data } = await response.json();

      return data;
    },
  });

  return query;
};
