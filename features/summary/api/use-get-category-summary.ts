import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { client } from "@/lib/hono";

/** Fetches category breakdown for Income or Expense */
export function useGetCategorySummary(
  type: "Income" | "Expense" | "Refund" = "Expense",
) {
  const params = useSearchParams();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const accountId = params.get("accountId") ?? "";
  const top = params.get("top") ?? "3";

  return useQuery({
    queryKey: ["by-category", { type, from, to, accountId, top }],
    queryFn: async () => {
      const res = await client.api.summary["by-category"].$get({
        query: { type, from, to, accountId, top },
      });

      if (!res.ok) throw new Error("Failed");

      return (await res.json()).data;
    },
  });
}
