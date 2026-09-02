import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";

import { accountQueryKeys } from "./query-keys";

export const useGetAccount = (id?: string) => {
  const query = useQuery({
    enabled: !!id,
    queryKey: accountQueryKeys.detail(id),
    queryFn: async () => {
      const response = await client.api.accounts[":id"].$get({
        param: { id },
      });

      if (!response.ok) throw new Error("Failed to fetch account.");

      const { data } = await response.json();

      return data;
    },
  });

  return query;
};
