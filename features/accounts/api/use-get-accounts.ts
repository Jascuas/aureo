import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";

import { accountQueryKeys } from "./query-keys";

export const useGetAccounts = () => {
  const query = useQuery({
    queryKey: accountQueryKeys.all,
    queryFn: async () => {
      const response = await client.api.accounts.$get();

      if (!response.ok) throw new Error("Failed to fetch accounts.");

      const { data } = await response.json();

      return data;
    },
  });

  return query;
};
