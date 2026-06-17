import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";

import { client } from "@/lib/hono";

export type CategorySummaryType = "Income" | "Expense" | "Refund" | "All";

type Options = {
  type?: CategorySummaryType;
  top?: number;
};

/** Fetches category breakdown for Income, Expense or Refund. */
export function useGetCategorySummary({
  type = "Expense",
  top = 5,
}: Options = {}) {
  const params = useSearchParams();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const accountId = params.get("accountId") ?? "";
  const topStr = String(top);

  return useQuery({
    queryKey: ["by-category", { type, from, to, accountId, top: topStr }],
    queryFn: async () => {
      const res = await client.api.summary["by-category"].$get({
        query: { type, from, to, accountId, top: topStr },
      });

      if (!res.ok) throw new Error("Failed");

      return (await res.json()).data;
    },
  });
}
