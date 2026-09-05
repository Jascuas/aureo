import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { client } from "@/lib/hono";

import { summaryQueryKeys } from "./query-keys";

export const useGetOverTime = () => {
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const accountId = searchParams.get("accountId") ?? undefined;

  const query = useQuery({
    queryKey: summaryQueryKeys.overTime({ from, to, accountId }),
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
