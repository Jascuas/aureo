import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { client } from "@/lib/hono";

export const useGetOverview = () => {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const accountId = searchParams.get("accountId") || "";

  const query = useQuery({
    queryKey: ["overview", { from, to, accountId }],
    queryFn: async () => {
      const res = await client.api.summary.overview.$get({
        query: {
          from,
          to,
          accountId,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch summary.");

      const json = await res.json() as { data: unknown };
      return json.data;
    },
  });

  return query;
};
