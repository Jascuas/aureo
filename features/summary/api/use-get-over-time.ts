import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { client } from "@/lib/hono";

export const useGetOverTime = () => {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const accountId = searchParams.get("accountId") || "";

  const query = useQuery({
    queryKey: ["over-time", { from, to, accountId }],
    queryFn: async () => {
      const res = await client.api.summary["over-time"].$get({
        query: {
          from,
          to,
          accountId,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch summary.");

      return (await res.json()).data;
    },
  });

  return query;
};
